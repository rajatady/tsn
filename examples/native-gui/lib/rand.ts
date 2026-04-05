/**
 * PRNG — deterministic random number generation
 * Uses modulo instead of bitwise AND (doubles can't do bitwise in C)
 */

export function nextRand(s: number): number {
  const raw = s * 1103515245 + 12345
  return raw - Math.floor(raw / 2147483648) * 2147483648
}

export function randIndex(s: number, max: number): number {
  const v = Math.floor((s / 2147483647) * max)
  if (v >= max) return max - 1
  if (v < 0) return 0
  return v
}
