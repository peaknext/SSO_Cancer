import { StageInference, MatchResult } from '../../protocol-analysis/types/matching.types';

export interface PromptContext {
  primaryDiagnosis: string;
  secondaryDiagnoses: string | null;
  hpi: string | null;
  doctorNotes: string | null;
  medications: {
    medicationName: string | null;
    resolvedGenericName: string | null;
    quantity: string | null;
    unit: string | null;
  }[];
  cancerSite: { nameEnglish: string; nameThai: string } | null;
  stageInference: StageInference;
  algorithmicResults: MatchResult[];
  protocolContext: string;
}

const SYSTEM_PROMPT = `You are an expert oncology clinical decision support system for the Thai Social Security Office (SSO) cancer treatment protocols. Your role is to analyze clinical visit data and recommend the most appropriate SSO treatment protocol.

IMPORTANT RULES:
1. You MUST only recommend protocols that exist in the provided protocol database.
2. Your recommendation must be based on: cancer site, disease stage, medications given, treatment modality, and clinical notes.
3. Return your response as a valid JSON object (no markdown, no code fences).
4. Provide clinical reasoning in Thai language.
5. Never mention patient identifiers — this data has been anonymized.
6. The recommendedProtocolId and recommendedRegimenId MUST be valid IDs from the protocol database provided.

JSON Response Schema:
{
  "recommendedProtocolCode": "string — protocol code from the database",
  "recommendedProtocolId": number,
  "recommendedRegimenCode": "string or null",
  "recommendedRegimenId": number | null,
  "confidenceScore": number (0-100),
  "reasoning": "string — clinical reasoning in Thai (2-4 sentences)",
  "alternativeProtocols": [
    {
      "protocolCode": "string",
      "protocolId": number,
      "reason": "string in Thai"
    }
  ],
  "clinicalNotes": "string — any additional clinical observations in Thai"
}`;

export function buildProtocolSuggestionPrompt(ctx: PromptContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  const medicationsList = ctx.medications
    .filter((m) => m.resolvedGenericName || m.medicationName)
    .map(
      (m) =>
        `- ${m.resolvedGenericName || m.medicationName} (qty: ${m.quantity || '?'} ${m.unit || ''})`,
    )
    .join('\n');

  const algorithmicTop = ctx.algorithmicResults
    .slice(0, 5)
    .map(
      (r) =>
        `- ${r.protocolCode} "${r.protocolName}" (Score: ${r.score}, Drug match: ${r.matchedRegimen?.drugMatchRatio || 0}%, Stage match: ${r.stageMatch ?? 'N/A'})`,
    )
    .join('\n');

  const userPrompt = `## Clinical Visit Data

**Cancer Site:** ${ctx.cancerSite ? `${ctx.cancerSite.nameEnglish} (${ctx.cancerSite.nameThai})` : 'Unknown'}
**Primary Diagnosis (ICD-10):** ${ctx.primaryDiagnosis}
**Secondary Diagnoses:** ${ctx.secondaryDiagnoses || 'None'}
**Inferred Stage:** ${ctx.stageInference.inferredStage || 'Unknown'}
**Stage Reasoning:** ${ctx.stageInference.reasons.join('; ') || 'N/A'}
**Treatment Modality:** Chemo=${ctx.stageInference.treatmentModality.isChemotherapy}, Radiation=${ctx.stageInference.treatmentModality.isRadiation}, Immunotherapy=${ctx.stageInference.treatmentModality.isImmunotherapy}

**HPI:** ${ctx.hpi || 'N/A'}
**Doctor Notes:** ${ctx.doctorNotes || 'N/A'}

**Medications Given:**
${medicationsList || 'No medications'}

## Algorithmic Match Results (Top 5)
${algorithmicTop || 'No algorithmic matches found'}

## Available SSO Protocols for This Cancer Site
${ctx.protocolContext || 'No protocol data available'}

---
Based on the above clinical data and available protocols, recommend the most appropriate SSO treatment protocol. Provide your response as JSON.`;

  return { systemPrompt: SYSTEM_PROMPT, userPrompt };
}
