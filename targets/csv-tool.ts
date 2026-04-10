// ─── Real-world CLI tool: CSV processor ─────────────────────────────
// Usage: cat data.csv | ./csv-tool --filter "age>30" --sort "score" --top 10
//
// This is the kind of tool where native compilation shines:
//   - Instant startup (no runtime to boot)
//   - Process gigabytes of data with minimal memory
//   - Deploy as a single binary, no dependencies
//
// TSN only — no any, no dynamic access, no eval.

import { createRequire } from "module";
const require = createRequire(import.meta.url);

interface Row {
  name: string;
  age: number;
  city: string;
  score: number;
}

function readStdin(): string {
  const fs = require("fs");
  return fs.readFileSync("/dev/stdin", "utf-8");
}

function parseCsv(input: string): Row[] {
  const rows: Row[] = [];
  let lineStart: number = 0;
  let lineNum: number = 0;
  let i: number = 0;

  while (i <= input.length) {
    // Find end of line
    if (i === input.length || input.slice(i, i + 1) === "\n") {
      if (i > lineStart) {
        const line: string = input.slice(lineStart, i);
        if (lineNum > 0) {
          // Parse CSV line: name,age,city,score
          const row: Row = parseCsvLine(line);
          rows.push(row);
        }
        lineNum = lineNum + 1;
      }
      lineStart = i + 1;
    }
    i = i + 1;
  }
  return rows;
}

function parseCsvLine(line: string): Row {
  let field: number = 0;
  let start: number = 0;
  let name: string = "";
  let age: number = 0;
  let city: string = "";
  let score: number = 0;
  let i: number = 0;

  while (i <= line.length) {
    if (i === line.length || line.slice(i, i + 1) === ",") {
      const value: string = line.slice(start, i);
      if (field === 0) {
        name = value;
      } else if (field === 1) {
        age = parseFloat(value);
      } else if (field === 2) {
        city = value;
      } else if (field === 3) {
        score = parseFloat(value);
      }
      field = field + 1;
      start = i + 1;
    }
    i = i + 1;
  }

  const row: Row = { name: name, age: age, city: city, score: score };
  return row;
}

function main(): void {
  const raw: string = readStdin();
  const rows: Row[] = parseCsv(raw);

  // Filter: age > 30
  const filtered: Row[] = rows.filter((r: Row): boolean => r.age > 30);

  // Sort: by score descending
  filtered.sort((a: Row, b: Row): number => b.score - a.score);

  // Top 20
  const top: number = 20;
  let count: number = 0;

  console.log("name,age,city,score");
  let i: number = 0;
  while (i < filtered.length && i < top) {
    const r: Row = filtered[i];
    console.log(r.name + "," + String(r.age) + "," + r.city + "," + String(r.score));
    count = count + 1;
    i = i + 1;
  }

  console.log("");
  console.log("Total rows: " + String(rows.length));
  console.log("Filtered (age > 30): " + String(filtered.length));
  console.log("Showing top " + String(count));
}

main();
