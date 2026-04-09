/*
 * TSN SLA Scorecard
 *
 * Reads service SLA snapshots from stdin and prints a reliability scorecard.
 * Exercises:
 *   - parseFloat() / parseInt() for numeric parsing
 *   - count() for SLA breach counting
 *   - sum(), min(), max() for numeric reductions
 *   - some(), every(), join() for summary checks
 */

interface ServiceSnapshot {
  service: string
  uptime: number
  errorRate: number
  p95ms: number
  deploys: number
}

import { createRequire } from "module";
const require = createRequire(import.meta.url);

function readStdin(): string {
  const fs = require("fs");
  return fs.readFileSync("/dev/stdin", "utf-8");
}

function parseSnapshots(raw: string): ServiceSnapshot[] {
  const lines: string[] = raw.split("\n")
  const rows: ServiceSnapshot[] = []
  let i = 1
  while (i < lines.length) {
    const line: string = lines[i].trim()
    if (line.length === 0) {
      i = i + 1
      continue
    }
    const parts: string[] = line.split(",")
    if (parts.length < 5) {
      i = i + 1
      continue
    }
    const row: ServiceSnapshot = {
      service: parts[0].trim().toLowerCase(),
      uptime: parseFloat(parts[1].trim()),
      errorRate: parseFloat(parts[2].trim()),
      p95ms: parseInt(parts[3].trim()),
      deploys: parseInt(parts[4].trim()),
    }
    rows.push(row)
    i = i + 1
  }
  return rows
}

function collectMetric(rows: ServiceSnapshot[], field: string): number[] {
  const values: number[] = []
  let i = 0
  while (i < rows.length) {
    const row: ServiceSnapshot = rows[i]
    if (field === "uptime") values.push(row.uptime)
    else if (field === "errorRate") values.push(row.errorRate)
    else if (field === "p95ms") values.push(row.p95ms)
    else values.push(row.deploys)
    i = i + 1
  }
  return values
}

function boolText(value: boolean): string {
  return value ? "true" : "false"
}

function main(): void {
  const rows: ServiceSnapshot[] = parseSnapshots(readStdin())
  const uptimes: number[] = collectMetric(rows, "uptime")
  const errorRates: number[] = collectMetric(rows, "errorRate")
  const p95s: number[] = collectMetric(rows, "p95ms")
  const deploys: number[] = collectMetric(rows, "deploys")
  const breachCount: number = rows.count((row: ServiceSnapshot): boolean => row.errorRate > 0.5 || row.p95ms > 650)
  const anyCriticalErrors: boolean = rows.some((row: ServiceSnapshot): boolean => row.errorRate >= 1.5)
  const allStable: boolean = rows.every((row: ServiceSnapshot): boolean => row.uptime >= 99 && row.p95ms < 900)
  const worstLatency: number = p95s.max()
  const bestLatency: number = p95s.min()
  const lowestUptime: number = uptimes.min()
  const totalDeploys: number = deploys.sum()
  const hotServices: string[] = []
  let i = 0
  while (i < rows.length) {
    if (rows[i].errorRate > 0.5 || rows[i].p95ms > 650) hotServices.push(rows[i].service)
    i = i + 1
  }

  console.log("=== SLA SCORECARD ===")
  console.log("Services: " + String(rows.length))
  console.log("Worst p95 ms: " + String(worstLatency))
  console.log("Best p95 ms: " + String(bestLatency))
  console.log("Lowest uptime: " + String(lowestUptime))
  console.log("Total deploys: " + String(totalDeploys))
  console.log("SLA breaches: " + String(breachCount))
  console.log("Any critical errors: " + boolText(anyCriticalErrors))
  console.log("All services stable: " + boolText(allStable))
  console.log("Hot services: " + hotServices.join(", "))
}

main()
