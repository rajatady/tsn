import * as ts from 'typescript'

import { isPromiseTypeName, promiseInnerType } from './async-types.js'
import type { CatchTarget } from './exceptions.js'

// Narrow async lowering v1:
// - async functions compile to Promise<T>-returning functions immediately
// - await unwraps the current promise carrier synchronously
// - rejected promises panic until try/catch lowering exists
//
// Edge cases still intentionally deferred:
// - real suspension/resumption and state machines
// - event loop integration and delayed completion
// - awaiting the same pending promise from multiple sites
// - richer error propagation than "panic on rejected promise"
// - flattening of more complex Promise<Promise<T>> flows beyond basic typing
export interface AsyncLoweringContext {
  exprType(node: ts.Node): string | undefined
  emitExpr(node: ts.Node): string
  tsTypeNameToC(tsType: string, fallback?: string): string
  currentCatchTarget: CatchTarget | null
}

export function isAsyncFunction(node: ts.FunctionLikeDeclarationBase): boolean {
  return !!node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)
}

export function unwrapAwaitType(tsType: string | undefined): string | undefined {
  if (!tsType) return undefined
  return promiseInnerType(tsType) ?? tsType
}

export function emitAwait(
  ctx: AsyncLoweringContext,
  node: ts.AwaitExpression,
): string {
  const promiseTsType = ctx.exprType(node.expression)
  if (!promiseTsType || !isPromiseTypeName(promiseTsType)) {
    // Match the TypeScript/JavaScript mental model for the common value case:
    // awaiting a non-promise is just an immediate value in the current narrow
    // hosted async model.
    return ctx.emitExpr(node.expression)
  }

  const promiseCType = ctx.tsTypeNameToC(promiseTsType ?? 'Promise<void>')
  const innerTsType = unwrapAwaitType(promiseTsType) ?? 'void'

  if (ctx.currentCatchTarget) {
    const awaitedExpr = ctx.emitExpr(node.expression)
    if (innerTsType === 'void') {
      return `({ ${promiseCType} _ts_promise = ${awaitedExpr}; ts_promise_wait(_ts_promise.state); if (${promiseCType}_state(_ts_promise) == TS_PROMISE_REJECTED) { ts_exception_throw(${promiseCType}_error(_ts_promise)); } })`
    }
    return `({ ${promiseCType} _ts_promise = ${awaitedExpr}; ts_promise_wait(_ts_promise.state); if (${promiseCType}_state(_ts_promise) == TS_PROMISE_REJECTED) { ts_exception_throw(${promiseCType}_error(_ts_promise)); } ${promiseCType}_value(_ts_promise); })`
  }

  if (innerTsType === 'void') {
    return `({ TS_AWAIT_VOID(${promiseCType}, ${ctx.emitExpr(node.expression)}); })`
  }

  return `TS_AWAIT(${promiseCType}, ${ctx.emitExpr(node.expression)})`
}

export function wrapAsyncReturn(
  ctx: AsyncLoweringContext,
  functionReturnTsType: string,
  expr: ts.Expression | null,
): string {
  const returnPromiseCType = ctx.tsTypeNameToC(functionReturnTsType, 'void')
  const promisedInnerTsType = unwrapAwaitType(functionReturnTsType) ?? 'void'

  if (!expr) {
    return `${returnPromiseCType}_resolved()`
  }

  const exprTsType = ctx.exprType(expr)
  if (exprTsType === functionReturnTsType) {
    return ctx.emitExpr(expr)
  }

  if (promisedInnerTsType === 'void') {
    return `({ ${ctx.emitExpr(expr)}; ${returnPromiseCType}_resolved(); })`
  }

  return `${returnPromiseCType}_resolved(${ctx.emitExpr(expr)})`
}

export function wrapAsyncThrow(
  ctx: AsyncLoweringContext,
  functionReturnTsType: string,
  errorExpr: string,
): string {
  const returnPromiseCType = ctx.tsTypeNameToC(functionReturnTsType, 'Promise_void')
  return `${returnPromiseCType}_rejected(${errorExpr})`
}
