import { wrapXml } from './xml-wrapper';
import { formatDateTime, formatDate, formatAmount } from './encoding';
import type { SsopVisitData, BilltranRecord, BillItemRecord } from '../types/ssop.types';

/**
 * Generate BILLTRAN XML content (transactions + bill items)
 *
 * Structure (matches real SSOP sample files):
 * <BILLTRAN>
 * record|record|...
 * </BILLTRAN>
 * <BillItems>
 * record|record|...
 * </BillItems>
 */
export function generateBilltranXml(
  visits: SsopVisitData[],
  hcode: string,
  hname: string,
  sessNo: string,
  svidMap: Map<string, string>,
  dispIdMap: Map<string, string> = new Map(),
  previouslyExportedVns: Set<string> = new Set(),
): string {
  const tranRecords: string[] = [];
  const itemRecords: string[] = [];

  for (const visit of visits) {
    // Amount = sum(QTY × UP) = total hospital charge
    const chargeAmount = visit.billingItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );
    // ClaimAmt = sum(QTY × ClaimUP) = total SSO reimbursement
    const claimAmount = visit.billingItems.reduce(
      (sum, item) => sum + item.quantity * item.claimUnitPrice,
      0,
    );

    // DTtran: use serviceStartTime if available, fallback to visitDate
    const dtTran = visit.serviceStartTime
      ? formatDateTime(visit.serviceStartTime)
      : formatDateTime(visit.visitDate);

    const tran: BilltranRecord = {
      station: '01',
      authcode: 'SSOCAC',
      dtTran,
      hcode,
      invno: visit.vn,
      billno: visit.billNo || '',
      hn: visit.patientHn,
      memberNo: visit.caseNumber || '',
      amount: formatAmount(chargeAmount),
      paid: '0.00',
      verCode: visit.vcrCode || '',
      tflag: previouslyExportedVns.has(visit.vn) ? 'E' : 'A',
      pid: visit.patientCitizenId,
      name: visit.patientFullName,
      hMain: visit.mainHospitalCode,
      payPlan: '80',
      claimAmt: formatAmount(claimAmount),
      otherPayplan: '',
      otherPay: '0.00',
    };

    tranRecords.push(Object.values(tran).join('|'));

    // Bill items for this visit
    const svid = svidMap.get(visit.vn) || '';
    const svDate = formatDate(visit.visitDate);

    for (const item of visit.billingItems) {
      const chargeAmt = item.quantity * item.unitPrice;
      const claimAmt = item.quantity * item.claimUnitPrice;

      // Drug/supply items (BillMuad=3,5) reference Dispensing.DispID; others reference OPServices.SvID
      const svRefId =
        item.billingGroup === '3' || item.billingGroup === '5'
          ? (dispIdMap.get(visit.vn) || svid)
          : svid;

      // STDCode: use stdCode from HIS if available, fallback to TMT (drugs) or AIPN (services)
      const stdCode = item.stdCode
        || (item.billingGroup === '3' ? (item.tmtCode || item.aipnCode || '') : (item.aipnCode || ''));

      const billItem: BillItemRecord = {
        invno: visit.vn,
        svDate,
        billMuad: item.billingGroup,
        lcCode: item.hospitalCode,
        stdCode,
        desc: item.description,
        qty: String(item.quantity),
        up: formatAmount(item.unitPrice),
        chargeAmt: formatAmount(chargeAmt),
        claimUp: formatAmount(item.claimUnitPrice),
        claimAmount: formatAmount(claimAmt),
        svRefId,
        claimCat: item.claimCategory,
      };

      itemRecords.push(Object.values(billItem).join('|'));
    }
  }

  const dataSections =
    `<BILLTRAN>\r\n` +
    (tranRecords.length > 0 ? tranRecords.join('\r\n') + '\r\n' : '') +
    `</BILLTRAN>\r\n` +
    `<BillItems>\r\n` +
    (itemRecords.length > 0 ? itemRecords.join('\r\n') + '\r\n' : '') +
    `</BillItems>\r\n`;

  return wrapXml({
    hcode,
    hname,
    sessNo,
    recCount: tranRecords.length,
    dataSections,
  });
}
