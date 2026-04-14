/**
 * TSN Doc Extraction Tool
 *
 * Walks TSN source files and extracts structured TSDoc comments into
 * a hierarchical JSON keyed by page → section.
 *
 * Custom TSN tags (beyond standard TSDoc):
 *   @page       — doc page path, e.g. "language/control-flow" or "stdlib/strings"
 *   @section    — section within the page, e.g. "do-while" or "trim"
 *   @syntax     — the TS surface the developer writes
 *   @compilesTo — what C code gets generated
 *   @limitation — known limitation, with "not yet" vs "by design" distinction
 *   @since      — version or PR when the feature was added
 *   @complexity — time/space complexity, e.g. "O(n)"
 *   @zeroAlloc  — whether the operation avoids heap allocation
 *
 * Usage:
 *   npx tsx tools/extract-docs.ts --stdlib              # @tsn/fs, @tsn/http declarations
 *   npx tsx tools/extract-docs.ts --codegen             # codegen source files
 *   npx tsx tools/extract-docs.ts --all                 # everything
 *   npx tsx tools/extract-docs.ts examples/*.ts         # specific files
 */

import * as ts from 'typescript'
import * as fs from 'node:fs'
import * as path from 'node:path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocParam {
  name: string
  type: string
  description: string
  optional: boolean
  defaultValue?: string
}

interface DocReturn {
  type: string
  description: string
}

interface DocEntry {
  kind: 'function' | 'interface' | 'class' | 'method' | 'property' | 'type' | 'variable' | 'feature'
  name: string
  page: string              // e.g. "language/control-flow", "stdlib/fs"
  section: string           // e.g. "do-while", "readFile"
  description: string
  params: DocParam[]
  returns: DocReturn | null
  signature: string
  syntax: string            // @syntax — the TS surface
  compilesTo: string        // @compilesTo — C codegen description
  limitations: string[]     // @limitation — known gaps
  examples: string[]        // @example
  since: string             // @since
  complexity: string        // @complexity
  zeroAlloc: boolean        // @zeroAlloc
  deprecated: boolean
  sourceFile: string
  line: number
}

interface DocPage {
  path: string              // e.g. "language/control-flow"
  sections: Record<string, DocEntry[]>
}

interface DocOutput {
  version: string
  extractedAt: string
  pages: Record<string, DocPage>
}

// ---------------------------------------------------------------------------
// JSDoc extraction helpers
// ---------------------------------------------------------------------------

function getJSDocComment(node: ts.Node): ts.JSDoc | undefined {
  const jsDocs = (node as any).jsDoc as ts.JSDoc[] | undefined
  if (jsDocs && jsDocs.length > 0) return jsDocs[jsDocs.length - 1]
  return undefined
}

function extractDescription(jsDoc: ts.JSDoc): string {
  if (!jsDoc.comment) return ''
  if (typeof jsDoc.comment === 'string') return jsDoc.comment.trim()
  return jsDoc.comment
    .map(c => ('text' in c ? c.text : c.getText()))
    .join('')
    .trim()
}

function tagText(tag: ts.JSDocTag): string {
  if (!tag.comment) return ''
  if (typeof tag.comment === 'string') return tag.comment.trim()
  return tag.comment
    .map(c => ('text' in c ? c.text : c.getText()))
    .join('')
    .trim()
}

function extractTag(jsDoc: ts.JSDoc, name: string): string {
  return jsDoc.tags?.find(t => t.tagName.text === name) ? tagText(jsDoc.tags.find(t => t.tagName.text === name)!) : ''
}

function extractAllOfTag(jsDoc: ts.JSDoc, name: string): string[] {
  if (!jsDoc.tags) return []
  return jsDoc.tags.filter(t => t.tagName.text === name).map(t => tagText(t))
}

function extractParams(jsDoc: ts.JSDoc): Map<string, string> {
  const map = new Map<string, string>()
  if (!jsDoc.tags) return map
  for (const tag of jsDoc.tags) {
    if (ts.isJSDocParameterTag(tag) && tag.name) {
      map.set(tag.name.getText(), tagText(tag))
    }
  }
  return map
}

function isDeprecated(jsDoc: ts.JSDoc): boolean {
  return !!jsDoc.tags?.some(t => t.tagName.text === 'deprecated')
}

// ---------------------------------------------------------------------------
// Signature extraction
// ---------------------------------------------------------------------------

function paramSignature(param: ts.ParameterDeclaration): string {
  const name = param.name.getText()
  const optional = !!param.questionToken || !!param.initializer
  const type = param.type ? param.type.getText() : 'any'
  const defaultVal = param.initializer ? ` = ${param.initializer.getText()}` : ''
  return `${name}${optional && !param.initializer ? '?' : ''}: ${type}${defaultVal}`
}

function functionSignature(node: ts.FunctionDeclaration | ts.MethodDeclaration): string {
  const name = node.name?.getText() ?? 'anonymous'
  const params = node.parameters.map(paramSignature).join(', ')
  const ret = node.type ? node.type.getText() : 'void'
  const async = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) ? 'async ' : ''
  return `${async}function ${name}(${params}): ${ret}`
}

// ---------------------------------------------------------------------------
// Build a DocEntry from a JSDoc + AST node
// ---------------------------------------------------------------------------

function buildEntry(
  kind: DocEntry['kind'],
  name: string,
  jsDoc: ts.JSDoc | undefined,
  sourceFile: ts.SourceFile,
  node: ts.Node,
  overrides: Partial<DocEntry> = {},
): DocEntry {
  const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
  return {
    kind,
    name,
    page: jsDoc ? extractTag(jsDoc, 'page') : '',
    section: jsDoc ? extractTag(jsDoc, 'section') : '',
    description: jsDoc ? extractDescription(jsDoc) : '',
    params: [],
    returns: null,
    signature: '',
    syntax: jsDoc ? extractTag(jsDoc, 'syntax') : '',
    compilesTo: jsDoc ? extractTag(jsDoc, 'compilesTo') : '',
    limitations: jsDoc ? extractAllOfTag(jsDoc, 'limitation') : [],
    examples: jsDoc ? extractAllOfTag(jsDoc, 'example') : [],
    since: jsDoc ? extractTag(jsDoc, 'since') : '',
    complexity: jsDoc ? extractTag(jsDoc, 'complexity') : '',
    zeroAlloc: jsDoc ? !!jsDoc.tags?.some(t => t.tagName.text === 'zeroAlloc') : false,
    deprecated: jsDoc ? isDeprecated(jsDoc) : false,
    sourceFile: sourceFile.fileName,
    line: line + 1,
    ...overrides,
  }
}

function buildFunctionParams(node: ts.FunctionDeclaration | ts.MethodDeclaration, jsDoc?: ts.JSDoc): DocParam[] {
  const paramDocs = jsDoc ? extractParams(jsDoc) : new Map<string, string>()
  return node.parameters.map(p => ({
    name: p.name.getText(),
    type: p.type?.getText() ?? 'any',
    description: paramDocs.get(p.name.getText()) ?? '',
    optional: !!p.questionToken || !!p.initializer,
    defaultValue: p.initializer?.getText(),
  }))
}

// ---------------------------------------------------------------------------
// Node visitors
// ---------------------------------------------------------------------------

function visitFunction(node: ts.FunctionDeclaration, sourceFile: ts.SourceFile): DocEntry | null {
  const name = node.name?.getText()
  if (!name) return null
  const jsDoc = getJSDocComment(node)
  return buildEntry('function', name, jsDoc, sourceFile, node, {
    params: buildFunctionParams(node, jsDoc),
    returns: {
      type: node.type?.getText() ?? 'void',
      description: jsDoc ? extractTag(jsDoc, 'returns') || extractTag(jsDoc, 'return') : '',
    },
    signature: functionSignature(node),
  })
}

function visitInterface(node: ts.InterfaceDeclaration, sourceFile: ts.SourceFile): DocEntry[] {
  const entries: DocEntry[] = []
  const name = node.name.getText()
  const jsDoc = getJSDocComment(node)

  entries.push(buildEntry('interface', name, jsDoc, sourceFile, node, {
    signature: `interface ${name}`,
  }))

  for (const member of node.members) {
    const memberDoc = getJSDocComment(member)
    const memberName = member.name?.getText()
    if (!memberName) continue

    if (ts.isPropertySignature(member)) {
      entries.push(buildEntry('property', `${name}.${memberName}`, memberDoc, sourceFile, member, {
        signature: `${memberName}: ${member.type?.getText() ?? 'unknown'}`,
        returns: { type: member.type?.getText() ?? 'unknown', description: '' },
      }))
    }

    if (ts.isMethodSignature(member)) {
      const paramDocs = memberDoc ? extractParams(memberDoc) : new Map<string, string>()
      entries.push(buildEntry('method', `${name}.${memberName}`, memberDoc, sourceFile, member, {
        params: member.parameters.map(p => ({
          name: p.name.getText(),
          type: p.type?.getText() ?? 'any',
          description: paramDocs.get(p.name.getText()) ?? '',
          optional: !!p.questionToken,
        })),
        returns: {
          type: member.type?.getText() ?? 'void',
          description: memberDoc ? extractTag(memberDoc, 'returns') || extractTag(memberDoc, 'return') : '',
        },
        signature: `${memberName}(${member.parameters.map(paramSignature).join(', ')}): ${member.type?.getText() ?? 'void'}`,
      }))
    }
  }

  return entries
}

function visitClass(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): DocEntry[] {
  const entries: DocEntry[] = []
  const name = node.name?.getText()
  if (!name) return entries
  const jsDoc = getJSDocComment(node)

  entries.push(buildEntry('class', name, jsDoc, sourceFile, node, {
    signature: `class ${name}`,
  }))

  for (const member of node.members) {
    const memberDoc = getJSDocComment(member)
    const memberName = member.name?.getText()

    if (ts.isConstructorDeclaration(member)) {
      entries.push(buildEntry('method', `${name}.constructor`, memberDoc, sourceFile, member, {
        params: buildFunctionParams(member as any, memberDoc),
        signature: `constructor(${member.parameters.map(paramSignature).join(', ')})`,
      }))
      continue
    }

    if (!memberName) continue

    if (ts.isMethodDeclaration(member)) {
      entries.push(buildEntry('method', `${name}.${memberName}`, memberDoc, sourceFile, member, {
        params: buildFunctionParams(member, memberDoc),
        returns: {
          type: member.type?.getText() ?? 'void',
          description: memberDoc ? extractTag(memberDoc, 'returns') || extractTag(memberDoc, 'return') : '',
        },
        signature: functionSignature(member as any),
      }))
    }

    if (ts.isPropertyDeclaration(member)) {
      entries.push(buildEntry('property', `${name}.${memberName}`, memberDoc, sourceFile, member, {
        signature: `${memberName}: ${member.type?.getText() ?? 'unknown'}`,
        returns: { type: member.type?.getText() ?? 'unknown', description: '' },
      }))
    }
  }

  return entries
}

function visitTypeAlias(node: ts.TypeAliasDeclaration, sourceFile: ts.SourceFile): DocEntry | null {
  const name = node.name.getText()
  const jsDoc = getJSDocComment(node)
  return buildEntry('type', name, jsDoc, sourceFile, node, {
    signature: `type ${name} = ${node.type.getText()}`,
  })
}

// ---------------------------------------------------------------------------
// File processing
// ---------------------------------------------------------------------------

function extractFromFile(filePath: string, defaultPage: string): DocEntry[] {
  const source = fs.readFileSync(filePath, 'utf-8')
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

  const entries: DocEntry[] = []

  for (const stmt of sourceFile.statements) {
    if (ts.isFunctionDeclaration(stmt)) {
      const entry = visitFunction(stmt, sourceFile)
      if (entry) {
        if (!entry.page) entry.page = defaultPage
        entries.push(entry)
      }
    }

    if (ts.isInterfaceDeclaration(stmt)) {
      for (const entry of visitInterface(stmt, sourceFile)) {
        if (!entry.page) entry.page = defaultPage
        entries.push(entry)
      }
    }

    if (ts.isClassDeclaration(stmt)) {
      for (const entry of visitClass(stmt, sourceFile)) {
        if (!entry.page) entry.page = defaultPage
        entries.push(entry)
      }
    }

    if (ts.isTypeAliasDeclaration(stmt)) {
      const entry = visitTypeAlias(stmt, sourceFile)
      if (entry) {
        if (!entry.page) entry.page = defaultPage
        entries.push(entry)
      }
    }

    if (ts.isVariableStatement(stmt)) {
      const jsDoc = getJSDocComment(stmt)
      for (const decl of stmt.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue
        const entry = buildEntry('variable', decl.name.text, jsDoc, sourceFile, decl, {
          signature: `const ${decl.name.text}: ${decl.type?.getText() ?? 'unknown'}`,
          returns: { type: decl.type?.getText() ?? 'unknown', description: '' },
        })
        if (!entry.page) entry.page = defaultPage
        entries.push(entry)
      }
    }
  }

  return entries
}

// ---------------------------------------------------------------------------
// Assemble hierarchical output
// ---------------------------------------------------------------------------

function assemblePages(allEntries: DocEntry[]): Record<string, DocPage> {
  const pages: Record<string, DocPage> = {}

  for (const entry of allEntries) {
    const pagePath = entry.page || 'uncategorized'
    if (!pages[pagePath]) {
      pages[pagePath] = { path: pagePath, sections: {} }
    }
    const sectionKey = entry.section || entry.name
    if (!pages[pagePath].sections[sectionKey]) {
      pages[pagePath].sections[sectionKey] = []
    }
    pages[pagePath].sections[sectionKey].push(entry)
  }

  return pages
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const STDLIB_FILES: Array<{ path: string; defaultPage: string }> = [
  { path: 'packages/tsn-fs/src/index.ts', defaultPage: 'stdlib/fs' },
  { path: 'packages/tsn-http/src/index.ts', defaultPage: 'stdlib/http' },
]

const CODEGEN_FILES: Array<{ path: string; defaultPage: string }> = [
  { path: 'packages/tsn-compiler-core/src/codegen/stmt.ts', defaultPage: 'language/control-flow' },
  { path: 'packages/tsn-compiler-core/src/codegen/expr.ts', defaultPage: 'language/operators' },
  { path: 'packages/tsn-compiler-core/src/codegen/types.ts', defaultPage: 'language/types' },
  { path: 'packages/tsn-compiler-core/src/codegen/builtins-strings.ts', defaultPage: 'stdlib/strings' },
  { path: 'packages/tsn-compiler-core/src/codegen/builtins-arrays.ts', defaultPage: 'stdlib/arrays' },
  { path: 'packages/tsn-compiler-core/src/codegen/builtins-hosted.ts', defaultPage: 'stdlib/fs' },
  { path: 'packages/tsn-compiler-core/src/codegen/builtins-map.ts', defaultPage: 'stdlib/collections' },
  { path: 'packages/tsn-compiler-core/src/codegen/builtins-timers.ts', defaultPage: 'stdlib/timers' },
  { path: 'packages/tsn-compiler-core/src/codegen/classes.ts', defaultPage: 'language/classes' },
  { path: 'packages/tsn-compiler-core/src/codegen/functions.ts', defaultPage: 'language/functions' },
  { path: 'packages/tsn-compiler-core/src/codegen/function-emit.ts', defaultPage: 'language/functions' },
  { path: 'packages/tsn-compiler-core/src/codegen/exceptions.ts', defaultPage: 'language/exceptions' },
  { path: 'packages/tsn-compiler-core/src/codegen/async-lowering.ts', defaultPage: 'language/async' },
]

function main(): void {
  const args = process.argv.slice(2)
  const root = process.cwd()
  const allEntries: DocEntry[] = []

  const includeStdlib = args.includes('--stdlib') || args.includes('--all')
  const includeCodegen = args.includes('--codegen') || args.includes('--all')

  if (includeStdlib) {
    for (const f of STDLIB_FILES) {
      const abs = path.resolve(root, f.path)
      if (fs.existsSync(abs)) allEntries.push(...extractFromFile(abs, f.defaultPage))
    }
  }

  if (includeCodegen) {
    for (const f of CODEGEN_FILES) {
      const abs = path.resolve(root, f.path)
      if (fs.existsSync(abs)) allEntries.push(...extractFromFile(abs, f.defaultPage))
    }
  }

  for (const arg of args) {
    if (arg.startsWith('--')) continue
    const abs = path.resolve(root, arg)
    if (!fs.existsSync(abs)) {
      process.stderr.write(`warn: ${arg} not found, skipping\n`)
      continue
    }
    const rel = path.relative(root, abs).replace(/\.ts$/, '')
    allEntries.push(...extractFromFile(abs, rel))
  }

  if (allEntries.length === 0) {
    process.stderr.write('Usage: npx tsx tools/extract-docs.ts [--stdlib] [--codegen] [--all] [files...]\n')
    process.exit(1)
  }

  const output: DocOutput = {
    version: '2.0.0',
    extractedAt: new Date().toISOString(),
    pages: assemblePages(allEntries),
  }

  process.stdout.write(JSON.stringify(output, null, 2) + '\n')
}

main()
