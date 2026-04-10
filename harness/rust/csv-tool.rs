// Rust port of targets/csv-tool.ts — zero-dep, stdlib only.
// Reads CSV from stdin, filters age>30, sorts by score desc, prints top 20.

use std::io::{self, Read, Write, BufWriter};

struct Row {
    name: String,
    age: i64,
    city: String,
    score: i64,
}

fn parse_csv(input: &str) -> Vec<Row> {
    let mut rows = Vec::new();
    for (idx, line) in input.split('\n').enumerate() {
        if idx == 0 || line.is_empty() {
            continue;
        }
        let mut parts = line.splitn(4, ',');
        let name = parts.next().unwrap_or("").to_string();
        let age: i64 = parts.next().unwrap_or("0").parse().unwrap_or(0);
        let city = parts.next().unwrap_or("").to_string();
        let score: i64 = parts.next().unwrap_or("0").parse().unwrap_or(0);
        rows.push(Row { name, age, city, score });
    }
    rows
}

fn main() {
    let mut raw = String::new();
    io::stdin().read_to_string(&mut raw).unwrap();

    let rows = parse_csv(&raw);
    let total = rows.len();

    let mut filtered: Vec<&Row> = rows.iter().filter(|r| r.age > 30).collect();
    let filtered_count = filtered.len();
    filtered.sort_by(|a, b| b.score.cmp(&a.score));

    let stdout = io::stdout();
    let mut out = BufWriter::new(stdout.lock());
    writeln!(out, "name,age,city,score").unwrap();

    let top = 20;
    let mut count = 0usize;
    for r in filtered.iter().take(top) {
        writeln!(out, "{},{},{},{}", r.name, r.age, r.city, r.score).unwrap();
        count += 1;
    }
    writeln!(out).unwrap();
    writeln!(out, "Total rows: {}", total).unwrap();
    writeln!(out, "Filtered (age > 30): {}", filtered_count).unwrap();
    writeln!(out, "Showing top {}", count).unwrap();
}
