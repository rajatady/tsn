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
// This is IMPOSSIBLE with Bun, Node, or any JS runtime.
// You cannot load a JS runtime inside SQLite.

function fuzzyScore(text: string, query: string): number {
  // Simplified fuzzy matching: count consecutive character matches,
  // bonus for matches at word boundaries and start of string.
  let score: number = 0;
  let qi: number = 0;  // position in query
  let consecutive: number = 0;
  let i: number = 0;

  while (i < text.length && qi < query.length) {
    const tc: string = text.slice(i, i + 1);
    const qc: string = query.slice(qi, qi + 1);

    // Case-insensitive compare
    if (toLower(tc) === toLower(qc)) {
      // Match found
      score = score + 10;

      // Bonus for consecutive matches
      consecutive = consecutive + 1;
      if (consecutive > 1) {
        score = score + consecutive * 5;
      }

      // Bonus for match at start
      if (i === 0) {
        score = score + 25;
      }

      // Bonus for match after separator (word boundary)
      if (i > 0) {
        const prev: string = text.slice(i - 1, i);
        if (prev === " " || prev === "_" || prev === "-" || prev === ".") {
          score = score + 20;
        }
      }

      qi = qi + 1;
    } else {
      consecutive = 0;
    }
    i = i + 1;
  }

  // All query chars matched?
  if (qi < query.length) {
    return 0;  // not all query chars found
  }

  // Bonus for shorter strings (more precise match)
  if (text.length > 0) {
    score = score + Math.round(100 * query.length / text.length);
  }

  return score;
}

function toLower(ch: string): string {
  if (ch === "A") return "a";
  if (ch === "B") return "b";
  if (ch === "C") return "c";
  if (ch === "D") return "d";
  if (ch === "E") return "e";
  if (ch === "F") return "f";
  if (ch === "G") return "g";
  if (ch === "H") return "h";
  if (ch === "I") return "i";
  if (ch === "J") return "j";
  if (ch === "K") return "k";
  if (ch === "L") return "l";
  if (ch === "M") return "m";
  if (ch === "N") return "n";
  if (ch === "O") return "o";
  if (ch === "P") return "p";
  if (ch === "Q") return "q";
  if (ch === "R") return "r";
  if (ch === "S") return "s";
  if (ch === "T") return "t";
  if (ch === "U") return "u";
  if (ch === "V") return "v";
  if (ch === "W") return "w";
  if (ch === "X") return "x";
  if (ch === "Y") return "y";
  if (ch === "Z") return "z";
  return ch;
}
