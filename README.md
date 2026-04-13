# TSN — TypeScript Native

Compile a strict subset of TypeScript to native binaries through C. No JavaScript runtime, no VM, no UI framework layer.

```bash
./tsn build app.ts
./tsn run app.ts
./tsn dev app.ts
```

## What It Is

TSN is focused on plain TypeScript programs: CLI tools, data transforms, hosted async utilities, and experimental systems targets. The simplified compiler intentionally does not support TSX, JSX, Tailwind, or native UI hosts.

## Getting Started

```bash
git clone https://github.com/rajatady/tsn.git
cd tsn
npm install

./tsn run examples/access-log-summary.ts
./tsn build examples/config-audit.ts
./tsn build examples/config-audit.ts --debug
```

## Supported Surface

TSN supports the current strict language subset: numbers, strings, booleans, arrays, interfaces, classes, control flow, template literals, `for...of`, `switch`, nullability, `async`/`await`, and `try`/`catch`/`finally`, along with hosted stdlib modules such as `@tsn/fs` and `@tsn/http`.

TSX/JSX is not supported in the simplified compiler. `.tsx` inputs fail fast with an explicit error.

The language details live in [docs/language.md](docs/language.md), and the compiler/runtime docs live in [docs/](docs/README.md).

## Developer Experience

`./tsn dev app.ts` recompiles and relaunches on save.

`./tsn build app.ts --debug` enables bounds-checking diagnostics and TypeScript-mapped crash traces for supported hosted binaries.

`npm test` runs the compiler unit suite plus the correctness harness for maintained CLI targets.

## Project Status

Active experiment. The current mainline is intentionally centered on the compiler, runtime semantics, and native CLI-style binaries.

## License

[MIT](LICENSE)
