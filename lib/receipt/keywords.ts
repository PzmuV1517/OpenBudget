/**
 * Multilingual data for total detection and currency inference. Pure data —
 * extend freely. Keywords are lowercased, accent-insensitive matching is done
 * by the caller (see normalize() in extractTotal).
 */

/**
 * Words that mark the line containing the grand total, across languages.
 * Ordered loosely by specificity; "grand total" style phrases first.
 */
export const TOTAL_KEYWORDS: string[] = [
  // English
  'grand total',
  'amount due',
  'balance due',
  'total due',
  'total',
  'amount',
  'to pay',
  'pay',
  'sum',
  // Spanish / Portuguese
  'total a pagar',
  'importe',
  'importe total',
  'total',
  // French
  'montant',
  'montant total',
  'net a payer',
  'total ttc',
  'a payer',
  // German
  'gesamtbetrag',
  'gesamt',
  'summe',
  'betrag',
  'zu zahlen',
  // Italian
  'totale',
  'totale complessivo',
  'importo',
  // Dutch
  'totaal',
  'te betalen',
  // Romanian
  'total de plata',
  'total',
  'suma',
  // Polish
  'suma',
  'razem',
  'do zaplaty',
  // Scandinavian
  'sum',
  'belop',
  'totalt',
  'at betale',
  // Turkish
  'toplam',
  'genel toplam',
  'tutar',
  // Russian / Cyrillic
  'итого',
  'всего',
  'сумма',
  'к оплате',
  // Greek
  'συνολο',
  'πληρωτεο',
  // Arabic
  'المجموع',
  'الاجمالي',
  'الإجمالي',
  // Hebrew
  'סה"כ',
  'סכום',
  // CJK
  '合計',
  '总计',
  '總計',
  '合计',
  '小計',
  '총액',
  '합계',
  // Thai / Vietnamese / Indonesian / Malay
  'รวม',
  'ยอดรวม',
  'tong cong',
  'thanh tien',
  'jumlah',
  'total bayar',
];

/**
 * Words that mark lines we should DEMOTE — subtotal, tax, change, etc., which
 * frequently contain amounts but are not the grand total.
 */
export const NEGATIVE_KEYWORDS: string[] = [
  'subtotal',
  'sub total',
  'sub-total',
  'tax',
  'vat',
  'gst',
  'hst',
  'tva',
  'mwst',
  'iva',
  'change',
  'cash',
  'tender',
  'tendered',
  'cambio',
  'rendu',
  'rest',
  'wechselgeld',
  'tip',
  'gratuity',
  'discount',
  'rabatt',
  'saving',
  'savings',
  'tvsh',
  'налог',
  'ндс',
  'сдача',
  'すり',
  '小計',
  '税',
  'unit price',
  'qty',
];

/**
 * Currency symbol / code -> ISO 4217. Used to attach a currency to a candidate.
 * Symbols that map to multiple currencies resolve to the most common globally.
 */
export const CURRENCY_SIGNS: { token: string; code: string }[] = [
  { token: '€', code: 'EUR' },
  { token: '£', code: 'GBP' },
  { token: '¥', code: 'JPY' },
  { token: '₩', code: 'KRW' },
  { token: '₹', code: 'INR' },
  { token: '₽', code: 'RUB' },
  { token: '₺', code: 'TRY' },
  { token: '₪', code: 'ILS' },
  { token: '฿', code: 'THB' },
  { token: '₫', code: 'VND' },
  { token: '₴', code: 'UAH' },
  { token: 'zł', code: 'PLN' },
  { token: 'kr', code: 'SEK' },
  { token: 'lei', code: 'RON' },
  { token: 'r$', code: 'BRL' },
  { token: 'rp', code: 'IDR' },
  { token: 'chf', code: 'CHF' },
  { token: 'usd', code: 'USD' },
  { token: 'eur', code: 'EUR' },
  { token: 'gbp', code: 'GBP' },
  { token: 'ron', code: 'RON' },
  { token: 'pln', code: 'PLN' },
  // '$' last: it is the most ambiguous, default to USD.
  { token: '$', code: 'USD' },
];
