/*
 * TSN Config Audit
 *
 * Reads deployment-style key/value config from stdin and prints a readiness
 * summary.
 */

import { createRequire } from "module";
const require = createRequire(import.meta.url);

function readStdin(): string {
  const fs = require("fs");
  return fs.readFileSync("/dev/stdin", "utf-8");
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
  const config = new Map<string, string>()
  for (const rawLine of readStdin().split("\n")) {
    const line: string = rawLine.trim()
    if (line.length === 0 || line.startsWith("#")) continue
    const eq: number = line.indexOf("=")
    if (eq === -1) continue
    config.set(line.slice(0, eq).trim().toUpperCase(), line.slice(eq + 1).trim())
  }

  const env: string = (config.get("APP_ENV") ?? "").toUpperCase()
  const featureFlags: string[] = csvValues(config.get("FEATURE_FLAGS") ?? "")
  const origins: string[] = csvValues(config.get("ALLOWED_ORIGINS") ?? "")
  const required: string[] = [
    "APP_ENV",
    "API_BASE_URL",
    "ENABLE_AUDIT_LOG",
    "SESSION_COOKIE_SECURE",
  ]

  const hasAllRequired: boolean = required.every((key: string): boolean => (config.get(key) ?? "").length > 0)
  const firstMissingIdx: number = required.findIndex((key: string): boolean => (config.get(key) ?? "").length === 0)
  const auditEnabled: boolean = (config.get("ENABLE_AUDIT_LOG") ?? "").toLowerCase() === "true"
  const secureCookies: boolean = (config.get("SESSION_COOKIE_SECURE") ?? "").toLowerCase() === "true"
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
