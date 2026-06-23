/**
 * Exchange rates: fetched from a free, no-key API when online, then cached so
 * conversion keeps working offline. "Most recently available" = last successful
 * fetch. This is the one place OpenBudget touches the network, and only for
 * rates — never for your financial data.
 */
import { toMajorUnits, toMinorUnits } from './money';

export interface Rates {
  /** Base currency the rates are relative to (e.g. USD). */
  base: string;
  /** Map of currency -> units per 1 base. Always includes the base as 1. */
  rates: Record<string, number>;
  /** Epoch ms of when we fetched it. */
  fetchedAt: number;
}

export type ConvertFn = (minor: number, from: string, to: string) => number;

const ENDPOINT = 'https://open.er-api.com/v6/latest/USD';

/** Fetch fresh rates. Returns null on any failure (offline, parse, etc.). */
export async function fetchRates(): Promise<Rates | null> {
  try {
    const res = await fetch(ENDPOINT);
    const json = await res.json();
    if (json?.result !== 'success' || !json?.rates) return null;
    return {
      base: json.base_code ?? 'USD',
      rates: json.rates,
      fetchedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

/**
 * Convert integer minor units between currencies via the base. Falls back to
 * the original amount (1:1) when rates are missing — better than crashing, and
 * the UI flags when conversion isn't available.
 */
export function convertMinor(
  minor: number,
  from: string,
  to: string,
  rates: Rates | null
): number {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return minor;
  const rf = rates?.rates[f];
  const rt = rates?.rates[t];
  if (!rates || !rf || !rt) return minor; // no data — leave as-is
  const major = toMajorUnits(minor, f);
  const inBase = major / rf;
  const inTarget = inBase * rt;
  return toMinorUnits(inTarget, t);
}

/** Bind a rates table into a reusable convert function. */
export function makeConvert(rates: Rates | null): ConvertFn {
  return (minor, from, to) => convertMinor(minor, from, to, rates);
}
