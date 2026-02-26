import { calculateMd5, formatDateTime } from './encoding';

interface XmlWrapperOptions {
  hcode: string;
  hname: string;
  sessNo: string;
  recCount: number;
  dataSections: string;
}

/**
 * Wrap data sections in SSOP 0.93 ClaimRec XML structure with checksum.
 *
 * Output format:
 * ```xml
 * <?xml version="1.0" encoding="windows-874"?>
 * <ClaimRec System="OP" PayPlan="SS" Version="0.93" Prgs="HX">
 * <Header>...</Header>
 * {dataSections}
 * </ClaimRec>
 * <?EndNote CheckSum="{MD5}"?>
 * ```
 */
export function wrapXml(options: XmlWrapperOptions): string {
  const now = new Date();

  const content =
    `<?xml version="1.0" encoding="windows-874"?>\r\n` +
    `<ClaimRec System="OP" PayPlan="SS" Version="0.93" Prgs="HX">\r\n` +
    `<Header>\r\n` +
    `  <HCODE>${options.hcode}</HCODE>\r\n` +
    `  <HNAME>${escapeXml(options.hname)}</HNAME>\r\n` +
    `  <DATETIME>${formatDateTime(now)}</DATETIME>\r\n` +
    `  <SESSNO>${options.sessNo}</SESSNO>\r\n` +
    `  <RECCOUNT>${options.recCount}</RECCOUNT>\r\n` +
    `</Header>\r\n` +
    options.dataSections +
    `</ClaimRec>\r\n`;

  const checksum = calculateMd5(content);
  return content + `<?EndNote CheckSum="${checksum}"?>`;
}

/** Escape XML special characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
