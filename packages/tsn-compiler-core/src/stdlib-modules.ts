import * as path from 'node:path'

export const TSN_STDLIB_MODULES: Record<string, string> = {
  '@tsn/fs': path.resolve(process.cwd(), 'packages/tsn-fs/src/index.ts'),
  '@tsn/http': path.resolve(process.cwd(), 'packages/tsn-http/src/index.ts'),
}

export function isTSNStdlibModule(specifier: string): boolean {
  return Object.prototype.hasOwnProperty.call(TSN_STDLIB_MODULES, specifier)
}

export function resolveTSNStdlibModule(specifier: string): string | null {
  return TSN_STDLIB_MODULES[specifier] ?? null
}
