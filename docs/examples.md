# Examples

## CLI Targets

Located in `targets/`. Each compiles to a native binary that produces identical output to Node.js/Bun.

### json-pipeline.ts

Processes 100K JSON records: parse, filter, sort, aggregate by city.

```bash
strictts run targets/json-pipeline.ts < harness/test-data/large-dataset.json
```

Demonstrates: JSON.parse with typed interfaces, array.filter, array.sort, struct fields, string comparison.

### http-router.ts

Route matching engine with query string parsing, 100K iterations.

```bash
strictts run targets/http-router.ts
```

Demonstrates: string.slice, string.indexOf, while loops, struct construction, pattern matching.

### markdown-parser.ts

Markdown-to-HTML converter processing 235KB input.

```bash
strictts run targets/markdown-parser.ts < harness/test-data/sample.md
```

Demonstrates: StrBuf optimization (string builder detection in loops), char-by-char parsing, string concatenation.

### csv-tool.ts

1M row CSV processing.

```bash
strictts run targets/csv-tool.ts
```

## Native GUI: HR Dashboard

Located in `examples/native-gui/dashboard.tsx`. A full interactive macOS application written in 100% TypeScript.

### What It Does

- Generates 50,000 employee records using a PRNG
- Displays in a native NSTableView with 7 columns
- Sidebar with department filters (click to filter)
- Search field with fuzzy matching
- KPI stat cards (total, active, avg salary, performance, departments)
- Status bar

### Architecture

```
dashboard.tsx
    │
    ├── Data Model: interface Employee { name, department, role, salary, performance, status }
    │
    ├── Lookup Functions: firstName(i), lastName(i), deptName(i), roleName(i), statusName(i)
    │   (chains of if-statements, workaround for no array literals)
    │
    ├── PRNG: nextRand(seed), randIndex(seed, max)
    │   (modulo-based, avoids bitwise AND on doubles)
    │
    ├── Data Generation: makeEmployee(seed) → Employee, generateEmployees(n) → Employee[]
    │
    ├── Global State: employees, searchText, deptFilterIdx, filteredCount
    │
    ├── Filtering: matchesFilter(e), countFiltered(), nthFilteredEmployee(n)
    │   (no mutable index array — scans on demand)
    │
    ├── Fuzzy Search: fuzzyScore(text, query) with consecutive bonus
    │
    ├── Table Cell Callback: tableCellFn(row, col) → string
    │
    ├── Event Handlers: onSearch(text), onDeptClick(tag)
    │   (update state → applyFilters → refreshTable)
    │
    └── JSX: Window → HStack → [Sidebar, VStack → [Header, Stats, Table, StatusBar]]
```

### Key Patterns

**No closures** — callbacks take parameters:
```typescript
function onDeptClick(tag: number): void {
  deptFilterIdx = tag
  applyFilters()
  const show = filteredCount > 500 ? 500 : filteredCount
  refreshTable(show)
}
```

**Explicit type annotations** on variables used by functions:
```typescript
const emp: Employee = makeEmployee(s)   // not just: const emp = makeEmployee(s)
const tc: string = text.slice(i, i + 1) // not just: const tc = text.slice(...)
```

**`declare function` for compiler-generated functions:**
```typescript
declare function refreshTable(rows: number): void
```

**Semicolon before JSX:**
```typescript
initFilters();   // semicolon required before <Window>
```

### Compiling and Running

```bash
# Build optimized
strictts build examples/native-gui/dashboard.tsx
./build/dashboard

# Build debug (bounds checking + source maps)
strictts build examples/native-gui/dashboard.tsx --debug

# Watch mode
strictts dev examples/native-gui/dashboard.tsx
```

### Binary Size

| Mode | Size |
|------|------|
| Release (-O2) | ~130 KB |
| Debug (-O0 -g) | ~180 KB |

No framework overhead. No JS engine. No Electron.

## Correctness Tests

```bash
bash harness/correctness.sh
```

Runs each CLI target with Node.js, Bun, and the native binary. Diffs output against expected results. All three must produce identical output.
