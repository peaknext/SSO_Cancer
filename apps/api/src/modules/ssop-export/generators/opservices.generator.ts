import { wrapXml } from './xml-wrapper';
import { formatDateTime, formatDate } from './encoding';
import { isIcd9ProcedureCode } from '../../his-integration/types/his-api.types';
import type { SsopVisitData, OpServiceRecord, OpDxRecord } from '../types/ssop.types';

/**
 * Generate OPServices XML content (services + diagnoses)
 *
 * Structure (matches real SSOP sample files):
 * <OPServices>
 * record|record|...
 * </OPServices>
 * <OPDx>
 * record|record|...
 * </OPDx>
 */
/** Build typed OPService + OPDx records for a single visit (reusable for preview) */
export function buildOpServiceRecords(
  visit: SsopVisitData,
  hcode: string,
  svidMap: Map<string, string>,
  careAccount: string = '1',
): { service: OpServiceRecord; dxRecords: OpDxRecord[] } {
  const svid = svidMap.get(visit.vn) || '';

  const begDt = visit.serviceStartTime
    ? formatDateTime(visit.serviceStartTime)
    : formatDateTime(visit.visitDate);

  const endDt = visit.serviceEndTime
    ? formatDateTime(visit.serviceEndTime)
    : '';

  // Cancer add-on claims use Class 'OP' and ICD-9-CM 9925 (chemo injection/infusion)
  const svcClass = 'OP';

  const service: OpServiceRecord = {
    invno: visit.vn,
    svId: svid,
    class_: svcClass,
    hcode,
    hn: visit.patientHn,
    pid: visit.patientCitizenId,
    careAccount,
    typeServ: visit.typeServ || '03',
    typeIn: visit.visitType || '9',
    typeOut: visit.dischargeType || '9',
    dtAppoint: visit.nextAppointmentDate ? formatDate(visit.nextAppointmentDate) : '',
    svPid: visit.physicianLicenseNo || '',
    clinic: visit.clinicCode || '99',
    begDt,
    endDt,
    lcCode: hcode,
    codeSet: 'IN',
    stdCode: '9925',
    svCharge: '0.00',
    completion: 'Y',
    svTxCode: '',
    claimCat: 'OP1',
  };

  const dxRecords: OpDxRecord[] = [];

  // Primary diagnosis — strip dots from ICD-10 codes (C11.9 → C119)
  dxRecords.push({
    class_: svcClass,
    svId: svid,
    sl: '1',
    codeSet: 'TT',
    code: visit.primaryDiagnosis.replace(/\./g, ''),
    desc: '',
  });

  // Secondary diagnoses — strip dots from ICD-10 codes
  if (visit.secondaryDiagnoses) {
    const codes = visit.secondaryDiagnoses
      .split(',')
      .map((c) => c.trim())
      .filter((c) => c && !isIcd9ProcedureCode(c))
      .map((c) => c.replace(/\./g, ''));

    for (const code of codes) {
      dxRecords.push({
        class_: svcClass,
        svId: svid,
        sl: '4',
        codeSet: 'TT',
        code,
        desc: '',
      });
    }
  }

  return { service, dxRecords };
}

export function generateOpServicesXml(
  visits: SsopVisitData[],
  hcode: string,
  hname: string,
  sessNo: string,
  svidMap: Map<string, string>,
  careAccount: string = '1',
): string {
  const serviceRecords: string[] = [];
  const dxRecords: string[] = [];

  for (const visit of visits) {
    const result = buildOpServiceRecords(visit, hcode, svidMap, careAccount);
    serviceRecords.push(Object.values(result.service).join('|'));
    for (const dx of result.dxRecords) {
      dxRecords.push(Object.values(dx).join('|'));
    }
  }

  const dataSections =
    `<OPServices>\r\n` +
    (serviceRecords.length > 0 ? serviceRecords.join('\r\n') + '\r\n' : '') +
    `</OPServices>\r\n` +
    `<OPDx>\r\n` +
    (dxRecords.length > 0 ? dxRecords.join('\r\n') + '\r\n' : '') +
    `</OPDx>\r\n`;

  return wrapXml({
    hcode,
    hname,
    sessNo,
    recCount: serviceRecords.length,
    dataSections,
  });
}
