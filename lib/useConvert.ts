import { useMemo } from 'react';

import { type ConvertFn, makeConvert } from './rates';
import { useBudget } from './store';

/** Convert function bound to the cached rates, plus the default currency. */
export function useConvert(): {
  convert: ConvertFn;
  defaultCurrency: string;
  hasRates: boolean;
} {
  const rates = useBudget((s) => s.rates);
  const defaultCurrency = useBudget((s) => s.defaultCurrency);
  const convert = useMemo(() => makeConvert(rates), [rates]);
  return { convert, defaultCurrency, hasRates: rates != null };
}
