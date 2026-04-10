import * as ts from 'typescript'

export function sourceLineDirective(
  sourceFile: ts.SourceFile | null,
  sourceFileName: string,
  node: ts.Node,
): string {
  if (!sourceFile) return ''
  const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart())
  return `#line ${pos.line + 1} "${sourceFileName}"\n`
}

export function isSkippableStatement(statement: ts.Statement): boolean {
  if (ts.isImportDeclaration(statement)) return true
  if (ts.isExportDeclaration(statement)) return true
  if (ts.isVariableStatement(statement) && statement.getText().includes('require')) return true
  return false
}
