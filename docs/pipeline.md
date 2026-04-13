# TSN Compilation Pipeline

The simplified compiler turns `.ts` files into native binaries through four stages:

```text
.ts source
  -> module resolution
  -> validation of the strict subset
  -> C code generation
  -> clang + TSN runtime
```

## Stages

### Resolution

`packages/tsn-compiler-core/src/resolver.ts` follows relative imports and TSN stdlib modules, returning source files in dependency order. `.tsx` is rejected up front.

### Validation

`packages/tsn-compiler-core/src/validator.ts` enforces the language subset before code generation. This is where banned features such as `any`, `unknown`, type assertions, `var`, and JSX are rejected.

### Code Generation

`packages/tsn-compiler-core/src/codegen.ts` and its submodules lower the resolved TypeScript program into C. The generated program links only against the TSN runtime and hosted support libraries.

### Native Compilation

`packages/tsn-compiler-core/src/build.ts` writes `build/<name>.c` and invokes clang with the TSN runtime headers plus the hosted support libraries used by the current compiler.

## Entry Behavior

If the user program defines `main`, TSN emits a native `main(argc, argv)` wrapper that installs the crash handler, initializes globals, and calls `ts_main()`.

If the entrypoint is `.tsx`, or if JSX syntax appears inside a `.ts` file, the compiler fails early with `TSX/JSX is not supported in this simplified TSN compiler`.
