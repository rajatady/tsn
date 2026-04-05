/*
 * StrictTS Log Triage
 *
 * Reads structured-ish log lines from stdin and prints an actionable summary.
 * Exercises:
 *   - trim() to normalize input lines and message values
 *   - includes() to classify incidents and detect actionable errors
 *   - indexOf() to parse key=value fields efficiently
 *   - join() to render tag lists and service summaries
 *
 * Compile: npx tsx compiler/index.ts examples/log-triage.ts
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

function splitLines(input: string): string[] {
  const lines: string[] = [];
  let current: string = "";
  let i = 0;
  while (i < input.length) {
    const ch: string = input.slice(i, i + 1);
    if (ch === "\n") {
      lines.push(current);
      current = "";
    } else {
      current = current + ch;
    }
    i = i + 1;
  }
  if (current.length > 0) lines.push(current);
  return lines;
}

function fieldValue(line: string, key: string): string {
  const start: number = line.indexOf(key);
  if (start === -1) return "";
  const valueStart: number = start + key.length;
  const rest: string = line.slice(valueStart);
  let end: number = rest.indexOf(" ");
  if (end === -1) end = rest.length;
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
  const lowered: string = message;
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
  const tagLabel: string = tags.join(", ");
  const entry: LogEntry = {
    level: level,
    service: service,
    region: region,
    message: message,
    tagLabel: tagLabel,
  };
  return entry;
}

function isActionable(entry: LogEntry): boolean {
  if (entry.level === "ERROR") return true;
  if (entry.level === "WARN" && entry.tagLabel.length > 0) return true;
  if (entry.message.includes("retry storm")) return true;
  return false;
}

function addServiceCount(stats: ServiceStat[], service: string): ServiceStat[] {
  const next: ServiceStat[] = stats.slice(0);
  let i = 0;
  while (i < next.length) {
    if (next[i].service === service) {
      const current: ServiceStat = next[i];
      const updated: ServiceStat = {
        service: current.service,
        count: current.count + 1,
      };
      next[i] = updated;
      return next;
    }
    i = i + 1;
  }
  const stat: ServiceStat = { service: service, count: 1 };
  next.push(stat);
  return next;
}

function sortStatsDescending(stats: ServiceStat[]): ServiceStat[] {
  const copy: ServiceStat[] = stats.slice(0);
  copy.sort((a: ServiceStat, b: ServiceStat): number => b.count - a.count);
  return copy;
}

function parseEntries(raw: string): LogEntry[] {
  const lines: string[] = splitLines(raw);
  const entries: LogEntry[] = [];
  let i = 0;
  while (i < lines.length) {
    const line: string = lines[i].trim();
    if (line.length > 0) entries.push(parseEntry(line));
    i = i + 1;
  }
  return entries;
}

function printSummary(entries: LogEntry[]): void {
  const actionable: LogEntry[] = [];
  let serviceStats: ServiceStat[] = [];
  const serviceNames: string[] = [];
  let errorCount = 0;
  let warnCount = 0;
  let i = 0;

  while (i < entries.length) {
    const entry: LogEntry = entries[i];
    if (entry.level === "ERROR") errorCount = errorCount + 1;
    if (entry.level === "WARN") warnCount = warnCount + 1;
    if (isActionable(entry)) {
      actionable.push(entry);
      serviceStats = addServiceCount(serviceStats, entry.service);
    }
    i = i + 1;
  }

  const ranked: ServiceStat[] = sortStatsDescending(serviceStats);
  let s = 0;
  while (s < ranked.length) {
    serviceNames.push(ranked[s].service);
    s = s + 1;
  }

  console.log("=== LOG TRIAGE ===");
  console.log("Total lines: " + String(entries.length));
  console.log("Actionable: " + String(actionable.length));
  console.log("Errors: " + String(errorCount));
  console.log("Warnings: " + String(warnCount));
  console.log("");
  console.log("Hot services: " + serviceNames.join(", "));
  console.log("");

  let j = 0;
  while (j < actionable.length) {
    const entry: LogEntry = actionable[j];
    const label: string = "[" + entry.level + "] " + entry.service + "@" + entry.region;
    console.log(label + " :: " + entry.message + " :: " + entry.tagLabel);
    j = j + 1;
  }
}

function main(): void {
  const raw: string = readStdin();
  const entries: LogEntry[] = parseEntries(raw);
  printSummary(entries);
}

main();
