// ─── Target 1: JSON Data Pipeline ───────────────────────────────────
// Real-world pattern: read a dataset, filter, transform, aggregate, rank.
// Exercises: typed objects, arrays, closures, string ops, sorting.
//
// StrictTS only — no any, no dynamic access, no eval.

interface Person {
  name: string;
  age: number;
  city: string;
  score: number;
  active: boolean;
}

interface Result {
  name: string;
  city: string;
  score: number;
  rank: number;
}

interface CityStats {
  city: string;
  count: number;
  totalScore: number;
  avgScore: number;
}

// ─── Read input from stdin ──────────────────────────────────────────
// Note: In the compiled C version, this becomes a simple fread() from stdin.
// We use createRequire here because our compiler will replace this entirely.
import { createRequire } from "module";
const require = createRequire(import.meta.url);

function readStdin(): string {
  const fs = require("fs");
  const input: string = fs.readFileSync("/dev/stdin", "utf-8");
  return input;
}

// ─── Pipeline steps ─────────────────────────────────────────────────

function filterActive(people: Person[]): Person[] {
  return people.filter((p: Person): boolean => p.active);
}

function filterByAge(people: Person[], minAge: number): Person[] {
  return people.filter((p: Person): boolean => p.age >= minAge);
}

function sortByScore(people: Person[]): Person[] {
  const copy: Person[] = people.slice(0);
  copy.sort((a: Person, b: Person): number => b.score - a.score);
  return copy;
}

function toResults(people: Person[]): Result[] {
  const results: Result[] = [];
  let i: number = 0;
  while (i < people.length) {
    const p: Person = people[i];
    const r: Result = {
      name: p.name,
      city: p.city,
      score: p.score,
      rank: i + 1,
    };
    results.push(r);
    i = i + 1;
  }
  return results;
}

function topN(results: Result[], n: number): Result[] {
  return results.slice(0, n);
}

function aggregateByCityFromPeople(people: Person[]): CityStats[] {
  // Manually aggregate since we can't use dynamic keys
  const cities: string[] = [];
  const counts: number[] = [];
  const totals: number[] = [];

  let i: number = 0;
  while (i < people.length) {
    const city: string = people[i].city;
    let found: number = -1;
    let j: number = 0;
    while (j < cities.length) {
      if (cities[j] === city) {
        found = j;
      }
      j = j + 1;
    }
    if (found === -1) {
      cities.push(city);
      counts.push(1);
      totals.push(people[i].score);
    } else {
      counts[found] = counts[found] + 1;
      totals[found] = totals[found] + people[i].score;
    }
    i = i + 1;
  }

  const stats: CityStats[] = [];
  let k: number = 0;
  while (k < cities.length) {
    const s: CityStats = {
      city: cities[k],
      count: counts[k],
      totalScore: totals[k],
      avgScore: Math.round((totals[k] / counts[k]) * 100) / 100,
    };
    stats.push(s);
    k = k + 1;
  }
  return stats;
}

// ─── Main ───────────────────────────────────────────────────────────

function main(): void {
  const raw: string = readStdin();
  const data: Person[] = JSON.parse(raw);

  // Pipeline: active → age >= 25 → sort by score → top 10
  const active: Person[] = filterActive(data);
  const aged: Person[] = filterByAge(active, 25);
  const sorted: Person[] = sortByScore(aged);
  const results: Result[] = toResults(sorted);
  const top: Result[] = topN(results, 10);

  console.log("=== TOP 10 RESULTS ===");
  let i: number = 0;
  while (i < top.length) {
    const r: Result = top[i];
    console.log("#" + String(r.rank) + " " + r.name + " (" + r.city + ") — score: " + String(r.score));
    i = i + 1;
  }

  // City aggregation
  const cityStats: CityStats[] = aggregateByCityFromPeople(aged);
  console.log("");
  console.log("=== CITY STATS ===");
  let c: number = 0;
  while (c < cityStats.length) {
    const s: CityStats = cityStats[c];
    console.log(s.city + ": " + String(s.count) + " people, avg score: " + String(s.avgScore));
    c = c + 1;
  }

  console.log("");
  console.log("Total processed: " + String(data.length));
  console.log("Active: " + String(active.length));
  console.log("Age >= 25: " + String(aged.length));
}

main();
