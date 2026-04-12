/*
 * TSN Access Log Summary
 *
 * Reads pipe-delimited access logs from stdin and prints an operational
 * summary.
 */

interface RequestLog {
  method: string
  path: string
  status: number
  latencyMs: number
  service: string
}

import { createRequire } from "module";
const require = createRequire(import.meta.url);

function readStdin(): string {
  const fs = require("fs");
  return fs.readFileSync("/dev/stdin", "utf-8");
}

function parseLogs(raw: string): RequestLog[] {
  const logs: RequestLog[] = []
  for (const rawLine of raw.split("\n")) {
    const line: string = rawLine.trim()
    if (line.length === 0 || line.startsWith("#")) continue
    const parts: string[] = line.split("|")
    if (parts.length < 6) continue
    const log: RequestLog = {
      method: parts[1].trim().toUpperCase(),
      path: parts[2].trim().toLowerCase(),
      status: parseInt(parts[3].trim()),
      latencyMs: parseInt(parts[4].trim()),
      service: parts[5].trim().toLowerCase(),
    }
    logs.push(log)
  }
  return logs
}

function serviceErrorCount(logs: RequestLog[], service: string): number {
  return logs.count((log: RequestLog): boolean => log.service === service && log.status >= 500)
}

function topPaths(logs: RequestLog[]): string[] {
  const paths: string[] = []
  const counts: number[] = []
  for (const log of logs) {
    const idx: number = paths.findIndex((value: string): boolean => value === log.path)
    if (idx === -1) {
      paths.push(log.path)
      counts.push(1)
    } else {
      counts[idx] = counts[idx] + 1
    }
  }

  const result: string[] = []
  for (let picks: number = 0; picks < 3 && picks < paths.length; picks = picks + 1) {
    let bestIdx: number = -1
    let bestCount: number = -1
    for (let j: number = 0; j < paths.length; j = j + 1) {
      if (counts[j] > bestCount) {
        bestIdx = j
        bestCount = counts[j]
      }
    }
    if (bestIdx === -1) break
    result.push(paths[bestIdx])
    counts[bestIdx] = -1
  }
  return result
}

function boolText(value: boolean): string {
  return value ? "true" : "false"
}

function main(): void {
  const logs: RequestLog[] = parseLogs(readStdin())
  const critical: string[] = ["checkout", "auth", "api"]
  const hasServerErrors: boolean = logs.some((log: RequestLog): boolean => log.status >= 500)
  const allCriticalHealthy: boolean = critical.every((service: string): boolean => serviceErrorCount(logs, service) === 0)
  const firstSlowIdx: number = logs.findIndex((log: RequestLog): boolean => log.latencyMs >= 900)
  const hotPaths: string[] = topPaths(logs)

  console.log("=== ACCESS LOG SUMMARY ===")
  console.log("Total requests: " + String(logs.length))
  console.log("5xx present: " + boolText(hasServerErrors))
  console.log("Critical services healthy: " + boolText(allCriticalHealthy))
  console.log("First slow request index: " + String(firstSlowIdx))
  console.log("Top paths: " + hotPaths.join(", "))
}

main()
