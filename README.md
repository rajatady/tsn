# TSN — TypeScript Native

Compile TypeScript to native binaries. No JavaScript runtime, no VM, no GC.

```bash
./tsn build app.ts       # → native binary
./tsn run app.ts         # → compile + run
./tsn dev app.tsx         # → watch mode with auto-recompile
```

## Why

You already write strict TypeScript. You set `"strict": true`, ban `any`, enforce explicit return types, and lint away every dynamic escape hatch until your codebase is effectively a statically-typed language.

TSN removes JavaScript from the equation entirely. Your TypeScript compiles straight to machine code — no JS emit, no V8, no runtime. Same syntax, same types, same workflow. The output is a standalone binary with no dependencies.

## Getting Started

```bash
git clone https://github.com/rajatady/tsn.git
cd tsn && npm install

# Compile and run
./tsn run targets/json-pipeline.ts

# Build a standalone binary
./tsn build targets/http-router.ts
./build/http-router

# Debug build — bounds checking, TypeScript-mapped stack traces
./tsn build targets/json-pipeline.ts --debug
```

## What You Can Build

### CLI Tools and Data Pipelines

Same TypeScript you'd write for Node. Parse JSON, process data, transform text — but the output is a static binary.

```typescript
interface Employee {
  name: string
  department: string
  salary: number
  active: boolean
}

function topEarners(employees: Employee[], n: number): Employee[] {
  const active: Employee[] = employees.filter((e: Employee): boolean => e.active)
  active.sort((a: Employee, b: Employee): number => b.salary - a.salary)
  return active.slice(0, n)
}
```

### Native Desktop Apps

Write React-like TSX with Tailwind classes. It compiles to a native macOS app — real AppKit views, not a browser.

```tsx
export function App() {
  return (
    <Window title="Dashboard" width={1200} height={780} dark>
      <HStack className="flex-1 gap-0">
        <Sidebar />
        <VStack className="flex-1 gap-0">
          <Header />
          <MetricsRow />
          <EmployeeTable />
        </VStack>
      </HStack>
    </Window>
  )
}
```

Components, props, `useState`, `useRoute`, `useStore`, search, tables, images, sidebar navigation, routing — all compile to native views.

```tsx
function DashboardHeader() {
  return (
    <HStack className="h-16 px-5 py-4 gap-3 bg-zinc-900">
      <VStack className="gap-0">
        <Text className="text-2xl font-bold">HR Dashboard</Text>
        <Text className="text-xs text-zinc-500">Real-time workforce analytics</Text>
      </VStack>
      <Spacer />
      <Search placeholder="Search employees, roles..." onChange={onSearch} className="w-[280]" />
    </HStack>
  )
}
```

```bash
./tsn build examples/native-gui/dashboard.tsx
./tsn dev examples/native-gui/dashboard.tsx     # watch mode — recompiles on save
```

<!-- TODO: screenshot of running dashboard app -->

### Async I/O

`fetch`, file I/O, timers, and `async/await` work out of the box:

```typescript
import { readFileAsync, writeFileAsync } from "@tsn/fs"
import { fetch, Response } from "@tsn/http"

async function loadData(): Promise<string> {
  const response: Response = await fetch("https://api.example.com/data", {
    headers: { Accept: "application/json" }
  })
  const body: string = await response.text()
  await writeFileAsync("output.json", body)
  return body
}
```

### Bare Metal (upcoming)

An experimental kernel target — VGA text output, keyboard input, serial port, written entirely in TypeScript. Boots from an ISO.

```typescript
function vgaWrite(x: number, y: number, ch: number, fg: number): void {
  const offset: number = (y * TERM_W + x) * 2
  Mem.writeU8(VGA_BASE + offset, ch)
  Mem.writeU8(VGA_BASE + offset + 1, fg)
}

function onKeyPress(): void {
  const scan: number = Cpu.inb(KBD_PORT)
  const ch: string = SCAN_MAP.slice(scan, scan + 1)
  termPutChar(ch)
}
```

<!-- TODO: video — tsnOS booting on bare metal -->

## Developer Experience

**Watch mode** — `./tsn dev app.tsx` watches your files and recompiles on save, relaunching the app automatically.

**Debug builds** — `./tsn build app.ts --debug` enables bounds checking on every array access. Out-of-bounds access shows the array name, file, and line number instead of a segfault.

**TypeScript stack traces** — when something crashes, the stack trace points back to your `.ts` and `.tsx` source lines, not generated code.

**Error overlay** — GUI apps show a red overlay on crash (like Next.js) with the full TypeScript stack trace before exiting.

**Inspector** — query the live view hierarchy of a running native app:

```bash
./tsn inspect tree                    # dump view hierarchy
./tsn inspect find "Engineering"      # find elements by text
./tsn inspect click "Submit"          # click a button
```

## Benchmarks

Median of 5 runs, wall time from invocation to exit. Same TypeScript source runs on all runtimes. Rust is a hand-written equivalent for baseline. Node 24 install is 75 MB, Bun is a 58 MB single binary, TSN binaries are 51-67 KB standalone with no runtime dependencies.

Memory management in the TSN compiler is still being tuned — the numbers below will improve as the ownership model matures.

**CSV Tool** — 1M rows, filter + sort + aggregate:

| Runtime | Time | RSS | Throughput |
|---------|------|----------|------------|
| Node | 2844 ms | 383 MB | 352K rec/s |
| Bun | 469 ms | 244 MB | 2.1M rec/s |
| **TSN** | **301 ms** | **195 MB** | **3.3M rec/s** |
| Rust | 262 ms | 121 MB | 3.8M rec/s |

**Log Triage** — 500K structured log lines, classify + count + rank:

| Runtime | Time | RSS | Throughput |
|---------|------|----------|------------|
| Node | 4408 ms | 1811 MB | 113K rec/s |
| Bun | 1180 ms | 1991 MB | 424K rec/s |
| **TSN** | **582 ms** | **273 MB** | **858K rec/s** |
| Rust | 495 ms | 154 MB | 1.0M rec/s |

**Revenue Rollup** — 500K CSV rows, aggregate by region:

| Runtime | Time | RSS | Throughput |
|---------|------|----------|------------|
| Node | 2714 ms | 328 MB | 184K rec/s |
| Bun | 341 ms | 273 MB | 1.5M rec/s |
| **TSN** | **296 ms** | **87 MB** | **1.7M rec/s** |
| Rust | 218 ms | 58 MB | 2.3M rec/s |

**Config Audit** — 500K key-value config entries, parse + validate:

| Runtime | Time | RSS | Throughput |
|---------|------|----------|------------|
| Node | 2708 ms | 331 MB | 185K rec/s |
| Bun | 411 ms | 305 MB | 1.2M rec/s |
| **TSN** | **300 ms** | **105 MB** | **1.7M rec/s** |
| Rust | 218 ms | 65 MB | 2.3M rec/s |

Run it yourself: `bash harness/bench-cli.sh`

## The Strict Subset

TSN supports everything you use in strict TypeScript: primitives, typed arrays, interfaces, functions with explicit types, `const`/`let`, control flow, template literals, string and array methods (`.map`, `.filter`, `.reduce`, `.sort`, `.split`, `.trim`, `.indexOf`, etc.), `Math.*`, `JSON.parse`, arrow functions, destructuring, classes, `async`/`await`, `try`/`catch`/`finally`, and `for...of`.

What's banned is what you already ban — `any`, `unknown`, type assertions, `eval`, `var`, `delete`, `Proxy`, computed property access, prototype mutation. If your linter already flags these, your code is close to TSN-compatible.

Full spec: [SPEC.md](SPEC.md)

## Project Status

Active experiment. The CLI targets compile to native binaries that produce byte-identical output to Node.js. The native GUI stack is functional on macOS with a growing component catalog and several full example apps. Not a production compiler yet.

## Docs

Language reference, standard library, compilation pipeline, JSX components, native UI framework, and runtime internals are in [docs/](docs/README.md).

## License

[MIT](LICENSE)
