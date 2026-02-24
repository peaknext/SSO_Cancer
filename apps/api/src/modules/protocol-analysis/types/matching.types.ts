export interface MatchedRegimen {
  regimenId: number;
  regimenCode: string;
  regimenName: string;
  lineOfTherapy: number | null;
  isPreferred: boolean;
  matchedDrugs: string[];
  totalDrugs: number;
  drugMatchRatio: number;
}

export interface TreatmentModality {
  isRadiation: boolean;
  isChemotherapy: boolean;
  isImmunotherapy: boolean;
}

export interface StageInference {
  inferredStage: 'EARLY' | 'LOCALLY_ADVANCED' | 'METASTATIC' | null;
  hasDistantMets: boolean;
  hasNodeInvolvement: boolean;
  treatmentModality: TreatmentModality;
  reasons: string[];
}

export interface FormularyCompliance {
  compliantCount: number;
  totalChecked: number;
  ratio: number; // 0-100
}

export interface MatchResult {
  protocolId: number;
  protocolCode: string;
  protocolName: string;
  cancerSiteName: string;
  protocolType: string | null;
  treatmentIntent: string | null;
  score: number;
  matchedRegimen: MatchedRegimen;
  reasons: string[];
  stageMatch: boolean | null;
  inferredStage: string | null;
  treatmentModality: TreatmentModality;
  formularyCompliance: FormularyCompliance | null;
}

export interface MatchResponse {
  results: MatchResult[];
  stageInference: StageInference;
  nonProtocolChemoDrugs: string[];
}

export interface ParsedMedication {
  rawLine: string;
  hospitalCode: string | null;
  medicationName: string | null;
  quantity: string | null;
  unit: string | null;
}

export interface ParsedVisitRow {
  hn: string;
  vn: string;
  visitDate: string;
  primaryDiagnosis: string;
  secondaryDiagnoses: string | null;
  hpi: string | null;
  doctorNotes: string | null;
  medicationsRaw: string | null;
  errors: string[];
}

export interface PreviewResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: { row: number; message: string }[];
  preview: ParsedVisitRow[];
  minVisitDate: string | null;
  maxVisitDate: string | null;
}

export interface ImportResult {
  importId: number;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errors: { row: number; message: string }[];
}
