import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ImportService } from './import.service';
import { SsoProtocolDrugsService } from '../../sso-protocol-drugs/sso-protocol-drugs.service';
import {
  FormularyCompliance,
  MatchResult,
  StageInference,
  TreatmentModality,
} from '../types/matching.types';

// Stage codes that match each inferred stage
const STAGE_MAP: Record<string, string[]> = {
  EARLY: ['EARLY', 'ADJUVANT', 'NEOADJUVANT', 'STAGE_I', 'STAGE_II', 'PERIOPERATIVE'],
  LOCALLY_ADVANCED: [
    'LOCALLY_ADVANCED', 'LOCOREGIONAL', 'CONCURRENT_CRT', 'DEFINITIVE',
    'STAGE_III', 'STAGE_IIIA', 'STAGE_IIIB_C',
  ],
  METASTATIC: [
    'METASTATIC', 'ADVANCED', 'PALLIATIVE', 'STAGE_IV', 'RECURRENT',
    'EXTENSIVE_STAGE', 'M1CSPC', 'M1CRPC',
  ],
};

// ICD-10 C78x descriptions (Thai)
const C78_DESCRIPTIONS: Record<string, string> = {
  C780: 'แพร่กระจายไปปอด',
  C781: 'แพร่กระจายไป mediastinum',
  C782: 'แพร่กระจายไปเยื่อหุ้มปอด',
  C783: 'แพร่กระจายไปอวัยวะทางเดินหายใจอื่น',
  C784: 'แพร่กระจายไปลำไส้เล็ก',
  C785: 'แพร่กระจายไปลำไส้ใหญ่/ทวารหนัก',
  C786: 'แพร่กระจายไป retroperitoneum/peritoneum',
  C787: 'แพร่กระจายไปตับ',
  C788: 'แพร่กระจายไปอวัยวะย่อยอาหารอื่น',
  C78: 'แพร่กระจายไปอวัยวะทางเดินหายใจ/ย่อยอาหาร',
};

// ICD-10 C79x descriptions (Thai)
const C79_DESCRIPTIONS: Record<string, string> = {
  C790: 'แพร่กระจายไปไต',
  C791: 'แพร่กระจายไปกระเพาะปัสสาวะ',
  C792: 'แพร่กระจายไปผิวหนัง',
  C793: 'แพร่กระจายไปสมอง',
  C794: 'แพร่กระจายไประบบประสาทอื่น',
  C795: 'แพร่กระจายไปกระดูก',
  C796: 'แพร่กระจายไปรังไข่',
  C797: 'แพร่กระจายไปต่อมหมวกไต',
  C798: 'แพร่กระจายไปอวัยวะอื่น',
  C799: 'แพร่กระจายไปตำแหน่งไม่ระบุ',
  C79: 'แพร่กระจายไปอวัยวะอื่น',
};

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly importService: ImportService,
    private readonly formularyService: SsoProtocolDrugsService,
  ) {}

  /**
   * Infer disease stage and treatment modality from secondary diagnoses
   */
  inferStage(secondaryDiagnoses: string | null): StageInference {
    const result: StageInference = {
      inferredStage: null,
      hasDistantMets: false,
      hasNodeInvolvement: false,
      treatmentModality: {
        isRadiation: false,
        isChemotherapy: false,
        isImmunotherapy: false,
      },
      reasons: [],
    };

    if (!secondaryDiagnoses) {
      result.inferredStage = 'EARLY';
      result.reasons.push('ไม่มีวินิจฉัยรอง → สันนิษฐานระยะแรก');
      return result;
    }

    const codes = secondaryDiagnoses
      .split(/[|,;]/)
      .map((c) => c.trim().replace(/\./g, '').toUpperCase())
      .filter(Boolean);

    for (const code of codes) {
      // C78x — distant metastasis to respiratory/digestive organs
      if (code.startsWith('C78')) {
        result.hasDistantMets = true;
        const desc = C78_DESCRIPTIONS[code.substring(0, 4)] || C78_DESCRIPTIONS['C78'];
        result.reasons.push(`${code} → ${desc}`);
      }
      // C79x — distant metastasis to other sites
      else if (code.startsWith('C79')) {
        result.hasDistantMets = true;
        const desc = C79_DESCRIPTIONS[code.substring(0, 4)] || C79_DESCRIPTIONS['C79'];
        result.reasons.push(`${code} → ${desc}`);
      }
      // C77x — lymph node involvement
      else if (code.startsWith('C77')) {
        result.hasNodeInvolvement = true;
        result.reasons.push(`${code} → มีการแพร่กระจายไปต่อมน้ำเหลือง`);
      }
      // Z510 — radiation therapy encounter
      else if (code === 'Z510') {
        result.treatmentModality.isRadiation = true;
        result.reasons.push('Z510 → รังสีรักษา');
      }
      // Z5111 or Z511 — chemotherapy encounter
      else if (code === 'Z5111' || code === 'Z511') {
        result.treatmentModality.isChemotherapy = true;
        result.reasons.push(`${code} → เคมีบำบัด`);
      }
      // Z5112 — immunotherapy encounter
      else if (code === 'Z5112') {
        result.treatmentModality.isImmunotherapy = true;
        result.reasons.push('Z5112 → ภูมิคุ้มกันบำบัด');
      }
      // 9224 — radiation procedure code (ICD-9-CM 92.24)
      else if (code === '9224') {
        result.treatmentModality.isRadiation = true;
        result.reasons.push('9224 → หัตถการฉายรังสี (teleradiotherapy)');
      }
    }

    // Determine inferred stage
    if (result.hasDistantMets) {
      result.inferredStage = 'METASTATIC';
    } else if (result.hasNodeInvolvement) {
      result.inferredStage = 'LOCALLY_ADVANCED';
    } else {
      result.inferredStage = 'EARLY';
      if (result.reasons.length === 0) {
        result.reasons.push('ไม่มีรหัสบ่งชี้ระยะโรค → สันนิษฐานระยะแรก');
      }
    }

    return result;
  }

  /**
   * Check if inferred stage matches a protocol's stage codes
   */
  private stageMatches(inferredStage: string, protocolStageCodes: string[]): boolean {
    const compatibleCodes = STAGE_MAP[inferredStage];
    if (!compatibleCodes) return false;
    return protocolStageCodes.some((sc) => compatibleCodes.includes(sc));
  }

  /**
   * Get all drug IDs that belong to ANY regimen for ANY protocol for the given cancer site
   */
  private async getProtocolDrugIds(cancerSiteId: number): Promise<Set<number>> {
    const regimenDrugs = await this.prisma.regimenDrug.findMany({
      where: {
        regimen: {
          protocolRegimens: {
            some: {
              protocol: {
                cancerSiteId,
                isActive: true,
              },
            },
          },
        },
      },
      select: { drugId: true },
    });
    return new Set(regimenDrugs.map((rd) => rd.drugId));
  }

  /**
   * Calculate modality match score
   * When radiation signal (Z510/9224) is present, radiation protocols get max boost
   * and non-radiation protocols are heavily penalized.
   */
  private modalityScore(
    modality: TreatmentModality,
    protocolType: string | null,
    treatmentIntent: string | null,
  ): number {
    const hasSignal = modality.isRadiation || modality.isChemotherapy || modality.isImmunotherapy;

    if (!hasSignal) return 5; // neutral — no modality info available

    // Radiation signal (Z510/9224) — radiation protocols always dominate
    if (modality.isRadiation) {
      if (protocolType === 'radiation') return 50;
      if (treatmentIntent === 'concurrent_crt') return 40;
      return -40; // heavily penalize non-radiation protocols
    }

    // Chemotherapy signal
    if (modality.isChemotherapy && protocolType === 'treatment') return 5;

    // Immunotherapy signal
    if (modality.isImmunotherapy && protocolType === 'treatment') return 5;

    return 3;
  }

  /**
   * Match a visit against all protocols and return ranked results
   */
  async matchVisit(vn: string): Promise<{ results: MatchResult[]; stageInference: StageInference }> {
    const visit = await this.prisma.patientVisit.findUnique({
      where: { vn },
      include: {
        medications: {
          include: { resolvedDrug: { select: { id: true, genericName: true, drugCategory: true } } },
        },
        resolvedSite: { select: { id: true, nameEnglish: true, nameThai: true } },
      },
    });

    const emptyModality: TreatmentModality = { isRadiation: false, isChemotherapy: false, isImmunotherapy: false };
    const emptyInference: StageInference = { inferredStage: null, hasDistantMets: false, hasNodeInvolvement: false, treatmentModality: emptyModality, reasons: [] };

    if (!visit) return { results: [], stageInference: emptyInference };

    // Step 1: Infer stage from secondary diagnoses
    const stageInference = this.inferStage(visit.secondaryDiagnoses);

    // Step 2: Resolve cancer site from ICD-10
    let siteId = visit.resolvedSiteId;
    let siteName = visit.resolvedSite?.nameThai || visit.resolvedSite?.nameEnglish || '';

    if (!siteId) {
      siteId = await this.importService.resolveIcd10(visit.primaryDiagnosis);
      if (siteId) {
        const site = await this.prisma.cancerSite.findUnique({
          where: { id: siteId },
          select: { nameThai: true, nameEnglish: true },
        });
        siteName = site?.nameThai || site?.nameEnglish || '';
        await this.prisma.patientVisit.update({
          where: { id: visit.id },
          data: { resolvedSiteId: siteId },
        });
      }
    }

    if (!siteId) {
      return {
        stageInference,
        results: [{
          protocolId: 0,
          protocolCode: '',
          protocolName: 'ไม่สามารถระบุตำแหน่งมะเร็ง',
          cancerSiteName: '',
          protocolType: null,
          treatmentIntent: null,
          score: 0,
          matchedRegimen: {
            regimenId: 0, regimenCode: '', regimenName: '',
            lineOfTherapy: null, isPreferred: false,
            matchedDrugs: [], totalDrugs: 0, drugMatchRatio: 0,
          },
          reasons: [`ไม่พบตำแหน่งมะเร็งจากรหัส ICD-10: ${visit.primaryDiagnosis}`],
          stageMatch: null,
          inferredStage: stageInference.inferredStage,
          treatmentModality: stageInference.treatmentModality,
          formularyCompliance: null,
        }],
      };
    }

    // Step 3: Collect resolved drug IDs
    const visitDrugIds = new Set<number>();
    const visitDrugNames = new Map<number, string>();
    for (const med of visit.medications) {
      if (med.resolvedDrugId && med.resolvedDrug) {
        visitDrugIds.add(med.resolvedDrugId);
        visitDrugNames.set(med.resolvedDrugId, med.resolvedDrug.genericName);
      }
    }

    // Step 3b: Collect resolved drug generic names for formulary checking
    const visitResolvedDrugNames = new Set<string>();
    for (const med of visit.medications) {
      if (med.resolvedDrug?.genericName) {
        visitResolvedDrugNames.add(med.resolvedDrug.genericName.toLowerCase());
      }
    }

    // Step 3.5: Get previously confirmed protocol IDs for this patient
    const confirmedProtocolIds = new Set<number>();
    if (visit.hn) {
      const confirmedVisits = await this.prisma.patientVisit.findMany({
        where: {
          hn: visit.hn,
          confirmedProtocolId: { not: null },
          vn: { not: vn },
        },
        select: { confirmedProtocolId: true },
        distinct: ['confirmedProtocolId'],
      });
      for (const cv of confirmedVisits) {
        if (cv.confirmedProtocolId) confirmedProtocolIds.add(cv.confirmedProtocolId);
      }
    }

    const hasRadiationSignal = stageInference.treatmentModality.isRadiation;

    // If no resolved drugs AND no radiation signal → no protocol can be matched
    if (visitDrugIds.size === 0 && !hasRadiationSignal) {
      return {
        stageInference,
        results: [],
      };
    }

    // Step 4.5: Detect non-protocol chemotherapy drugs
    const chemoDrugs = visit.medications.filter(
      (m) => m.resolvedDrug?.drugCategory?.toLowerCase() === 'chemotherapy',
    );

    const protocolDrugIds = await this.getProtocolDrugIds(siteId);

    const nonProtocolChemoDrugs: string[] = [];
    for (const med of chemoDrugs) {
      if (med.resolvedDrugId && !protocolDrugIds.has(med.resolvedDrugId)) {
        nonProtocolChemoDrugs.push(med.resolvedDrug?.genericName || `Drug#${med.resolvedDrugId}`);
      }
    }

    // Step 5: Find candidate protocols (include protocolStages for stage matching)
    const protocols = await this.prisma.protocolName.findMany({
      where: { cancerSiteId: siteId, isActive: true },
      include: {
        cancerSite: { select: { nameThai: true, nameEnglish: true } },
        protocolStages: {
          include: { stage: { select: { stageCode: true, nameThai: true } } },
        },
        protocolRegimens: {
          include: {
            regimen: {
              include: {
                regimenDrugs: {
                  include: { drug: { select: { id: true, genericName: true } } },
                },
              },
            },
          },
        },
      },
    });

    // Step 5.5: Load formulary drug names for all candidate protocols
    const formularyNameMap =
      visitResolvedDrugNames.size > 0
        ? await this.formularyService.getFormularyDrugNames(
            protocols.map((p) => p.protocolCode),
          )
        : new Map<string, Set<string>>();

    // Step 6: Score each protocol
    const results: MatchResult[] = [];

    for (const protocol of protocols) {
      const protocolStageCodes = protocol.protocolStages.map((ps) => ps.stage.stageCode);

      // Stage match scoring
      let stageMatchScore = 10;
      let stageMatch: boolean | null = null;
      if (stageInference.inferredStage && protocolStageCodes.length > 0) {
        const matches = this.stageMatches(stageInference.inferredStage, protocolStageCodes);
        stageMatchScore = matches ? 25 : 0;
        stageMatch = matches;
      } else if (protocolStageCodes.length === 0) {
        stageMatchScore = 10;
      }

      // Modality match scoring
      const modScore = this.modalityScore(
        stageInference.treatmentModality,
        protocol.protocolType,
        protocol.treatmentIntent,
      );

      if (protocol.protocolRegimens.length > 0) {
        // Protocol with regimens — score per regimen, pick best
        let bestScore = -1;
        let bestRegimen: MatchResult['matchedRegimen'] | null = null;
        let bestReasons: string[] = [];

        for (const pr of protocol.protocolRegimens) {
          const regimen = pr.regimen;
          const regimenDrugIds = regimen.regimenDrugs.map((rd) => rd.drug.id);
          const totalDrugs = regimenDrugIds.length;
          if (totalDrugs === 0) continue;

          const matchedDrugList: string[] = [];
          for (const rdDrugId of regimenDrugIds) {
            if (visitDrugIds.has(rdDrugId)) {
              matchedDrugList.push(visitDrugNames.get(rdDrugId) || `Drug#${rdDrugId}`);
            }
          }

          const drugMatchRatio = matchedDrugList.length / totalDrugs;
          const drugMatchScore = drugMatchRatio * 40;
          const drugCountBonus = Math.min(matchedDrugList.length * 2, 10);
          const preferenceScore = pr.isPreferred ? 5 : 0;

          // Formulary compliance scoring (up to 20 points)
          let formularyScore = 0;
          let formularyCompliance: FormularyCompliance | null = null;
          if (visitResolvedDrugNames.size > 0) {
            const formularyNames = formularyNameMap.get(protocol.protocolCode);
            if (formularyNames && formularyNames.size > 0) {
              const visitDrugArray = [...visitResolvedDrugNames];
              const compliantCount = visitDrugArray.filter((name) =>
                formularyNames.has(name),
              ).length;
              const ratio = compliantCount / visitDrugArray.length;
              formularyScore = Math.round(ratio * 20);
              formularyCompliance = {
                compliantCount,
                totalChecked: visitDrugArray.length,
                ratio: Math.round(ratio * 100),
              };
            }
          }

          // History confirmation bonus (15 points)
          const historyBonus = confirmedProtocolIds.has(protocol.id) ? 15 : 0;

          const score = 20 + drugMatchScore + drugCountBonus + stageMatchScore + modScore + preferenceScore + formularyScore + historyBonus;

          if (score > bestScore) {
            bestScore = score;
            bestRegimen = {
              regimenId: regimen.id,
              regimenCode: regimen.regimenCode,
              regimenName: regimen.regimenName,
              lineOfTherapy: pr.lineOfTherapy,
              isPreferred: pr.isPreferred,
              matchedDrugs: matchedDrugList,
              totalDrugs,
              drugMatchRatio: Math.round(drugMatchRatio * 100),
            };

            const reasons: string[] = [];
            reasons.push(`ตรงกับตำแหน่งมะเร็ง: ${siteName}`);
            if (matchedDrugList.length > 0) {
              reasons.push(`ยาที่ตรงกัน: ${matchedDrugList.join(', ')} (${matchedDrugList.length}/${totalDrugs} = ${Math.round(drugMatchRatio * 100)}%)`);
            } else {
              reasons.push('ไม่มียาที่ตรงกัน (0%)');
            }
            if (stageMatch === true) {
              const matchedStages = protocol.protocolStages.map((ps) => ps.stage.nameThai).join(', ');
              reasons.push(`ตรงระยะโรค: ${matchedStages}`);
            } else if (stageMatch === false) {
              reasons.push('ไม่ตรงกับระยะโรคที่อนุมาน');
            }
            if (pr.isPreferred) reasons.push('สูตรยาแนะนำ (Preferred)');
            if (historyBonus > 0) reasons.push('โปรโตคอลนี้เคยได้รับการยืนยันจาก visit อื่นของผู้ป่วยคนนี้');
            if (formularyCompliance) {
              if (formularyCompliance.ratio >= 80) {
                reasons.push(
                  `บัญชียา SSO: ${formularyCompliance.compliantCount}/${formularyCompliance.totalChecked} รายการ (${formularyCompliance.ratio}%) — ผ่านเกณฑ์`,
                );
              } else if (formularyCompliance.ratio > 0) {
                reasons.push(
                  `บัญชียา SSO: ${formularyCompliance.compliantCount}/${formularyCompliance.totalChecked} รายการ (${formularyCompliance.ratio}%) — ต่ำกว่าเกณฑ์`,
                );
              } else {
                reasons.push('ยาไม่อยู่ในบัญชี SSO ของโปรโตคอลนี้');
              }
            }
            bestReasons = reasons;
          }
        }

        if (bestRegimen) {
          // Compute formulary compliance for the best regimen
          let bestFormulary: FormularyCompliance | null = null;
          if (visitResolvedDrugNames.size > 0) {
            const formularyNames = formularyNameMap.get(protocol.protocolCode);
            if (formularyNames && formularyNames.size > 0) {
              const visitDrugArray = [...visitResolvedDrugNames];
              const compliantCount = visitDrugArray.filter((name) =>
                formularyNames.has(name),
              ).length;
              bestFormulary = {
                compliantCount,
                totalChecked: visitDrugArray.length,
                ratio: Math.round(
                  (compliantCount / visitDrugArray.length) * 100,
                ),
              };
            }
          }

          results.push({
            protocolId: protocol.id,
            protocolCode: protocol.protocolCode,
            protocolName: protocol.nameEnglish,
            cancerSiteName: siteName,
            protocolType: protocol.protocolType,
            treatmentIntent: protocol.treatmentIntent,
            score: Math.max(0, Math.round(bestScore)),
            matchedRegimen: bestRegimen,
            reasons: bestReasons,
            stageMatch,
            inferredStage: stageInference.inferredStage,
            treatmentModality: stageInference.treatmentModality,
            formularyCompliance: bestFormulary,
          });
        }
      } else {
        // Protocols with no regimens (radiation, follow-up, non-protocol)
        const historyBonus = confirmedProtocolIds.has(protocol.id) ? 15 : 0;
        const score = 20 + stageMatchScore + modScore + historyBonus;
        const reasons: string[] = [`ตรงกับตำแหน่งมะเร็ง: ${siteName}`, 'ไม่มีสูตรยาที่กำหนด'];
        if (stageMatch === true) reasons.push('ตรงระยะโรค');
        if (protocol.protocolType === 'radiation' && stageInference.treatmentModality.isRadiation) {
          reasons.push('ตรงกับการรักษาด้วยรังสี (Z510/9224)');
        }
        if (historyBonus > 0) reasons.push('โปรโตคอลนี้เคยได้รับการยืนยันจาก visit อื่นของผู้ป่วยคนนี้');

        results.push({
          protocolId: protocol.id,
          protocolCode: protocol.protocolCode,
          protocolName: protocol.nameEnglish,
          cancerSiteName: siteName,
          protocolType: protocol.protocolType,
          treatmentIntent: protocol.treatmentIntent,
          score: Math.max(0, Math.round(score)),
          matchedRegimen: {
            regimenId: 0, regimenCode: '', regimenName: protocol.protocolType === 'radiation' ? 'รังสีรักษา' : '',
            lineOfTherapy: null, isPreferred: false, matchedDrugs: [], totalDrugs: 0, drugMatchRatio: 0,
          },
          reasons,
          stageMatch,
          inferredStage: stageInference.inferredStage,
          treatmentModality: stageInference.treatmentModality,
          formularyCompliance: null,
        });
      }
    }

    // Step 7: Add non-protocol result if unmatched chemotherapy drugs found
    if (nonProtocolChemoDrugs.length > 0) {
      results.unshift({
        protocolId: 0,
        protocolCode: 'NON-PROTOCOL',
        protocolName: 'Non-Protocol Treatment',
        cancerSiteName: siteName,
        protocolType: 'non_protocol',
        treatmentIntent: null,
        score: 100, // High score to appear first
        matchedRegimen: {
          regimenId: 0,
          regimenCode: '',
          regimenName: 'นอกโปรโตคอล',
          lineOfTherapy: null,
          isPreferred: false,
          matchedDrugs: nonProtocolChemoDrugs,
          totalDrugs: nonProtocolChemoDrugs.length,
          drugMatchRatio: 0,
        },
        reasons: [
          `ตรงกับตำแหน่งมะเร็ง: ${siteName}`,
          `พบยาเคมีบำบัดนอกโปรโตคอล: ${nonProtocolChemoDrugs.join(', ')}`,
          'ยาเหล่านี้ไม่อยู่ในสูตรการรักษามาตรฐานของตำแหน่งมะเร็งนี้',
        ],
        stageMatch: null,
        inferredStage: stageInference.inferredStage,
        treatmentModality: stageInference.treatmentModality,
        formularyCompliance: null,
      });
    }

    results.sort((a, b) => b.score - a.score);
    return { results: results.slice(0, 10), stageInference };
  }
}
