/**
 * Transient hand-off for a parsed receipt between the scan screen and the
 * confirm modal. Router params are strings and a receipt carries the full raw
 * OCR text, so we stash the object module-side and consume it once. Not part of
 * persisted state — it lives only for the duration of the confirm step.
 */
import type { ParsedReceipt } from './receipt';

let pending: ParsedReceipt | null = null;

export function setPendingScan(result: ParsedReceipt): void {
  pending = result;
}

/** Read without clearing — safe for the confirm screen to call on each render. */
export function peekPendingScan(): ParsedReceipt | null {
  return pending;
}

export function clearPendingScan(): void {
  pending = null;
}
