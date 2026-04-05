#!/usr/bin/env python3
"""
SQLite + TypeScript Extension Benchmark

Loads a fuzzy scoring function compiled from TypeScript into SQLite,
creates a 100K row table, and benchmarks fuzzy search queries.

This is IMPOSSIBLE with Bun, Node, or any JS runtime.
"""

try:
    import pysqlite3 as sqlite3
except ImportError:
    import sqlite3
import time
import os

DB = ":memory:"
DYLIB = os.path.join(os.path.dirname(__file__), "../../build/fuzzy_score.dylib")
ROWS = 100_000

names = ['Alice Smith', 'Bob Jones', 'Charlie Brown', 'Diana Davis',
         'Eve Wilson', 'Frank Moore', 'Grace Taylor', 'Hank Clark',
         'Ivy Hall', 'Jack Lee']
cities = ['New York', 'London', 'Tokyo', 'Berlin', 'Sydney']

def main():
    conn = sqlite3.connect(DB)
    conn.enable_load_extension(True)

    # Load the TypeScript-compiled extension
    try:
        conn.load_extension(DYLIB.replace('.dylib', ''))
        print(f"✓ Loaded TypeScript extension: {os.path.basename(DYLIB)} ({os.path.getsize(DYLIB) // 1024} KB)")
    except Exception as e:
        print(f"✗ Failed to load extension: {e}")
        print(f"  Path: {DYLIB}")
        print(f"  Exists: {os.path.exists(DYLIB)}")
        return

    # Create and populate table
    conn.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, city TEXT)")

    t0 = time.time()
    rows = []
    for i in range(ROWS):
        name = names[i % len(names)]
        city = cities[i % len(cities)]
        rows.append((name, f"user{i}@example.com", city))
    conn.executemany("INSERT INTO users (name, email, city) VALUES (?, ?, ?)", rows)
    conn.commit()
    insert_ms = (time.time() - t0) * 1000
    print(f"✓ Inserted {ROWS:,} rows in {insert_ms:.0f} ms")
    print()

    # Test the function works
    result = conn.execute("SELECT fuzzy_score('Alice Smith', 'ali')").fetchone()
    print(f"  fuzzy_score('Alice Smith', 'ali') = {result[0]}")
    result = conn.execute("SELECT fuzzy_score('Bob Jones', 'ali')").fetchone()
    print(f"  fuzzy_score('Bob Jones', 'ali')   = {result[0]}")
    result = conn.execute("SELECT fuzzy_score('Frank Moore', 'frank m')").fetchone()
    print(f"  fuzzy_score('Frank Moore', 'frank m') = {result[0]}")
    print()

    # Benchmark: fuzzy search across all rows
    print(f"=== Benchmark: fuzzy_score on {ROWS:,} rows ===")
    print()

    queries = [
        ("ali", "Short query"),
        ("frank m", "Multi-word query"),
        ("charlie brown", "Full name query"),
    ]

    for query, desc in queries:
        # Warm up
        conn.execute(f"SELECT COUNT(*) FROM users WHERE fuzzy_score(name, ?) > 0", (query,)).fetchone()

        # Benchmark
        t0 = time.time()
        ITERATIONS = 5
        for _ in range(ITERATIONS):
            result = conn.execute(
                "SELECT name, city, fuzzy_score(name, ?) as score "
                "FROM users WHERE fuzzy_score(name, ?) > 0 "
                "ORDER BY score DESC LIMIT 5",
                (query, query)
            ).fetchall()
        elapsed = (time.time() - t0) / ITERATIONS * 1000

        print(f"  Query: '{query}' ({desc})")
        print(f"    Time: {elapsed:.1f} ms per query")
        print(f"    Top match: {result[0][0]} (score: {result[0][2]})")
        print(f"    Throughput: {ROWS / elapsed * 1000:.0f} rows/sec")
        print()

    # Compare: same operation in pure Python
    print("=== Comparison: Pure Python fuzzy search ===")
    print()

    all_rows = conn.execute("SELECT name, city FROM users").fetchall()

    def py_fuzzy_score(text, query):
        score = 0
        qi = 0
        consecutive = 0
        for i, tc in enumerate(text):
            if qi >= len(query): break
            if tc.lower() == query[qi].lower():
                score += 10
                consecutive += 1
                if consecutive > 1: score += consecutive * 5
                if i == 0: score += 25
                if i > 0 and text[i-1] in ' _-.': score += 20
                qi += 1
            else:
                consecutive = 0
        if qi < len(query): return 0
        if len(text) > 0: score += round(100 * len(query) / len(text))
        return score

    for query, desc in queries:
        t0 = time.time()
        ITERATIONS = 5
        for _ in range(ITERATIONS):
            results = [(name, city, py_fuzzy_score(name, query))
                       for name, city in all_rows]
            results = [r for r in results if r[2] > 0]
            results.sort(key=lambda x: -x[2])
            top5 = results[:5]
        elapsed = (time.time() - t0) / ITERATIONS * 1000

        print(f"  Query: '{query}' ({desc})")
        print(f"    Time: {elapsed:.1f} ms per query")
        print(f"    Top match: {top5[0][0]} (score: {top5[0][2]})")
        print(f"    Throughput: {ROWS / elapsed * 1000:.0f} rows/sec")
        print()

    conn.close()

if __name__ == "__main__":
    main()
