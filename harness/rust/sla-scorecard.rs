// Rust port of examples/sla-scorecard.ts — zero-dep, stdlib only.

use std::io::{self, Read, Write, BufWriter};

struct ServiceSnapshot {
    service: String,
    uptime: f64,
    error_rate: f64,
    p95ms: i64,
    deploys: i64,
}

fn parse_snapshots(raw: &str) -> Vec<ServiceSnapshot> {
    let mut rows = Vec::new();
    for (idx, line) in raw.split('\n').enumerate() {
        if idx == 0 { continue; }
        let line = line.trim();
        if line.is_empty() { continue; }
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 5 { continue; }
        let service = parts[0].trim().to_lowercase();
        let uptime: f64 = parts[1].trim().parse().unwrap_or(0.0);
        let error_rate: f64 = parts[2].trim().parse().unwrap_or(0.0);
        let p95ms: i64 = parts[3].trim().parse().unwrap_or(0);
        let deploys: i64 = parts[4].trim().parse().unwrap_or(0);
        rows.push(ServiceSnapshot { service, uptime, error_rate, p95ms, deploys });
    }
    rows
}

fn jsnum(v: f64) -> String {
    if v == v.trunc() && v.abs() < 1e21 {
        format!("{}", v as i64)
    } else {
        format!("{}", v)
    }
}

fn bool_text(v: bool) -> &'static str { if v { "true" } else { "false" } }

fn main() {
    let mut raw = String::new();
    io::stdin().read_to_string(&mut raw).unwrap();
    let rows = parse_snapshots(&raw);

    let worst_latency = rows.iter().map(|r| r.p95ms).max().unwrap_or(0);
    let best_latency = rows.iter().map(|r| r.p95ms).min().unwrap_or(0);
    let lowest_uptime = rows.iter().map(|r| r.uptime).fold(f64::INFINITY, f64::min);
    let total_deploys: i64 = rows.iter().map(|r| r.deploys).sum();
    let breach_count = rows.iter().filter(|r| r.error_rate > 0.5 || r.p95ms > 650).count();
    let any_critical = rows.iter().any(|r| r.error_rate >= 1.5);
    let all_stable = rows.iter().all(|r| r.uptime >= 99.0 && r.p95ms < 900);
    let hot: Vec<String> = rows.iter()
        .filter(|r| r.error_rate > 0.5 || r.p95ms > 650)
        .map(|r| r.service.clone())
        .collect();

    let stdout = io::stdout();
    let mut out = BufWriter::new(stdout.lock());
    writeln!(out, "=== SLA SCORECARD ===").unwrap();
    writeln!(out, "Services: {}", rows.len()).unwrap();
    writeln!(out, "Worst p95 ms: {}", worst_latency).unwrap();
    writeln!(out, "Best p95 ms: {}", best_latency).unwrap();
    writeln!(out, "Lowest uptime: {}", jsnum(lowest_uptime)).unwrap();
    writeln!(out, "Total deploys: {}", total_deploys).unwrap();
    writeln!(out, "SLA breaches: {}", breach_count).unwrap();
    writeln!(out, "Any critical errors: {}", bool_text(any_critical)).unwrap();
    writeln!(out, "All services stable: {}", bool_text(all_stable)).unwrap();
    writeln!(out, "Hot services: {}", hot.join(", ")).unwrap();
}
