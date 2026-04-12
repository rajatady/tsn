/*
 * TSN Config Audit
 *
 * Reads deployment-style key/value config from stdin and prints a readiness
 * summary.
 */

interface Entry {
  key: string
  value: string
}

import { createRequire } from "module";
const require = createRequire(import.meta.url);

function readStdin(): string {
  const fs = require("fs");
  return fs.readFileSync("/dev/stdin", "utf-8");
}

function parseEntries(raw: string): Entry[] {
  const entries: Entry[] = []
  for (const rawLine of raw.split("\n")) {
    const line: string = rawLine.trim()
    if (line.length === 0 || line.startsWith("#")) continue
    const eq: number = line.indexOf("=")
    if (eq === -1) continue
    const entry: Entry = {
      key: line.slice(0, eq).trim().toUpperCase(),
      value: line.slice(eq + 1).trim(),
    }
    entries.push(entry)
  }
  return entries
}

function valueFor(entries: Entry[], key: string): string {
  const idx: number = entries.findIndex((entry: Entry): boolean => entry.key === key)
  if (idx === -1) return ""
  return entries[idx].value
}

function csvValues(raw: string): string[] {
  const trimmed: string = raw.trim()
  if (trimmed.length === 0) return []
  const values: string[] = []
  for (const part of trimmed.split(",")) {
    const value: string = part.trim().toLowerCase()
    if (value.length > 0) values.push(value)
  }
  return values
}

function boolText(value: boolean): string {
  return value ? "true" : "false"
}

function main(): void {
  const entries: Entry[] = parseEntries(readStdin())
  const env: string = valueFor(entries, "APP_ENV").toUpperCase()
  const featureFlags: string[] = csvValues(valueFor(entries, "FEATURE_FLAGS"))
  const origins: string[] = csvValues(valueFor(entries, "ALLOWED_ORIGINS"))
  const required: string[] = [
    "APP_ENV",
    "API_BASE_URL",
    "ENABLE_AUDIT_LOG",
    "SESSION_COOKIE_SECURE",
  ]

  const hasAllRequired: boolean = required.every((key: string): boolean => valueFor(entries, key).length > 0)
  const firstMissingIdx: number = required.findIndex((key: string): boolean => valueFor(entries, key).length === 0)
  const auditEnabled: boolean = valueFor(entries, "ENABLE_AUDIT_LOG").toLowerCase() === "true"
  const secureCookies: boolean = valueFor(entries, "SESSION_COOKIE_SECURE").toLowerCase() === "true"
  const hasRiskyFlags: boolean = featureFlags.some((flag: string): boolean => {
    return flag.startsWith("alpha") || flag.endsWith("_dev") || flag.includes("debug")
  })
  const originsSafe: boolean = origins.every((origin: string): boolean => {
    return !origin.includes("localhost") && !origin.includes("127.0.0.1") && !origin.startsWith("http://")
  })

  console.log("=== CONFIG AUDIT ===")
  console.log("Environment: " + env)
  console.log("Required complete: " + boolText(hasAllRequired))
  console.log("First missing required key: " + (firstMissingIdx === -1 ? "none" : required[firstMissingIdx]))
  console.log("Audit logging enabled: " + boolText(auditEnabled))
  console.log("Secure cookies enabled: " + boolText(secureCookies))
  console.log("Risky flags present: " + boolText(hasRiskyFlags))
  console.log("Origins production-safe: " + boolText(originsSafe))
  console.log("Feature flags: " + featureFlags.join(", "))
}

main()
