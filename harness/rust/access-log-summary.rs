// Rust port of examples/access-log-summary.ts — zero-dep, stdlib only.

use std::io::{self, Read, Write, BufWriter};

struct RequestLog {
    path: String,
    status: i64,
    latency_ms: i64,
    service: String,
}

fn parse_logs(raw: &str) -> Vec<RequestLog> {
    let mut logs = Vec::new();
    for line in raw.split('\n') {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() < 6 {
            continue;
        }
        let path = parts[2].trim().to_lowercase();
        let status: i64 = parts[3].trim().parse().unwrap_or(0);
        let latency: i64 = parts[4].trim().parse().unwrap_or(0);
        let service = parts[5].trim().to_lowercase();
        logs.push(RequestLog { path, status, latency_ms: latency, service });
    }
    logs
}

fn service_error_count(logs: &[RequestLog], service: &str) -> usize {
    logs.iter().filter(|l| l.service == service && l.status >= 500).count()
}

fn top_paths(logs: &[RequestLog]) -> Vec<String> {
    let mut paths: Vec<String> = Vec::new();
    let mut counts: Vec<i64> = Vec::new();
    for l in logs {
        let path = &l.path;
        let mut found = -1i32;
        for (i, p) in paths.iter().enumerate() {
            if p == path { found = i as i32; break; }
        }
        if found == -1 {
            paths.push(path.clone());
            counts.push(1);
        } else {
            counts[found as usize] += 1;
        }
    }
    let mut result = Vec::new();
    let mut picks = 0;
    while picks < 3 && picks < paths.len() {
        let mut best_idx = -1i32;
        let mut best = -1i64;
        for (j, c) in counts.iter().enumerate() {
            if *c > best { best = *c; best_idx = j as i32; }
        }
        if best_idx != -1 {
            result.push(paths[best_idx as usize].clone());
            counts[best_idx as usize] = -1;
        }
        picks += 1;
    }
    result
}

fn bool_text(v: bool) -> &'static str { if v { "true" } else { "false" } }

fn main() {
    let mut raw = String::new();
    io::stdin().read_to_string(&mut raw).unwrap();
    let logs = parse_logs(&raw);
    let critical = ["checkout", "auth", "api"];
    let has_errors = logs.iter().any(|l| l.status >= 500);
    let all_healthy = critical.iter().all(|s| service_error_count(&logs, s) == 0);
    let first_slow: i32 = logs.iter().position(|l| l.latency_ms >= 900).map(|i| i as i32).unwrap_or(-1);
    let hot = top_paths(&logs);

    let stdout = io::stdout();
    let mut out = BufWriter::new(stdout.lock());
    writeln!(out, "=== ACCESS LOG SUMMARY ===").unwrap();
    writeln!(out, "Total requests: {}", logs.len()).unwrap();
    writeln!(out, "5xx present: {}", bool_text(has_errors)).unwrap();
    writeln!(out, "Critical services healthy: {}", bool_text(all_healthy)).unwrap();
    writeln!(out, "First slow request index: {}", first_slow).unwrap();
    writeln!(out, "Top paths: {}", hot.join(", ")).unwrap();
}
