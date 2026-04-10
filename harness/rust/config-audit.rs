// Rust port of examples/config-audit.ts — zero-dep, stdlib only.

use std::io::{self, Read, Write, BufWriter};

struct Entry {
    key: String,
    value: String,
}

fn parse_entries(raw: &str) -> Vec<Entry> {
    let mut entries = Vec::new();
    for line in raw.split('\n') {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let eq = match line.find('=') {
            Some(i) => i,
            None => continue,
        };
        let key = line[..eq].trim().to_uppercase();
        let value = line[eq + 1..].trim().to_string();
        entries.push(Entry { key, value });
    }
    entries
}

fn value_for<'a>(entries: &'a [Entry], key: &str) -> &'a str {
    for e in entries {
        if e.key == key {
            return &e.value;
        }
    }
    ""
}

fn first_missing_idx(entries: &[Entry], required: &[&str]) -> i32 {
    for (i, key) in required.iter().enumerate() {
        if value_for(entries, key).is_empty() {
            return i as i32;
        }
    }
    -1
}

fn csv_values(raw: &str) -> Vec<String> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Vec::new();
    }
    let mut out = Vec::new();
    for part in trimmed.split(',') {
        let v = part.trim().to_lowercase();
        if !v.is_empty() {
            out.push(v);
        }
    }
    out
}

fn bool_text(v: bool) -> &'static str { if v { "true" } else { "false" } }

fn main() {
    let mut raw = String::new();
    io::stdin().read_to_string(&mut raw).unwrap();

    let entries = parse_entries(&raw);
    let env = value_for(&entries, "APP_ENV").to_uppercase();
    let feature_flags = csv_values(value_for(&entries, "FEATURE_FLAGS"));
    let origins = csv_values(value_for(&entries, "ALLOWED_ORIGINS"));
    let required = ["APP_ENV", "API_BASE_URL", "ENABLE_AUDIT_LOG", "SESSION_COOKIE_SECURE"];

    let has_all = required.iter().all(|k| !value_for(&entries, k).is_empty());
    let first_miss = first_missing_idx(&entries, &required);
    let audit = value_for(&entries, "ENABLE_AUDIT_LOG").to_lowercase() == "true";
    let secure = value_for(&entries, "SESSION_COOKIE_SECURE").to_lowercase() == "true";
    let risky = feature_flags.iter().any(|f| f.starts_with("alpha") || f.ends_with("_dev") || f.contains("debug"));
    let safe = origins.iter().all(|o| !o.contains("localhost") && !o.contains("127.0.0.1") && !o.starts_with("http://"));

    let stdout = io::stdout();
    let mut out = BufWriter::new(stdout.lock());
    writeln!(out, "=== CONFIG AUDIT ===").unwrap();
    writeln!(out, "Environment: {}", env).unwrap();
    writeln!(out, "Required complete: {}", bool_text(has_all)).unwrap();
    let missing_label = if first_miss == -1 { "none".to_string() } else { required[first_miss as usize].to_string() };
    writeln!(out, "First missing required key: {}", missing_label).unwrap();
    writeln!(out, "Audit logging enabled: {}", bool_text(audit)).unwrap();
    writeln!(out, "Secure cookies enabled: {}", bool_text(secure)).unwrap();
    writeln!(out, "Risky flags present: {}", bool_text(risky)).unwrap();
    writeln!(out, "Origins production-safe: {}", bool_text(safe)).unwrap();
    writeln!(out, "Feature flags: {}", feature_flags.join(", ")).unwrap();
}
