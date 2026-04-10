// Compatibility shim: legacy compiler/stdlib type surface forwarding to package codegen builtins.
export type {
  BuiltinEmitterContext,
  StdlibEmitterContext,
} from '../../packages/tsn-compiler-core/src/codegen/shared.js'
