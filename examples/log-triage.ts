/*
 * TSN Log Triage
 *
 * Reads structured-ish log lines from stdin and prints an actionable summary.
 *
 * Compile: tsn build examples/log-triage.ts
 * Run:     ./build/log-triage < sample.log
 */

interface LogEntry {
  level: string;
  service: string;
  region: string;
  message: string;
  tagLabel: string;
}

interface ServiceStat {
  service: string;
  count: number;
}

import { createRequire } from "module";
const require = createRequire(import.meta.url);

function readStdin(): string {
  const fs = require("fs");
  return fs.readFileSync("/dev/stdin", "utf-8");
}

function fieldValue(line: string, key: string): string {
  const start: number = line.indexOf(key);
  if (start === -1) return "";
  const rest: string = line.slice(start + key.length);
  const end: number = rest.indexOf(" ");
  if (end === -1) return rest.trim();
  return rest.slice(0, end).trim();
}

function messageValue(line: string): string {
  const marker: string = " msg=";
  const start: number = line.indexOf(marker);
  if (start === -1) return line.trim();
  return line.slice(start + marker.length).trim();
}

function classifyTags(level: string, service: string, message: string): string[] {
  const tags: string[] = [];
  const lowered: string = message.toLowerCase();
  if (level === "ERROR") tags.push("page");
  if (lowered.includes("timeout") || lowered.includes("latency")) tags.push("latency");
  if (lowered.includes("payment") || service === "checkout") tags.push("payments");
  if (lowered.includes("token") || lowered.includes("auth")) tags.push("auth");
  if (lowered.includes("queue") || lowered.includes("backlog")) tags.push("queue");
  if (lowered.includes("deploy") || lowered.includes("release")) tags.push("release");
  return tags;
}

function parseEntry(line: string): LogEntry {
  const clean: string = line.trim();
  const level: string = fieldValue(clean, "level=");
  const service: string = fieldValue(clean, "service=");
  const region: string = fieldValue(clean, "region=");
  const message: string = messageValue(clean);
  const tags: string[] = classifyTags(level, service, message);
  const entry: LogEntry = {
    level: level,
    service: service,
    region: region,
    message: message,
    tagLabel: tags.join(", "),
  };
  return entry;
}

function isActionable(entry: LogEntry): boolean {
  if (entry.level === "ERROR") return true;
  if (entry.level === "WARN" && entry.tagLabel.length > 0) return true;
  if (entry.message.includes("retry storm")) return true;
  return false;
}

function bumpService(stats: ServiceStat[], service: string): ServiceStat[] {
  const next: ServiceStat[] = stats.slice(0);
  const idx: number = next.findIndex((s: ServiceStat): boolean => s.service === service);
  if (idx === -1) {
    const stat: ServiceStat = { service: service, count: 1 };
    next.push(stat);
    return next;
  }
  const current: ServiceStat = next[idx];
  const updated: ServiceStat = { service: current.service, count: current.count + 1 };
  next[idx] = updated;
  return next;
}

function parseEntries(raw: string): LogEntry[] {
  const entries: LogEntry[] = [];
  for (const line of raw.split("\n")) {
    const clean: string = line.trim();
    if (clean.length > 0) entries.push(parseEntry(clean));
  }
  return entries;
}

function printSummary(entries: LogEntry[]): void {
  const actionable: LogEntry[] = entries.filter((e: LogEntry): boolean => isActionable(e));
  const errorCount: number = entries.count((e: LogEntry): boolean => e.level === "ERROR");
  const warnCount: number = entries.count((e: LogEntry): boolean => e.level === "WARN");

  let serviceStats: ServiceStat[] = [];
  for (const entry of actionable) {
    serviceStats = bumpService(serviceStats, entry.service);
  }
  serviceStats.sort((a: ServiceStat, b: ServiceStat): number => b.count - a.count);

  const serviceNames: string[] = serviceStats.map((s: ServiceStat): string => s.service);

  console.log("=== LOG TRIAGE ===");
  console.log("Total lines: " + String(entries.length));
  console.log("Actionable: " + String(actionable.length));
  console.log("Errors: " + String(errorCount));
  console.log("Warnings: " + String(warnCount));
  console.log("");
  console.log("Hot services: " + serviceNames.join(", "));
  console.log("");

  for (const entry of actionable) {
    const label: string = "[" + entry.level + "] " + entry.service + "@" + entry.region;
    console.log(label + " :: " + entry.message + " :: " + entry.tagLabel);
  }
}

function main(): void {
  const entries: LogEntry[] = parseEntries(readStdin());
  printSummary(entries);
}

main();
