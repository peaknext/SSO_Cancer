import { wrapXml } from './xml-wrapper';

/**
 * Generate BILLDISP XML content — empty for SSO Cancer Care
 *
 * In SSO Cancer Care, medications are billed through BillItems (not Dispensing).
 * This file contains empty Dispensing and DispensedItems sections.
 */
export function generateBilldispXml(
  hcode: string,
  hname: string,
  sessNo: string,
): string {
  const dataSections =
    `<Dispensing>\r\n` +
    `  <TOTAL>0</TOTAL>\r\n` +
    `  <DETAIL></DETAIL>\r\n` +
    `</Dispensing>\r\n` +
    `<DispensedItems>\r\n` +
    `  <TOTAL>0</TOTAL>\r\n` +
    `  <DETAIL></DETAIL>\r\n` +
    `</DispensedItems>\r\n`;

  return wrapXml({
    hcode,
    hname,
    sessNo,
    recCount: 0,
    dataSections,
  });
}
