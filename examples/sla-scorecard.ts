/*
 * TSN SLA Scorecard
 *
 * Reads service SLA snapshots from stdin and prints a reliability scorecard.
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
  const rows: ServiceSnapshot[] = []
  const lines: string[] = raw.split("\n")
  for (let i: number = 1; i < lines.length; i += 1) {
    const line: string = lines[i].trim()
    if (line.length === 0) continue
    const parts: string[] = line.split(",")
    if (parts.length < 5) continue
    const [svc, uptimeStr, errStr, p95Str, deployStr] = parts
    const row: ServiceSnapshot = {
      service: svc.trim().toLowerCase(),
      uptime: parseFloat(uptimeStr.trim()),
      errorRate: parseFloat(errStr.trim()),
      p95ms: parseInt(p95Str.trim()),
      deploys: parseInt(deployStr.trim()),
    }
    rows.push(row)
  }
  return rows
}

function boolText(value: boolean): string {
  return value ? "true" : "false"
}

function main(): void {
  const rows: ServiceSnapshot[] = parseSnapshots(readStdin())
  const p95s: number[] = rows.map((row: ServiceSnapshot): number => row.p95ms)
  const uptimes: number[] = rows.map((row: ServiceSnapshot): number => row.uptime)
  const deploys: number[] = rows.map((row: ServiceSnapshot): number => row.deploys)

  const breachCount: number = rows.filter((row: ServiceSnapshot): boolean => row.errorRate > 0.5 || row.p95ms > 650).length
  const anyCriticalErrors: boolean = rows.some((row: ServiceSnapshot): boolean => row.errorRate >= 1.5)
  const allStable: boolean = rows.every((row: ServiceSnapshot): boolean => row.uptime >= 99 && row.p95ms < 900)
  const hotRows: ServiceSnapshot[] = rows.filter((row: ServiceSnapshot): boolean => row.errorRate > 0.5 || row.p95ms > 650)
  const hotServices: string[] = hotRows.map((row: ServiceSnapshot): string => row.service)

  console.log("=== SLA SCORECARD ===")
  console.log("Services: " + String(rows.length))
  console.log("Worst p95 ms: " + String(p95s.reduce((a: number, b: number): number => a > b ? a : b, p95s[0])))
  console.log("Best p95 ms: " + String(p95s.reduce((a: number, b: number): number => a < b ? a : b, p95s[0])))
  console.log("Lowest uptime: " + String(uptimes.reduce((a: number, b: number): number => a < b ? a : b, uptimes[0])))
  console.log("Total deploys: " + String(deploys.reduce((a: number, b: number): number => a + b, 0)))
  console.log("SLA breaches: " + String(breachCount))
  console.log("Any critical errors: " + boolText(anyCriticalErrors))
  console.log("All services stable: " + boolText(allStable))
  console.log("Hot services: " + hotServices.join(", "))
}

main()
