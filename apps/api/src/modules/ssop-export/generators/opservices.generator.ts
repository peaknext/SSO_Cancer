import { wrapXml } from './xml-wrapper';
import { formatDateTime, formatDate } from './encoding';
import type { SsopVisitData, OpServiceRecord, OpDxRecord } from '../types/ssop.types';

/**
 * Generate OPServices XML content (services + diagnoses)
 *
 * Structure:
 * <OPServices>
 *   <TOTAL>{N}</TOTAL>
 *   <DETAIL>record|record|...</DETAIL>
 * </OPServices>
 * <OPDx>
 *   <TOTAL>{N}</TOTAL>
 *   <DETAIL>record|record|...</DETAIL>
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

    // Determine ClaimCat: use "OPR" if any billing item is OPR, otherwise "OP1"
    const hasRadiation = visit.billingItems.some((i) => i.claimCategory === 'OPR');
    const claimCat = hasRadiation ? 'OPR' : 'OP1';

    const begDt = visit.serviceStartTime
      ? formatDateTime(visit.serviceStartTime)
      : formatDateTime(visit.visitDate);

    const endDt = visit.serviceEndTime
      ? formatDateTime(visit.serviceEndTime)
      : '';

    const service: OpServiceRecord = {
      invno: visit.vn,
      svId: svid,
      class_: 'EC',
      hcode,
      hn: visit.patientHn,
      pid: visit.patientCitizenId,
      careAccount,
      typeServ: '03',
      typeIn: '9',
      typeOut: '9',
      dtAppoint: '',
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
      claimCat,
    };

    serviceRecords.push(Object.values(service).join('|'));

    // Primary diagnosis
    const primaryDx: OpDxRecord = {
      class_: 'EC',
      svId: svid,
      sl: '1',
      codeSet: 'TT',
      code: visit.primaryDiagnosis,
      desc: '',
    };
    dxRecords.push(Object.values(primaryDx).join('|'));

    // Secondary diagnoses
    if (visit.secondaryDiagnoses) {
      const codes = visit.secondaryDiagnoses
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      for (let i = 0; i < codes.length; i++) {
        const secDx: OpDxRecord = {
          class_: 'EC',
          svId: svid,
          sl: String(i + 2),
          codeSet: 'TT',
          code: codes[i],
          desc: '',
        };
        dxRecords.push(Object.values(secDx).join('|'));
      }
    }
  }

  const dataSections =
    `<OPServices>\r\n` +
    `  <TOTAL>${serviceRecords.length}</TOTAL>\r\n` +
    `  <DETAIL>${serviceRecords.join('\r\n')}</DETAIL>\r\n` +
    `</OPServices>\r\n` +
    `<OPDx>\r\n` +
    `  <TOTAL>${dxRecords.length}</TOTAL>\r\n` +
    `  <DETAIL>${dxRecords.join('\r\n')}</DETAIL>\r\n` +
    `</OPDx>\r\n`;

  return wrapXml({
    hcode,
    hname,
    sessNo,
    recCount: serviceRecords.length,
    dataSections,
  });
}
