# TSN — TypeScript Native

Compile a strict subset of TypeScript to native binaries through C. No JavaScript runtime, no VM, no garbage collector.

```bash
./tsn build app.ts
./tsn run app.ts
./tsn dev app.ts
```

## What It Is

TSN takes TypeScript you already know and compiles it to native ARM64 binaries via C. The output is a single static binary with no runtime dependencies.

```typescript
import { readFileAsync } from "@tsn/fs"

const data = await readFileAsync("server.log")
const errors = data.split("\n").filter(
  (line: string): boolean => line.includes("ERROR")
)
console.log("Errors:", errors.length)
```

## Benchmarks

Real CLI workloads. 500K-1M rows. Median of 5 runs. Wall time includes startup.

| Workload | Node | Bun | TSN | Rust |
|----------|------|-----|-----|------|
| CSV Tool (1M rows) | 3063ms / 434MB | 696ms / 254MB | **305ms / 197MB** | 322ms / 132MB |
| Config Audit (500K) | 2604ms / 326MB | 327ms / 254MB | **267ms / 145MB** | 191ms / 65MB |
| Access Log (500K) | 2681ms / 381MB | 361ms / 286MB | **383ms / 152MB** | 241ms / 73MB |
| Log Triage (500K) | 2996ms / 491MB | 665ms / 429MB | **478ms / 222MB** | 488ms / 154MB |
| Revenue Rollup (500K) | 2660ms / 325MB | 337ms / 274MB | **291ms / 99MB** | 220ms / 58MB |
| SLA Scorecard (500K) | 2737ms / 321MB | 352ms / 280MB | **345ms / 131MB** | 246ms / 70MB |

TSN is 6-10x faster than Node, competitive with Bun on speed with half the memory, and within 1-1.5x of hand-tuned Rust. Binary size: 51KB.

## Getting Started

```bash
git clone https://github.com/rajatady/tsn.git
cd tsn
npm install

./tsn run examples/access-log-summary.ts
./tsn build examples/config-audit.ts
./tsn build examples/config-audit.ts --debug
```

## Language

TSN supports: variables (`const`, `let`), functions (with default params), classes, interfaces, arrays, `Map<K,V>`, `Set<T>`, control flow (`if`/`else`, `for`, `for-of`, `while`, `do-while`, `switch`), destructuring (array and object), template literals, nullability (`string | null`, `number | null`), `async`/`await`, `try`/`catch`/`finally`, and hosted stdlib (`@tsn/fs`, `@tsn/http`).

```typescript
// Destructuring + Map + compound assignment
const parts = line.split("|")
const [method, path, status] = parts

const counts = new Map<string, number>()
counts.set(path, (counts.get(path) ?? 0) + 1)

let total: number = 0
total += parseInt(status)
```

Full reference: [docs/language.md](docs/language.md) | Live docs: [rajatady.github.io/tsn](https://rajatady.github.io/tsn/)

## Developer Experience

`./tsn dev app.ts` — recompiles and relaunches on save.

`./tsn build app.ts --debug` — bounds-checking diagnostics and TypeScript-mapped crash traces.

`npm test` — compiler unit suite (154 tests) plus correctness harness for all CLI examples.

## Documentation

Docs are generated from inline source comments and deployed automatically.

- **Live site:** [rajatady.github.io/tsn](https://rajatady.github.io/tsn/)
- **Language reference:** [docs/language.md](docs/language.md)
- **Standard library:** [docs/stdlib.md](docs/stdlib.md)
- **Runtime internals:** [docs/runtime.md](docs/runtime.md)

## Project Status

Active experiment. The compiler, runtime, and native CLI binaries are the focus.

## License

[MIT](LICENSE)
