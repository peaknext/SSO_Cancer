import { wrapXml } from './xml-wrapper';
import { formatDateTime, formatDate } from './encoding';
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
    const svid = svidMap.get(visit.vn) || '';

    const begDt = visit.serviceStartTime
      ? formatDateTime(visit.serviceStartTime)
      : formatDateTime(visit.visitDate);

    const endDt = visit.serviceEndTime
      ? formatDateTime(visit.serviceEndTime)
      : '';

    // SvCharge = professional service fee only (NOT total charges — those are in BillItems)
    // Per reference file and spec, this is 0.00 for SSO cancer billing
    // TypeServ: 01=ER, 03=scheduled OP, 04=refer-out — defaults to 03 for cancer visits
    const service: OpServiceRecord = {
      invno: visit.vn,
      svId: svid,
      class_: visit.serviceClass || 'EC',
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
      lcCode: '',
      codeSet: '',
      stdCode: '',
      svCharge: '0.00',
      completion: 'Y',
      svTxCode: '',
      claimCat: 'OP1',
    };

    serviceRecords.push(Object.values(service).join('|'));

    // Primary diagnosis — strip dots from ICD-10 codes (C11.9 → C119)
    const svcClass = visit.serviceClass || 'EC';
    const primaryDx: OpDxRecord = {
      class_: svcClass,
      svId: svid,
      sl: '1',
      codeSet: 'TT',
      code: visit.primaryDiagnosis.replace(/\./g, ''),
      desc: '',
    };
    dxRecords.push(Object.values(primaryDx).join('|'));

    // Secondary diagnoses — strip dots from ICD-10 codes
    if (visit.secondaryDiagnoses) {
      const codes = visit.secondaryDiagnoses
        .split(',')
        .map((c) => c.trim().replace(/\./g, ''))
        .filter(Boolean);

      for (const code of codes) {
        const secDx: OpDxRecord = {
          class_: svcClass,
          svId: svid,
          sl: '4',
          codeSet: 'TT',
          code,
          desc: '',
        };
        dxRecords.push(Object.values(secDx).join('|'));
      }
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
