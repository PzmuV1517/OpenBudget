/**
 * Shared detectors for receipt boilerplate — contact info, addresses, and
 * header/footer lines that are neither the store name nor a purchasable item.
 * Used by both merchant detection and line-item extraction so the header
 * (address, phone, ZIP, store #) never leaks in as an "item".
 */

const CONTACT: RegExp[] = [
  /www\.|https?:|\.com\b|\.net\b|\.org\b/i, // urls
  /\btel\b|\bphone\b|\bfax\b|\be-?mail\b|\bcall\b/i, // contact labels
  /\breceipt\b|\binvoice\b|\border\s*#|\btransaction\b|\bcashier\b|\bregister\b|\bcustomer\b/i,
  /store\s*#|reg\s*#|\bvat\b|\btax\s*id\b|\bsku\b|\bauth\b|\bref\b/i,
  /\d{1,2}[:/]\d{2}/, // time / date fragments (12:30, 05/06)
  /\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/, // phone number
];

const ADDRESS: RegExp[] = [
  // "1234 Main St", "55 W Park Avenue", etc. — number + words + street suffix.
  /\b\d{1,6}\s+\w+.*\b(st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive|way|hwy|highway|pkwy|ct|court|pl|plaza|sq|suite|ste|unit|fl|floor)\b/i,
  /\b[A-Z]{2}\s+\d{5}(-\d{4})?\b/, // "IL 62704" state + ZIP
  /\b\d{5}-\d{4}\b/, // ZIP+4
];

/** True if the line looks like contact info or an address, not an item/name. */
export function looksLikeNoise(text: string): boolean {
  return CONTACT.some((re) => re.test(text)) || ADDRESS.some((re) => re.test(text));
}

/**
 * True if a raw amount token looks like real money (has a decimal part), so we
 * can reject bare integers like ZIPs, phone fragments, and store numbers. For
 * zero-decimal currencies (JPY) prices are integers, so this can't apply.
 */
export function isMoneyShaped(raw: string, decimals: number): boolean {
  if (decimals === 0) return true;
  return new RegExp(`[.,]\\d{${decimals}}(?!\\d)`).test(raw);
}
