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
    const [, method, path, statusStr, latencyStr, service] = parts
    const log: RequestLog = {
      method: method.trim().toUpperCase(),
      path: path.trim().toLowerCase(),
      status: parseInt(statusStr.trim()),
      latencyMs: parseInt(latencyStr.trim()),
      service: service.trim().toLowerCase(),
    }
    logs.push(log)
  }
  return logs
}

function serviceErrorCount(logs: RequestLog[], service: string): number {
  return logs.count((log: RequestLog): boolean => log.service === service && log.status >= 500)
}

function topPaths(logs: RequestLog[]): string[] {
  const counts = new Map<string, number>()
  for (const log of logs) {
    const prev: number = counts.get(log.path) ?? 0
    counts.set(log.path, prev + 1)
  }

  const paths: string[] = []
  const pathCounts: number[] = []
  for (const log of logs) {
    if (!paths.includes(log.path)) {
      paths.push(log.path)
      pathCounts.push(counts.get(log.path) ?? 0)
    }
  }

  const result: string[] = []
  for (let picks: number = 0; picks < 3 && picks < paths.length; picks += 1) {
    let bestIdx: number = -1
    let bestCount: number = -1
    for (let j: number = 0; j < paths.length; j += 1) {
      if (pathCounts[j] > bestCount) {
        bestIdx = j
        bestCount = pathCounts[j]
      }
    }
    if (bestIdx === -1) break
    result.push(paths[bestIdx])
    pathCounts[bestIdx] = -1
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
