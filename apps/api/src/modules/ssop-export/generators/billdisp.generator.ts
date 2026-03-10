import { wrapXml } from './xml-wrapper';
import { formatDateTime, formatAmount } from './encoding';
import type {
  SsopVisitData,
  DispensingRecord,
  DispensedItemRecord,
} from '../types/ssop.types';

/**
 * Check if a billing item is a drug/medical-supply item for BILLDISP.
 * HIS stores billingGroup as zero-padded ('03','05') while SSOP uses single-digit ('3','5').
 * stdGroup is the SSOP-normalized group (e.g. billingGroup '17' → stdGroup '03').
 */
const DRUG_GROUPS = new Set(['3', '03', '5', '05']);
export function isDrugItem(item: { stdGroup?: string | null; billingGroup: string }): boolean {
  return DRUG_GROUPS.has(item.stdGroup || item.billingGroup);
}

const RADIATION_GROUPS = new Set(['8', '08']);
export function isRadiationItem(item: { stdGroup?: string | null; billingGroup: string }): boolean {
  return RADIATION_GROUPS.has(item.stdGroup || item.billingGroup);
}

/**
 * Resolve the SSO claim unit price for a billing item.
 *
 * Business rule: เบิกไม่เกินค่าเสียจริง และไม่เกินอัตรา AIPN
 *   - If AIPN rate exists on visit date → MIN(unitPrice, aipnRate)
 *   - Otherwise fall back to sksReimbPrice → claimUnitPrice
 */
export function resolveClaimUP(item: {
  unitPrice: number;
  aipnRate: number | null;
  sksReimbPrice: number | null;
  claimUnitPrice: number;
}): number {
  if (item.aipnRate != null) {
    return Math.min(item.unitPrice, item.aipnRate);
  }
  return item.sksReimbPrice ?? item.claimUnitPrice;
}

/** Build typed Dispensing + DispensedItems records for a single visit (reusable for preview) */
export function buildBilldispRecords(
  visit: SsopVisitData,
  hcode: string,
  svidMap: Map<string, string>,
): { dispensing: DispensingRecord; items: DispensedItemRecord[]; dispId: string } | null {
  // Filter drug + medical supply items (BillMuad 3=ค่ายา, 5=ค่าเวชภัณฑ์ที่มิใช่ยา)
  const drugItems = visit.billingItems.filter((i) => isDrugItem(i));
  if (drugItems.length === 0) return null;

  const svid = svidMap.get(visit.vn) || '';
  const dispId = `${visit.vn}D01`;

  const prescDt = visit.prescriptionTime
    ? formatDateTime(visit.prescriptionTime)
    : visit.serviceStartTime
      ? formatDateTime(visit.serviceStartTime)
      : formatDateTime(visit.visitDate);

  const totalCharge = drugItems.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0,
  );
  const totalClaim = drugItems.reduce((sum, i) => sum + i.quantity * resolveClaimUP(i), 0);

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
    dayCover: visit.dayCover || '',
  };

  const items: DispensedItemRecord[] = [];
  for (const item of drugItems) {
    const chargeAmt = item.quantity * item.unitPrice;
    const reimbUP = resolveClaimUP(item);
    const reimbAmt = item.quantity * reimbUP;

    items.push({
      dispId,
      prdCat: '1',
      hospdrgid: item.hospitalCode,
      drgId: item.sksDrugCode || item.tmtCode || item.aipnCode || '',
      dfsCode: '',
      dfsText: item.sksDfsText || item.dfsText || item.description,
      packsize: item.packsize || '',
      sigCode: item.sigCode || '',
      sigText: item.sigText || '',
      quantity: String(item.quantity),
      unitPrice: formatAmount(item.unitPrice),
      chargeAmt: formatAmount(chargeAmt),
      reimbPrice: formatAmount(reimbUP),
      reimbAmt: formatAmount(reimbAmt),
      prdSeCode: '0',
      claimcont: 'OD',
      claimCat: item.claimCategory,
      multiDisp: '',
      supplyFor: item.supplyDuration || '',
    });
  }

  return { dispensing, items, dispId };
}

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
 * Only visits with drug/supply items (stdGroup/billingGroup '03'/'3' or '05'/'5') generate records.
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
    const result = buildBilldispRecords(visit, hcode, svidMap);
    if (!result) continue;

    dispIdMap.set(visit.vn, result.dispId);
    dispensingRecords.push(Object.values(result.dispensing).join('|'));
    for (const item of result.items) {
      dispensedItemRecords.push(Object.values(item).join('|'));
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
