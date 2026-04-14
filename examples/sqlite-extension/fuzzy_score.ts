// ─── SQLite Extension: Fuzzy String Scoring ─────────────────────────
// This TypeScript function computes a fuzzy match score between two strings.
// It gets compiled to a .dylib and loaded INTO SQLite as a custom function.
//
// Usage in SQL:
//   SELECT name, fuzzy_score(name, 'alice') as score
//   FROM users
//   ORDER BY score DESC
//   LIMIT 10;
//

function fuzzyScore(text: string, query: string): number {
  let score: number = 0;
  let qi: number = 0;
  let consecutive: number = 0;
  let i: number = 0;

  while (i < text.length && qi < query.length) {
    const tc: string = text.slice(i, i + 1).toLowerCase();
    const qc: string = query.slice(qi, qi + 1).toLowerCase();

    if (tc === qc) {
      score += 10;

      consecutive += 1;
      if (consecutive > 1) {
        score += consecutive * 5;
      }

      if (i === 0) {
        score += 25;
      }

      if (i > 0) {
        const prev: string = text.slice(i - 1, i);
        if (prev === " " || prev === "_" || prev === "-" || prev === ".") {
          score += 20;
        }
      }

      qi += 1;
    } else {
      consecutive = 0;
    }
    i += 1;
  }

  if (qi < query.length) {
    return 0;
  }

  if (text.length > 0) {
    score += Math.round(100 * query.length / text.length);
  }

  return score;
}
