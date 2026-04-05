/**
 * Fuzzy search scoring — matches characters in order with consecutive bonus
 */

export function fuzzyScore(text: string, query: string): number {
  if (query.length === 0) return 100
  if (text.length === 0) return 0
  let score = 0
  let qi = 0
  let consecutive = 0
  let i = 0
  while (i < text.length && qi < query.length) {
    const tc: string = text.slice(i, i + 1)
    const qc: string = query.slice(qi, qi + 1)
    if (tc === qc) {
      score = score + 10
      consecutive = consecutive + 1
      if (consecutive > 1) score = score + consecutive * 5
      qi = qi + 1
    } else {
      consecutive = 0
    }
    i = i + 1
  }
  if (qi < query.length) return 0
  return score
}
