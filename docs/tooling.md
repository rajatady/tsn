# TSN Tooling

TSN exposes a small CLI surface in the simplified compiler:

```bash
./tsn build app.ts
./tsn build app.ts --debug
./tsn dev app.ts
./tsn run app.ts
```

## Build

`./tsn build app.ts` resolves imports, validates the strict subset, emits C, and invokes clang.

## Debug Builds

`./tsn build app.ts --debug` keeps debug symbols and enables runtime bounds-checking diagnostics. Crash traces are mapped back to TypeScript source lines for supported hosted binaries.

## Watch Mode

`./tsn dev app.ts` watches the resolved `.ts` dependency set, recompiles on change, and relaunches the binary.

## Testing

```bash
npm test
bash harness/correctness.sh
```

`npm test` runs the compiler unit suite plus the maintained correctness harness.
