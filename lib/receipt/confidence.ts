/**
 * Turns the raw candidate scores from extractTotal into an interpretable
 * confidence for the chosen total. It blends two things:
 *   - margin: how decisively the top candidate beat the runner-up
 *   - absolute signals: it sits on a "total" row, has decimals, has a currency
 * Output is 0..1 plus a level and the reasons, surfaced in the confirm screen.
 */
import type { AmountCandidate, TotalConfidence } from './types';

/** A total row scores ~+120, so ~120 of margin means a runaway winner. */
const MARGIN_FULL = 120;

export function scoreTotalConfidence(
  candidates: AmountCandidate[]
): TotalConfidence {
  if (candidates.length === 0) {
    return { score: 0, level: 'low', reasons: ['No amount detected'] };
  }

  const top = candidates[0];
  const second = candidates[1];
  const reasons: string[] = [];
  let score = 0.25; // floor: we did find a number

  // Decisiveness of the win.
  const margin = top.score - (second ? second.score : 0);
  const marginFactor = Math.min(Math.max(margin, 0) / MARGIN_FULL, 1);
  score += marginFactor * 0.3;
  if (marginFactor >= 0.5) reasons.push('Clearly the top amount');
  else if (second) reasons.push('Close to other amounts');

  // Sitting on an actual "total" row is the strongest single signal.
  if (top.kind === 'total') {
    score += 0.3;
    reasons.push('On a "total" row');
  } else {
    reasons.push('No total keyword found');
  }

  // Written like money.
  if (/[.,]\d{2}\b/.test(top.raw)) {
    score += 0.1;
    reasons.push('Has decimals');
  }

  // Currency resolved.
  if (top.currency) {
    score += 0.05;
    reasons.push(`Currency ${top.currency}`);
  }

  score = Math.min(1, Math.max(0, score));
  const level = score >= 0.7 ? 'high' : score >= 0.45 ? 'medium' : 'low';
  return { score, level, reasons };
}
