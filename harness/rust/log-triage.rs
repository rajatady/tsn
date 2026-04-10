// Rust port of examples/log-triage.ts — zero-dep, stdlib only.

use std::io::{self, Read, Write, BufWriter};

struct LogEntry {
    level: String,
    service: String,
    region: String,
    message: String,
    tag_label: String,
}

struct ServiceStat {
    service: String,
    count: i64,
}

fn field_value(line: &str, key: &str) -> String {
    let start = match line.find(key) {
        Some(i) => i,
        None => return String::new(),
    };
    let value_start = start + key.len();
    let rest = &line[value_start..];
    let end = rest.find(' ').unwrap_or(rest.len());
    rest[..end].trim().to_string()
}

fn message_value(line: &str) -> String {
    let marker = " msg=";
    match line.find(marker) {
        Some(i) => line[i + marker.len()..].trim().to_string(),
        None => line.trim().to_string(),
    }
}

fn classify_tags(level: &str, service: &str, message: &str) -> Vec<&'static str> {
    let mut tags = Vec::new();
    let lowered = message.to_lowercase();
    if level == "ERROR" { tags.push("page"); }
    if lowered.contains("timeout") || lowered.contains("latency") { tags.push("latency"); }
    if lowered.contains("payment") || service == "checkout" { tags.push("payments"); }
    if lowered.contains("token") || lowered.contains("auth") { tags.push("auth"); }
    if lowered.contains("queue") || lowered.contains("backlog") { tags.push("queue"); }
    if lowered.contains("deploy") || lowered.contains("release") { tags.push("release"); }
    tags
}

fn parse_entry(line: &str) -> LogEntry {
    let clean = line.trim();
    let level = field_value(clean, "level=");
    let service = field_value(clean, "service=");
    let region = field_value(clean, "region=");
    let message = message_value(clean);
    let tags = classify_tags(&level, &service, &message);
    let tag_label = tags.join(", ");
    LogEntry { level, service, region, message, tag_label }
}

fn is_actionable(e: &LogEntry) -> bool {
    if e.level == "ERROR" { return true; }
    if e.level == "WARN" && !e.tag_label.is_empty() { return true; }
    if e.message.contains("retry storm") { return true; }
    false
}

fn add_service_count(stats: &mut Vec<ServiceStat>, service: &str) {
    for s in stats.iter_mut() {
        if s.service == service {
            s.count += 1;
            return;
        }
    }
    stats.push(ServiceStat { service: service.to_string(), count: 1 });
}

fn parse_entries(raw: &str) -> Vec<LogEntry> {
    let mut entries = Vec::new();
    for line in raw.split('\n') {
        let line = line.trim();
        if !line.is_empty() {
            entries.push(parse_entry(line));
        }
    }
    entries
}

fn main() {
    let mut raw = String::new();
    io::stdin().read_to_string(&mut raw).unwrap();
    let entries = parse_entries(&raw);

    let mut actionable: Vec<&LogEntry> = Vec::new();
    let mut service_stats: Vec<ServiceStat> = Vec::new();
    let mut error_count = 0i64;
    let mut warn_count = 0i64;

    for e in &entries {
        if e.level == "ERROR" { error_count += 1; }
        if e.level == "WARN" { warn_count += 1; }
        if is_actionable(e) {
            actionable.push(e);
            add_service_count(&mut service_stats, &e.service);
        }
    }

    service_stats.sort_by(|a, b| b.count.cmp(&a.count));
    let service_names: Vec<String> = service_stats.iter().map(|s| s.service.clone()).collect();

    let stdout = io::stdout();
    let mut out = BufWriter::new(stdout.lock());
    writeln!(out, "=== LOG TRIAGE ===").unwrap();
    writeln!(out, "Total lines: {}", entries.len()).unwrap();
    writeln!(out, "Actionable: {}", actionable.len()).unwrap();
    writeln!(out, "Errors: {}", error_count).unwrap();
    writeln!(out, "Warnings: {}", warn_count).unwrap();
    writeln!(out).unwrap();
    writeln!(out, "Hot services: {}", service_names.join(", ")).unwrap();
    writeln!(out).unwrap();

    for e in &actionable {
        writeln!(out, "[{}] {}@{} :: {} :: {}", e.level, e.service, e.region, e.message, e.tag_label).unwrap();
    }
}
