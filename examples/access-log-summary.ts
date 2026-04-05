/*
 * StrictTS Access Log Summary
 *
 * Reads pipe-delimited access logs from stdin and prints an operational
 * summary. Exercises:
 *   - split() for parsing records and fields
 *   - toUpperCase() / toLowerCase() for normalization
 *   - some() / every() / findIndex() for health checks
 *   - join() for top-path summaries
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

function parseInt10(raw: string): number {
  let i = 0
  let n = 0
  while (i < raw.length) {
    const ch: string = raw.slice(i, i + 1)
    if (ch === "0") n = n * 10 + 0
    else if (ch === "1") n = n * 10 + 1
    else if (ch === "2") n = n * 10 + 2
    else if (ch === "3") n = n * 10 + 3
    else if (ch === "4") n = n * 10 + 4
    else if (ch === "5") n = n * 10 + 5
    else if (ch === "6") n = n * 10 + 6
    else if (ch === "7") n = n * 10 + 7
    else if (ch === "8") n = n * 10 + 8
    else if (ch === "9") n = n * 10 + 9
    i = i + 1
  }
  return n
}

function parseLogs(raw: string): RequestLog[] {
  const lines: string[] = raw.split("\n")
  const logs: RequestLog[] = []
  let i = 0
  while (i < lines.length) {
    const line: string = lines[i].trim()
    if (line.length === 0 || line.startsWith("#")) {
      i = i + 1
      continue
    }
    const parts: string[] = line.split("|")
    if (parts.length < 6) {
      i = i + 1
      continue
    }
    const log: RequestLog = {
      method: parts[1].trim().toUpperCase(),
      path: parts[2].trim().toLowerCase(),
      status: parseInt10(parts[3].trim()),
      latencyMs: parseInt10(parts[4].trim()),
      service: parts[5].trim().toLowerCase(),
    }
    logs.push(log)
    i = i + 1
  }
  return logs
}

function serviceErrorCount(logs: RequestLog[], service: string): number {
  let count = 0
  let i = 0
  while (i < logs.length) {
    const log: RequestLog = logs[i]
    if (log.service === service && log.status >= 500) count = count + 1
    i = i + 1
  }
  return count
}

function topPaths(logs: RequestLog[]): string[] {
  const paths: string[] = []
  const counts: number[] = []
  let i = 0
  while (i < logs.length) {
    const path: string = logs[i].path
    const idx: number = paths.findIndex((value: string): boolean => value === path)
    if (idx === -1) {
      paths.push(path)
      counts.push(1)
    } else {
      counts[idx] = counts[idx] + 1
    }
    i = i + 1
  }

  const result: string[] = []
  let picks = 0
  while (picks < 3 && picks < paths.length) {
    let bestIdx = -1
    let bestCount = -1
    let j = 0
    while (j < paths.length) {
      if (counts[j] > bestCount) {
        bestIdx = j
        bestCount = counts[j]
      }
      j = j + 1
    }
    if (bestIdx !== -1) {
      result.push(paths[bestIdx])
      counts[bestIdx] = -1
    }
    picks = picks + 1
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
