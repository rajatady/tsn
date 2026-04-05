/**
 * StrictTS Validator
 *
 * Walks the AST and rejects any banned features.
 * This is the "strict subset" enforcer.
 */

import * as ts from 'typescript'

export interface ValidationError {
  pos: number
  message: string
}

export function validate(sourceFile: ts.SourceFile): ValidationError[] {
  const errors: ValidationError[] = []

  function visit(node: ts.Node): void {
    // Ban: `any` type
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      errors.push({ pos: node.getStart(), message: 'Type "any" is banned — every value must have a known type' })
    }

    // Ban: `unknown` type
    if (node.kind === ts.SyntaxKind.UnknownKeyword) {
      errors.push({ pos: node.getStart(), message: 'Type "unknown" is banned' })
    }

    // Ban: type assertions (as)
    if (ts.isAsExpression(node)) {
      errors.push({ pos: node.getStart(), message: 'Type assertions ("as") are banned — they lie to the compiler' })
    }

    // Ban: non-null assertion (!)
    if (ts.isNonNullExpression(node)) {
      errors.push({ pos: node.getStart(), message: 'Non-null assertions (!) are banned' })
    }

    // Ban: eval()
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'eval') {
      errors.push({ pos: node.getStart(), message: '"eval" is banned — no runtime code generation' })
    }

    // Ban: new Function()
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Function') {
      errors.push({ pos: node.getStart(), message: '"new Function()" is banned' })
    }

    // Ban: delete operator
    if (ts.isDeleteExpression(node)) {
      errors.push({ pos: node.getStart(), message: '"delete" is banned — objects cannot change shape' })
    }

    // Ban: typeof in expressions (runtime type checking)
    if (ts.isTypeOfExpression(node)) {
      errors.push({ pos: node.getStart(), message: '"typeof" is banned — no runtime type info in native code' })
    }

    // Ban: var declarations
    if (ts.isVariableDeclarationList(node) && (node.flags & ts.NodeFlags.Let) === 0 && (node.flags & ts.NodeFlags.Const) === 0) {
      errors.push({ pos: node.getStart(), message: '"var" is banned — use "let" or "const"' })
    }

    // Ban: arbitrary array destructuring. The only supported tuple destructuring
    // shape right now is React-style hooks like const [state, setState] = useState(...)
    if (ts.isVariableDeclaration(node) && ts.isArrayBindingPattern(node.name)) {
      const ok =
        !!node.initializer &&
        ts.isCallExpression(node.initializer) &&
        ts.isIdentifier(node.initializer.expression) &&
        (node.initializer.expression.text === 'useState' || node.initializer.expression.text === 'useRoute' || node.initializer.expression.text === 'useStore')
      if (!ok) {
        errors.push({
          pos: node.getStart(),
          message: 'Array destructuring is only supported for hooks like const [state, setState] = useState(...)',
        })
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'useStore'
    ) {
      const key = node.arguments[0]
      if (!key || !ts.isStringLiteral(key)) {
        errors.push({
          pos: node.getStart(),
          message: 'useStore(key, initial) requires a string literal key',
        })
      }
    }

    // Ban: computed property access with non-literal key
    if (ts.isElementAccessExpression(node)) {
      const arg = node.argumentExpression
      // Allow: arr[0], arr[i] where i is a number variable
      // The codegen will handle these as array indexing
      // Ban: obj[someStringVar] — dynamic key lookup
      // For now, allow all element access and let codegen handle typing
    }

    // Ban: Proxy, Reflect
    if (ts.isIdentifier(node)) {
      if (node.text === 'Proxy' || node.text === 'Reflect') {
        errors.push({ pos: node.getStart(), message: `"${node.text}" is banned — no metaprogramming` })
      }
    }

    // Ban: with statement
    if (node.kind === ts.SyntaxKind.WithStatement) {
      errors.push({ pos: node.getStart(), message: '"with" is banned — dynamic scoping' })
    }

    // Ban: yield / generators
    if (node.kind === ts.SyntaxKind.YieldExpression) {
      errors.push({ pos: node.getStart(), message: 'Generators are banned (future work)' })
    }

    // Ban: await / async
    if (node.kind === ts.SyntaxKind.AwaitExpression) {
      errors.push({ pos: node.getStart(), message: 'async/await is banned (future work)' })
    }

    // Ban: try/catch
    if (node.kind === ts.SyntaxKind.TryStatement) {
      errors.push({ pos: node.getStart(), message: 'try/catch is banned (future work)' })
    }

    // Ban: class declarations (for now)
    if (ts.isClassDeclaration(node)) {
      errors.push({ pos: node.getStart(), message: 'Classes are banned (future work) — use interfaces + functions' })
    }

    // Ban: bare module imports (non-relative)
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text
      if (!spec.startsWith('.')) {
        errors.push({ pos: node.getStart(), message: `Cannot import "${spec}" — only relative imports (./path) are supported` })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  // Filter out errors from import statements (we handle those specially)
  return errors.filter(e => {
    const lineText = sourceFile.text.substring(
      sourceFile.getLineAndCharacterOfPosition(e.pos).character === 0
        ? e.pos
        : sourceFile.text.lastIndexOf('\n', e.pos) + 1,
      sourceFile.text.indexOf('\n', e.pos)
    )
    return !lineText.trimStart().startsWith('import')
  })
}
