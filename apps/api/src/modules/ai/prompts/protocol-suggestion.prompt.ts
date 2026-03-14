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
  // Clinical context from HIS (no PII)
  clinicCode?: string | null;
  serviceClass?: string | null;
  visitType?: string | null;
  dischargeType?: string | null;
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

// ─── Ollama-specific simplified prompt for small models (3B) ─────────────
// Per OLLAMA_API.md: system prompt 1-2 sentences, user prompt under 500 words,
// one task per prompt, constrained output. Strategy: use algorithm's top picks
// as candidates instead of full protocol database — dramatically reduces prompt.

const OLLAMA_SYSTEM_PROMPT = `Pick best protocol from candidates. Return ONLY valid JSON. reasoning field MUST be in Thai (ภาษาไทย).`;

export function buildOllamaPrompt(ctx: PromptContext): {
  systemPrompt: string;
  userPrompt: string;
} {
  // Deduplicated medication list (just generic names)
  const meds = [
    ...new Set(
      ctx.medications
        .filter((m) => m.resolvedGenericName || m.medicationName)
        .map((m) => (m.resolvedGenericName || m.medicationName)!.toLowerCase()),
    ),
  ].join(', ');

  let candidates: string;
  if (ctx.algorithmicResults.length > 0) {
    // Enhanced candidates with all decision signals from MatchResult
    candidates = ctx.algorithmicResults
      .slice(0, 5)
      .map((r, i) => {
        const drugs = r.matchedRegimen?.matchedDrugs?.join(',') || '-';
        const rCode = r.matchedRegimen?.regimenCode || '-';
        const rId = r.matchedRegimen?.regimenId || 0;
        const drugPct = r.matchedRegimen?.drugMatchRatio ?? 0;
        const stageTxt = r.stageMatch === true ? 'YES' : r.stageMatch === false ? 'NO' : '?';
        const pref = r.matchedRegimen?.isPreferred ? 'YES' : 'NO';
        const pType = r.protocolType || '?';
        const intent = r.treatmentIntent || '?';
        return `${i + 1}. ID=${r.protocolId} ${r.protocolCode} type=${pType} intent=${intent} stageMatch=${stageTxt} regimen=${rCode}(ID=${rId}) drugs=[${drugs}] drugMatch=${drugPct}% score=${r.score} preferred=${pref}`;
      })
      .join('\n');
  } else {
    // Fallback: compact protocol list (max 10)
    candidates = buildCompactProtocolContext(ctx.protocolContext, 10);
  }

  const userPrompt = `Cancer: ${ctx.cancerSite?.nameEnglish || 'Unknown'}
ICD-10: ${ctx.primaryDiagnosis}
Stage: ${ctx.stageInference.inferredStage || 'Unknown'}
Meds: ${meds || 'None'}

Candidates:
${candidates}

Pick best. reasoning ต้องเป็นภาษาไทย. JSON:`;

  return { systemPrompt: OLLAMA_SYSTEM_PROMPT, userPrompt };
}

/**
 * Compress the full protocol context into a compact list for small models.
 * Input: multi-line protocol descriptions from buildProtocolContext()
 * Output: compact one-liner per protocol (max ~30 protocols)
 */
function buildCompactProtocolContext(fullContext: string, limit = 30): string {
  if (!fullContext) return 'No protocols available';

  // Parse each protocol block: "Protocol ID=X CODE "NAME" (Type: ..., Intent: ..., Stages: [...]):"
  const protocolBlocks = fullContext.split(/\n\n/).filter(Boolean);

  const compact = protocolBlocks.slice(0, limit).map((block) => {
    const headerMatch = block.match(
      /Protocol ID=(\d+)\s+(\S+)\s+"([^"]*)".*?Stages:\s*\[([^\]]*)\]/,
    );
    if (!headerMatch) return block.substring(0, 80);

    const [, id, code, name, stages] = headerMatch;

    // Extract drug names from regimen lines
    const drugNames = new Set<string>();
    const regimenMatches = block.matchAll(/Regimen ID=(\d+)\s+(\S+)/g);
    const regimenIds: string[] = [];
    for (const rm of regimenMatches) {
      regimenIds.push(`${rm[2]}(ID=${rm[1]})`);
    }

    // Extract just generic drug names
    const drugMatches = block.matchAll(/(\w[\w\s-]*?)\s*\(/g);
    for (const dm of drugMatches) {
      const name = dm[1].trim();
      if (name.length > 2 && !name.startsWith('Regimen') && !name.startsWith('Protocol')) {
        drugNames.add(name);
      }
    }

    const drugsStr = [...drugNames].slice(0, 5).join(', ');
    return `ID=${id} ${code} "${name}" Stages:[${stages}] Regimens:[${regimenIds.join(', ')}] Drugs:[${drugsStr}]`;
  });

  return compact.join('\n');
}

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
**Clinic Department:** ${ctx.clinicCode || 'N/A'} (01=Internal Medicine, 10=Radiation Oncology, 99=Other)
**Service Class:** ${ctx.serviceClass || 'N/A'} (EC=Examination, XR=Radiology, OP=Procedure, LB=Lab)
**Visit Type:** ${ctx.visitType || 'N/A'} (1=walk-in, 2=scheduled, 3=referred, 4=emergency)
**Discharge Type:** ${ctx.dischargeType || 'N/A'} (1=home, 2=admitted, 3=transferred, 4=deceased)

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
