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
 * Structure (matches real SSOP sample files):
 * <Dispensing>
 * record|record|...
 * </Dispensing>
 * <DispensedItems>
 * record|record|...
 * </DispensedItems>
 *
 * Only visits with drug/supply items (billingGroup '3' or '5') generate records.
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
    // Filter drug + medical supply items (BillMuad 3=ค่ายา, 5=ค่าเวชภัณฑ์ที่มิใช่ยา)
    const drugItems = visit.billingItems.filter(
      (i) => i.billingGroup === '3' || i.billingGroup === '5',
    );
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
    (dispensingRecords.length > 0 ? dispensingRecords.join('\r\n') + '\r\n' : '') +
    `</Dispensing>\r\n` +
    `<DispensedItems>\r\n` +
    (dispensedItemRecords.length > 0 ? dispensedItemRecords.join('\r\n') + '\r\n' : '') +
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
