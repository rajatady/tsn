export interface AsyncTypeResolutionContext {
  promiseTypes: Map<string, string>
}

// Promise type naming is intentionally tiny in v1:
// - Promise<T> is treated as an opaque carrier type for async lowering.
// - Nested Promise<Promise<T>> is not normalized yet; if we allow it later,
//   lowering should flatten it before codegen so runtime types do not explode.
// - Promise<void> needs a dedicated runtime shape because C cannot store a
//   "void value" field inside a struct.
// - Pointer/value sanitization must stay stable, otherwise generated promise
//   typedef names will drift and break incremental refactors/tests.
export function isPromiseTypeName(tsType: string): boolean {
  return tsType.startsWith('Promise<') && tsType.endsWith('>')
}

export function promiseInnerType(tsType: string): string | null {
  if (!isPromiseTypeName(tsType)) return null
  return tsType.slice('Promise<'.length, -1)
}

export function promiseTypeName(valueCType: string): string {
  const sanitized = valueCType
    .replace(/\s+/g, '_')
    .replace(/\*/g, 'ptr')
    .replace(/[^\w]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `Promise_${sanitized || 'void'}`
}

export function registerPromiseType(
  ctx: AsyncTypeResolutionContext,
  valueCType: string,
): string {
  // Edge cases to keep in mind as async grows:
  // - reference-counted payloads like Str / StrArr / future class pointers
  //   will eventually need retain/release rules on resolve/reject paths
  // - different source-level Promise<T> spellings that map to the same C type
  //   should still dedupe to one runtime shape
  // - future async networking/timer APIs must reuse these registrations instead
  //   of inventing parallel promise-type tracking in other modules
  const name = promiseTypeName(valueCType)
  if (!ctx.promiseTypes.has(name)) ctx.promiseTypes.set(name, valueCType)
  return name
}
