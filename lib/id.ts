/**
 * Small, dependency-free unique id. Not cryptographically strong — we only need
 * collision-resistant local row ids, and avoiding a native crypto dep keeps the
 * lib pure and unit-testable.
 */
export function uid(prefix = ''): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}${time}${rand}`;
}
