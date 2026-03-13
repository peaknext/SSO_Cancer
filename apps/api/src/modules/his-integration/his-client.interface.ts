import {
  HisPatientSearchResult,
  HisPatientData,
  HisAdmissionData,
} from './types/his-api.types';

export const HIS_CLIENT_TOKEN = 'HIS_CLIENT';

/**
 * Common interface for HIS data access — implemented by both
 * HisApiClient (HTTP REST) and HisDbClient (direct PostgreSQL).
 */
export interface IHisClient {
  /** Check if this client is properly configured */
  isConfigured(): Promise<boolean>;

  /** Search patients by HN, citizen ID, or name */
  searchPatient(query: string, type?: string): Promise<HisPatientSearchResult[]>;

  /** Fetch patient info + OPD visits */
  fetchPatientWithVisits(
    query: string,
    type: 'hn' | 'citizen_id',
    from?: string,
    to?: string,
  ): Promise<HisPatientData>;

  /** Fetch patient info + IPD admissions */
  fetchPatientWithAdmissions(
    query: string,
    type: 'hn' | 'citizen_id',
    from?: string,
    to?: string,
  ): Promise<HisAdmissionData>;

  /** Advanced search: find patients by clinical criteria (date range, ICD, drugs) */
  advancedSearchPatients(body: {
    from: string;
    to: string;
    icdPrefixes?: string[];
    secondaryDiagnosisCodes?: string[];
    drugKeywords?: string[];
  }): Promise<HisPatientSearchResult[]>;

  /** Test connectivity / configuration */
  healthCheck(): Promise<{ ok: boolean; message: string }>;

  /** Batch lookup pttype for OPD visits by VN (DB client only) */
  batchLookupPttype?(vns: string[]): Promise<Map<string, { pttype: string; pttypeName: string }>>;

  /** Batch lookup pttype for IPD admissions by AN (DB client only) */
  batchLookupPttypeByAn?(ans: string[]): Promise<Map<string, { pttype: string; pttypeName: string }>>;
}
