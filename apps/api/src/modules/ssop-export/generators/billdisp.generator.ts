import { wrapXml } from './xml-wrapper';
import { formatDateTime, formatAmount } from './encoding';
import type {
  SsopVisitData,
  DispensingRecord,
  DispensedItemRecord,
} from '../types/ssop.types';

/**
 * Generate BILLDISP XML content (drug dispensing + dispensed items)
 *
 * Structure:
 * <Dispensing>
 *   <TOTAL>{N}</TOTAL>
 *   <DETAIL>record|record|...</DETAIL>
 * </Dispensing>
 * <DispensedItems>
 *   <TOTAL>{N}</TOTAL>
 *   <DETAIL>record|record|...</DETAIL>
 * </DispensedItems>
 *
 * Only visits with drug items (billingGroup === '3') generate records.
 *
 * @returns xml string + dispIdMap (VN → DispID) for BillItems.SvRefID routing
 */
export function generateBilldispXml(
  visits: SsopVisitData[],
  hcode: string,
  hname: string,
  sessNo: string,
  svidMap: Map<string, string>,
): { xml: string; dispIdMap: Map<string, string> } {
  const dispensingRecords: string[] = [];
  const dispensedItemRecords: string[] = [];
  const dispIdMap = new Map<string, string>();

  for (const visit of visits) {
    // Filter drug items only (BillMuad = 3 = ค่ายา/สารอาหาร)
    const drugItems = visit.billingItems.filter((i) => i.billingGroup === '3');
    if (drugItems.length === 0) continue;

    const svid = svidMap.get(visit.vn) || '';
    const dispId = `${visit.vn}D01`;
    dispIdMap.set(visit.vn, dispId);

    const prescDt = visit.serviceStartTime
      ? formatDateTime(visit.serviceStartTime)
      : formatDateTime(visit.visitDate);

    const totalCharge = drugItems.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
    const totalClaim = drugItems.reduce(
      (sum, i) => sum + i.quantity * i.claimUnitPrice,
      0,
    );

    const dispensing: DispensingRecord = {
      providerID: hcode,
      dispId,
      invno: visit.vn,
      hn: visit.patientHn,
      pid: visit.patientCitizenId,
      prescdt: prescDt,
      dispdt: prescDt,
      prescb: visit.physicianLicenseNo || '',
      itemcnt: String(drugItems.length),
      chargeAmt: formatAmount(totalCharge),
      claimAmt: formatAmount(totalClaim),
      paid: '0.00',
      otherPay: '0.00',
      reimburser: 'HP',
      benefitPlan: 'SS',
      dispeStat: '1',
      svId: svid,
      dayCover: '',
    };

    dispensingRecords.push(Object.values(dispensing).join('|'));

    // DispensedItems — one per drug item
    for (const item of drugItems) {
      const chargeAmt = item.quantity * item.unitPrice;
      const reimbAmt = item.quantity * item.claimUnitPrice;

      const dispensedItem: DispensedItemRecord = {
        dispId,
        prdCat: '1',
        hospdrgid: item.hospitalCode,
        drgId: item.tmtCode || item.aipnCode || '',
        dfsCode: '',
        dfsText: item.description,
        packsize: '',
        sigCode: '',
        sigText: '',
        quantity: String(item.quantity),
        unitPrice: formatAmount(item.unitPrice),
        chargeAmt: formatAmount(chargeAmt),
        reimbPrice: formatAmount(item.claimUnitPrice),
        reimbAmt: formatAmount(reimbAmt),
        prdSeCode: '0',
        claimcont: 'OD',
        claimCat: item.claimCategory,
        multiDisp: '',
        supplyFor: '',
      };

      dispensedItemRecords.push(Object.values(dispensedItem).join('|'));
    }
  }

  const dataSections =
    `<Dispensing>\r\n` +
    `  <TOTAL>${dispensingRecords.length}</TOTAL>\r\n` +
    `  <DETAIL>${dispensingRecords.join('\r\n')}</DETAIL>\r\n` +
    `</Dispensing>\r\n` +
    `<DispensedItems>\r\n` +
    `  <TOTAL>${dispensedItemRecords.length}</TOTAL>\r\n` +
    `  <DETAIL>${dispensedItemRecords.join('\r\n')}</DETAIL>\r\n` +
    `</DispensedItems>\r\n`;

  const xml = wrapXml({
    hcode,
    hname,
    sessNo,
    recCount: dispensingRecords.length,
    dataSections,
  });

  return { xml, dispIdMap };
}
