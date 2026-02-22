import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProviderFactory } from './providers/provider.factory';
import { AiCompletionResponse } from './providers/ai-provider.interface';
import { MatchingService } from '../protocol-analysis/services/matching.service';
import { buildProtocolSuggestionPrompt, PromptContext } from './prompts/protocol-suggestion.prompt';
import { AuditAction } from '../../common/enums/audit-action.enum';

interface AiSettings {
  [key: string]: string;
}

export interface ParsedRecommendation {
  recommendedProtocolCode: string;
  recommendedProtocolId: number;
  recommendedRegimenCode: string | null;
  recommendedRegimenId: number | null;
  confidenceScore: number;
  reasoning: string;
  alternativeProtocols: { protocolCode: string; protocolId: number; reason: string }[];
  clinicalNotes: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private settingsCache: { data: AiSettings; expiresAt: number } | null = null;
  private readonly SETTINGS_CACHE_TTL = 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly providerFactory: AiProviderFactory,
    private readonly matchingService: MatchingService,
  ) {}

  // ─── Load AI settings with 60s cache ────────────────────────
  private async getAiSettings(): Promise<AiSettings> {
    if (this.settingsCache && this.settingsCache.expiresAt > Date.now()) {
      return this.settingsCache.data;
    }
    const settings = await this.prisma.appSetting.findMany({
      where: { settingGroup: 'ai', isActive: true },
    });
    const map: AiSettings = {};
    for (const s of settings) {
      map[s.settingKey] = s.settingValue;
    }
    this.settingsCache = { data: map, expiresAt: Date.now() + this.SETTINGS_CACHE_TTL };
    return map;
  }

  // ─── Main: call AI and save suggestion ──────────────────────
  async getSuggestion(vn: string, userId: number) {
    const settings = await this.getAiSettings();
    if (settings['ai_enabled'] !== 'true') {
      throw new BadRequestException('ระบบ AI Suggestion ยังไม่เปิดใช้งาน — กรุณาตั้งค่าในเมนู ตั้งค่า > AI');
    }

    const providerName = settings['ai_provider'] || 'gemini';
    const apiKey = settings[`ai_${providerName}_api_key`];
    const model = settings[`ai_${providerName}_model`];

    if (!apiKey) {
      throw new BadRequestException(`ยังไม่ได้ตั้ง API Key สำหรับ ${providerName} — กรุณาตั้งค่าในเมนู ตั้งค่า > AI`);
    }

    // Load visit
    const visit = await this.prisma.patientVisit.findUnique({
      where: { vn },
      include: {
        resolvedSite: true,
        medications: {
          include: { resolvedDrug: { select: { id: true, genericName: true } } },
        },
      },
    });
    if (!visit) throw new NotFoundException('VISIT_NOT_FOUND');

    // Run algorithmic matching for context
    const matchResult = await this.matchingService.matchVisit(vn);

    // Build structured RAG context
    const protocolContext = visit.resolvedSiteId
      ? await this.buildProtocolContext(visit.resolvedSiteId)
      : '';

    // Build prompt (NO HN/VN — privacy by design)
    const promptCtx: PromptContext = {
      primaryDiagnosis: visit.primaryDiagnosis,
      secondaryDiagnoses: visit.secondaryDiagnoses,
      hpi: visit.hpi,
      doctorNotes: visit.doctorNotes,
      medications: visit.medications.map((m) => ({
        medicationName: m.medicationName,
        resolvedGenericName: m.resolvedDrug?.genericName || null,
        quantity: m.quantity,
        unit: m.unit,
      })),
      cancerSite: visit.resolvedSite
        ? { nameEnglish: visit.resolvedSite.nameEnglish, nameThai: visit.resolvedSite.nameThai }
        : null,
      stageInference: matchResult.stageInference,
      algorithmicResults: matchResult.results.slice(0, 5),
      protocolContext,
    };

    const { systemPrompt, userPrompt } = buildProtocolSuggestionPrompt(promptCtx);
    const promptHash = createHash('sha256').update(userPrompt).digest('hex');

    // Call AI provider
    const provider = this.providerFactory.getProvider(providerName);
    const config = {
      apiKey,
      model,
      maxTokens: parseInt(settings['ai_max_tokens'] || '2048'),
      temperature: parseFloat(settings['ai_temperature'] || '0.3'),
    };

    let aiResponse: AiCompletionResponse;
    try {
      aiResponse = await provider.complete({ systemPrompt, userPrompt, config });
    } catch (error: any) {
      // Save error record for audit
      await this.prisma.aiSuggestion.create({
        data: {
          visitId: visit.id,
          provider: providerName,
          model: model || 'unknown',
          promptHash,
          requestPayload: userPrompt.substring(0, 10000),
          responseRaw: '',
          recommendation: '{}',
          status: 'ERROR',
          errorMessage: error.message?.substring(0, 1000),
          requestedByUserId: userId,
        },
      });
      // Audit log: AI suggestion error
      await this.prisma.auditLog.create({
        data: {
          action: AuditAction.AI_SUGGESTION,
          entityType: 'AiSuggestion',
          userId,
          metadata: JSON.stringify({
            vn,
            provider: providerName,
            model: model || 'unknown',
            status: 'ERROR',
            error: error.message?.substring(0, 200),
          }),
        },
      }).catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));
      throw new BadRequestException(`AI Provider Error: ${error.message?.substring(0, 200)}`);
    }

    // Parse structured response
    const parsed = this.parseAiResponse(aiResponse.content);

    // Save to DB
    const suggestion = await this.prisma.aiSuggestion.create({
      data: {
        visitId: visit.id,
        provider: providerName,
        model: aiResponse.model,
        promptHash,
        requestPayload: userPrompt.substring(0, 10000),
        responseRaw: aiResponse.content.substring(0, 20000),
        recommendation: JSON.stringify(parsed),
        confidenceScore: parsed.confidenceScore ?? null,
        protocolId: parsed.recommendedProtocolId || null,
        regimenId: parsed.recommendedRegimenId || null,
        tokensUsed: aiResponse.tokensUsed,
        latencyMs: aiResponse.latencyMs,
        status: 'SUCCESS',
        requestedByUserId: userId,
      },
    });

    // Audit log: AI suggestion success
    await this.prisma.auditLog.create({
      data: {
        action: AuditAction.AI_SUGGESTION,
        entityType: 'AiSuggestion',
        entityId: suggestion.id,
        userId,
        metadata: JSON.stringify({
          vn,
          provider: providerName,
          model: aiResponse.model,
          status: 'SUCCESS',
          confidenceScore: parsed.confidenceScore,
          recommendedProtocolId: parsed.recommendedProtocolId || null,
          tokensUsed: aiResponse.tokensUsed,
          latencyMs: aiResponse.latencyMs,
        }),
      },
    }).catch((e) => this.logger.warn(`Audit log failed: ${e.message}`));

    return this.formatResponse(suggestion);
  }

  // ─── Get cached suggestion ──────────────────────────────────
  async getCachedSuggestion(vn: string) {
    const visit = await this.prisma.patientVisit.findUnique({
      where: { vn },
      select: { id: true },
    });
    if (!visit) return null;

    const suggestion = await this.prisma.aiSuggestion.findFirst({
      where: { visitId: visit.id, status: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
    });

    return suggestion ? this.formatResponse(suggestion) : null;
  }

  // ─── Get full suggestion history ────────────────────────────
  async getSuggestionHistory(vn: string) {
    const visit = await this.prisma.patientVisit.findUnique({
      where: { vn },
      select: { id: true },
    });
    if (!visit) throw new NotFoundException('VISIT_NOT_FOUND');

    const suggestions = await this.prisma.aiSuggestion.findMany({
      where: { visitId: visit.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        requestedByUser: { select: { id: true, fullName: true, fullNameThai: true } },
      },
    });

    return suggestions.map((s) => this.formatResponse(s));
  }

  // ─── Validate provider API key ──────────────────────────────
  async validateProviderKey(providerName: string, apiKey: string) {
    const provider = this.providerFactory.getProvider(providerName);
    const valid = await provider.validateApiKey(apiKey);
    return { provider: providerName, valid };
  }

  // ─── Build structured RAG context ───────────────────────────
  private async buildProtocolContext(cancerSiteId: number): Promise<string> {
    const protocols = await this.prisma.protocolName.findMany({
      where: { cancerSiteId, isActive: true },
      include: {
        protocolStages: { include: { stage: true } },
        protocolRegimens: {
          include: {
            regimen: {
              include: {
                regimenDrugs: { include: { drug: true } },
              },
            },
          },
        },
      },
    });

    return protocols
      .map((p) => {
        const stages = p.protocolStages.map((ps) => ps.stage.stageCode).join(', ');
        const regimens = p.protocolRegimens
          .map((pr) => {
            const drugs = pr.regimen.regimenDrugs
              .map(
                (rd) =>
                  `${rd.drug.genericName} (${rd.dosePerCycle || '?'}, ${rd.route || '?'}, day ${rd.daySchedule || '?'})`,
              )
              .join('; ');
            return `  Regimen ID=${pr.regimenId} ${pr.regimen.regimenCode} "${pr.regimen.regimenName}" [Line ${pr.lineOfTherapy || '?'}, Preferred: ${pr.isPreferred}]: ${drugs}`;
          })
          .join('\n');
        return `Protocol ID=${p.id} ${p.protocolCode} "${p.nameEnglish}" (Type: ${p.protocolType}, Intent: ${p.treatmentIntent}, Stages: [${stages}]):\n${regimens}`;
      })
      .join('\n\n');
  }

  // ─── Parse AI response JSON ─────────────────────────────────
  private parseAiResponse(content: string): ParsedRecommendation {
    try {
      // Try to extract JSON from response (handle markdown code blocks)
      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const parsed = JSON.parse(jsonStr);
      return {
        recommendedProtocolCode: parsed.recommendedProtocolCode || '',
        recommendedProtocolId: parsed.recommendedProtocolId || 0,
        recommendedRegimenCode: parsed.recommendedRegimenCode || null,
        recommendedRegimenId: parsed.recommendedRegimenId || null,
        confidenceScore: Math.min(100, Math.max(0, Number(parsed.confidenceScore) || 0)),
        reasoning: parsed.reasoning || 'ไม่มีเหตุผล',
        alternativeProtocols: Array.isArray(parsed.alternativeProtocols)
          ? parsed.alternativeProtocols.slice(0, 5)
          : [],
        clinicalNotes: parsed.clinicalNotes || '',
      };
    } catch (error) {
      this.logger.warn(`Failed to parse AI response: ${content.substring(0, 200)}`);
      return {
        recommendedProtocolCode: '',
        recommendedProtocolId: 0,
        recommendedRegimenCode: null,
        recommendedRegimenId: null,
        confidenceScore: 0,
        reasoning: 'ไม่สามารถแปลผลจาก AI ได้ — กรุณาลองใหม่',
        alternativeProtocols: [],
        clinicalNotes: content.substring(0, 500),
      };
    }
  }

  // ─── Format DB row into response ────────────────────────────
  private formatResponse(suggestion: any) {
    let recommendation: ParsedRecommendation;
    try {
      recommendation = JSON.parse(suggestion.recommendation);
    } catch {
      recommendation = {
        recommendedProtocolCode: '',
        recommendedProtocolId: 0,
        recommendedRegimenCode: null,
        recommendedRegimenId: null,
        confidenceScore: 0,
        reasoning: 'ข้อมูลเสียหาย',
        alternativeProtocols: [],
        clinicalNotes: '',
      };
    }

    return {
      id: suggestion.id,
      provider: suggestion.provider,
      model: suggestion.model,
      recommendation,
      tokensUsed: suggestion.tokensUsed,
      latencyMs: suggestion.latencyMs,
      status: suggestion.status,
      errorMessage: suggestion.errorMessage,
      createdAt: suggestion.createdAt,
      requestedByUser: suggestion.requestedByUser || undefined,
    };
  }
}
