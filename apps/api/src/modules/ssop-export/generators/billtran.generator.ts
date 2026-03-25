import { wrapXml } from './xml-wrapper';
import { formatDateTime, formatDate, formatAmount } from './encoding';
import { isDrugItem, resolveClaimUP } from './billdisp.generator';
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
/** Build typed BILLTRAN + BillItems records for a single visit (reusable for preview) */
export function buildBilltranRecords(
  visit: SsopVisitData,
  hcode: string,
  svidMap: Map<string, string>,
  dispIdMap: Map<string, string> = new Map(),
): { tran: BilltranRecord; items: BillItemRecord[] } {
  const chargeAmount = visit.billingItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const claimAmount = visit.billingItems.reduce(
    (sum, item) => sum + item.quantity * resolveClaimUP(item),
    0,
  );

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
    verCode: visit.vcrCode || visit.protocolCode || '',
    // Cancer claims (SSOCAC) always use 'E' — they are additional claims on top of
    // standard OP billing already submitted. Non-cancer would use A/E logic.
    tflag: 'E',
    pid: visit.patientCitizenId,
    name: visit.patientFullName,
    hMain: visit.mainHospitalCode,
    payPlan: '80',
    claimAmt: formatAmount(claimAmount),
    otherPayplan: '',
    otherPay: '0.00',
  };

  const svid = svidMap.get(visit.vn) || '';
  const svDate = formatDate(visit.visitDate);
  const items: BillItemRecord[] = [];

  for (const item of visit.billingItems) {
    const chargeAmt = item.quantity * item.unitPrice;
    const claimUP = resolveClaimUP(item);
    const claimAmt = item.quantity * claimUP;

    const itemIsDrug = isDrugItem(item);
    const svRefId = itemIsDrug ? (dispIdMap.get(visit.vn) || svid) : svid;

    const rawMuad = item.stdGroup || item.billingGroup;
    // Normalize SSOP BillMuad: strip leading zero from 2-char zero-padded codes (e.g. '03'→'3', '05'→'5')
    const billMuad = rawMuad?.length === 2 && rawMuad.startsWith('0') ? rawMuad.slice(1) : rawMuad;
    const isDrugGroup = billMuad === '3' || billMuad === '03';
    const stdCode = isDrugGroup
      ? (item.sksDrugCode || item.stdCode || item.tmtCode || item.aipnCode || '')
      : (item.stdCode || item.aipnCode || '');

    items.push({
      invno: visit.vn,
      svDate,
      billMuad,
      lcCode: item.hospitalCode,
      stdCode,
      desc: item.description || item.sksDfsText || item.dfsText || '',
      qty: String(item.quantity),
      up: formatAmount(item.unitPrice),
      chargeAmt: formatAmount(chargeAmt),
      claimUp: formatAmount(claimUP),
      claimAmount: formatAmount(claimAmt),
      svRefId,
      claimCat: item.claimCategory,
    });
  }

  return { tran, items };
}

export function generateBilltranXml(
  visits: SsopVisitData[],
  hcode: string,
  hname: string,
  sessNo: string,
  svidMap: Map<string, string>,
  dispIdMap: Map<string, string> = new Map(),
): string {
  const tranRecords: string[] = [];
  const itemRecords: string[] = [];

  for (const visit of visits) {
    const { tran, items } = buildBilltranRecords(
      visit, hcode, svidMap, dispIdMap,
    );
    tranRecords.push(Object.values(tran).join('|'));
    for (const item of items) {
      itemRecords.push(Object.values(item).join('|'));
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
