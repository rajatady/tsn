// Rust port of examples/revenue-rollup.ts — zero-dep, stdlib only.
// Uses ryu-like shortest-round-trip default float formatting, which matches
// JavaScript's String(number) behavior for the values in the fixture.

use std::io::{self, Read, Write, BufWriter};

struct SaleRow {
    region: String,
    revenue: f64,
    cost: f64,
    orders: i64,
}

fn parse_rows(raw: &str) -> Vec<SaleRow> {
    let mut rows = Vec::new();
    for (idx, line) in raw.split('\n').enumerate() {
        if idx == 0 { continue; }
        let line = line.trim();
        if line.is_empty() { continue; }
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() < 4 { continue; }
        let region = parts[0].trim().to_string();
        let revenue: f64 = parts[1].trim().parse().unwrap_or(0.0);
        let cost: f64 = parts[2].trim().parse().unwrap_or(0.0);
        let orders: i64 = parts[3].trim().parse().unwrap_or(0);
        rows.push(SaleRow { region, revenue, cost, orders });
    }
    rows
}

/// Format a float the way JavaScript's String(number) does: shortest
/// round-trip representation, no trailing ".0" for integers.
fn jsnum(v: f64) -> String {
    if v == v.trunc() && v.abs() < 1e21 {
        format!("{}", v as i64)
    } else {
        format!("{}", v)
    }
}

fn main() {
    let mut raw = String::new();
    io::stdin().read_to_string(&mut raw).unwrap();
    let rows = parse_rows(&raw);

    let total_revenue: f64 = rows.iter().map(|r| r.revenue).sum();
    let total_cost: f64 = rows.iter().map(|r| r.cost).sum();
    let total_orders: i64 = rows.iter().map(|r| r.orders).sum();
    let top_revenue: f64 = rows.iter().map(|r| r.revenue).fold(f64::NEG_INFINITY, f64::max);
    let lowest_cost: f64 = rows.iter().map(|r| r.cost).fold(f64::INFINITY, f64::min);
    let high_rev_count = rows.iter().filter(|r| r.revenue >= 120000.0).count();
    let top_region = rows.iter().find(|r| r.revenue == top_revenue).map(|r| r.region.clone()).unwrap_or_default();
    let summary_regions: Vec<String> = rows.iter().filter(|r| r.revenue >= 120000.0).map(|r| r.region.clone()).collect();

    let stdout = io::stdout();
    let mut out = BufWriter::new(stdout.lock());
    writeln!(out, "=== REVENUE ROLLUP ===").unwrap();
    writeln!(out, "Rows: {}", rows.len()).unwrap();
    writeln!(out, "Total revenue: {}", jsnum(total_revenue)).unwrap();
    writeln!(out, "Total cost: {}", jsnum(total_cost)).unwrap();
    writeln!(out, "Gross margin: {}", jsnum(total_revenue - total_cost)).unwrap();
    writeln!(out, "Total orders: {}", total_orders).unwrap();
    writeln!(out, "Highest revenue: {}", jsnum(top_revenue)).unwrap();
    writeln!(out, "Lowest cost: {}", jsnum(lowest_cost)).unwrap();
    writeln!(out, "Top region: {}", top_region).unwrap();
    writeln!(out, "Regions above 120k revenue: {}", high_rev_count).unwrap();
    writeln!(out, "High revenue regions: {}", summary_regions.join(", ")).unwrap();
}
