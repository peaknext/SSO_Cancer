import { wrapXml } from './xml-wrapper';
import { formatDateTime, formatDate, formatAmount } from './encoding';
import type { SsopVisitData, BilltranRecord, BillItemRecord } from '../types/ssop.types';

/**
 * Generate BILLTRAN XML content (transactions + bill items)
 *
 * Structure:
 * <BillTran>
 *   <TOTAL>{N}</TOTAL>
 *   <DETAIL>record|record|...</DETAIL>
 * </BillTran>
 * <BillItems>
 *   <TOTAL>{N}</TOTAL>
 *   <DETAIL>record|record|...</DETAIL>
 * </BillItems>
 */
export function generateBilltranXml(
  visits: SsopVisitData[],
  hcode: string,
  hname: string,
  sessNo: string,
  svidMap: Map<string, string>,
): string {
  const tranRecords: string[] = [];
  const itemRecords: string[] = [];

  for (const visit of visits) {
    // Calculate claim amount from billing items (Amount = ClaimAmt per CHI68-A02)
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
      billno: '',
      hn: visit.caseNumber,
      memberNo: visit.vcrCode,
      amount: formatAmount(claimAmount),
      paid: '0.00',
      verCode: visit.protocolCode,
      tflag: 'E',
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

      const billItem: BillItemRecord = {
        invno: visit.vn,
        svDate,
        billMuad: item.billingGroup,
        lcCode: item.hospitalCode,
        stdCode: item.aipnCode || '',
        desc: item.description,
        qty: String(item.quantity),
        up: formatAmount(item.unitPrice),
        chargeAmt: formatAmount(chargeAmt),
        claimUp: formatAmount(item.claimUnitPrice),
        claimAmount: formatAmount(claimAmt),
        svRefId: svid,
        claimCat: item.claimCategory,
      };

      itemRecords.push(Object.values(billItem).join('|'));
    }
  }

  const dataSections =
    `<BillTran>\r\n` +
    `  <TOTAL>${tranRecords.length}</TOTAL>\r\n` +
    `  <DETAIL>${tranRecords.join('\r\n')}</DETAIL>\r\n` +
    `</BillTran>\r\n` +
    `<BillItems>\r\n` +
    `  <TOTAL>${itemRecords.length}</TOTAL>\r\n` +
    `  <DETAIL>${itemRecords.join('\r\n')}</DETAIL>\r\n` +
    `</BillItems>\r\n`;

  return wrapXml({
    hcode,
    hname,
    sessNo,
    recCount: tranRecords.length,
    dataSections,
  });
}
