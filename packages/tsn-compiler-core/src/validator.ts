/**
 * TSN Validator
 *
 * Walks the AST and rejects any banned features.
 * This is the "strict subset" enforcer.
 */

import * as ts from 'typescript'
import { isTSNStdlibModule } from './stdlib-modules.js'

export interface ValidationError {
  pos: number
  message: string
}

export function validate(sourceFile: ts.SourceFile): ValidationError[] {
  const errors: ValidationError[] = []

  function visitWithoutNestedFunctions(node: ts.Node, fn: (child: ts.Node) => void): void {
    const visit = (child: ts.Node): void => {
      if (
        ts.isFunctionDeclaration(child) ||
        ts.isFunctionExpression(child) ||
        ts.isArrowFunction(child) ||
        ts.isMethodDeclaration(child)
      ) {
        return
      }
      fn(child)
      ts.forEachChild(child, visit)
    }
    ts.forEachChild(node, visit)
  }

  function reportFinallyControlFlow(block: ts.Block | undefined, label: string, allowThrow = false): void {
    if (!block) return
    visitWithoutNestedFunctions(block, child => {
      if (ts.isReturnStatement(child)) {
        errors.push({
          pos: child.getStart(),
          message: `finally currently does not support return inside ${label}`,
        })
      } else if (ts.isBreakStatement(child)) {
        errors.push({
          pos: child.getStart(),
          message: `finally currently does not support break inside ${label}`,
        })
      } else if (ts.isContinueStatement(child)) {
        errors.push({
          pos: child.getStart(),
          message: `finally currently does not support continue inside ${label}`,
        })
      } else if (!allowThrow && ts.isThrowStatement(child)) {
        errors.push({
          pos: child.getStart(),
          message: `finally currently does not support throw inside ${label}`,
        })
      }
    })
  }

  function isInsideAsyncFunction(node: ts.Node): boolean {
    let current: ts.Node | undefined = node.parent
    while (current) {
      if (
        (ts.isFunctionDeclaration(current) || ts.isFunctionExpression(current) || ts.isArrowFunction(current) || ts.isMethodDeclaration(current)) &&
        current.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)
      ) {
        return true
      }
      current = current.parent
    }
    return false
  }

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

    // Narrow async v1 only supports async function declarations.
    if (ts.isArrowFunction(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)) {
      errors.push({ pos: node.getStart(), message: 'async arrow functions are not supported yet' })
    }
    if (ts.isFunctionExpression(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)) {
      errors.push({ pos: node.getStart(), message: 'async function expressions are not supported yet' })
    }
    if (ts.isMethodDeclaration(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword)) {
      errors.push({ pos: node.getStart(), message: 'async class/object methods are not supported yet' })
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'Promise') {
      errors.push({ pos: node.getStart(), message: '"new Promise(...)" is not supported yet — use async functions and hosted async APIs' })
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      (node.expression.text === 'setTimeout' || node.expression.text === 'setInterval')
    ) {
      const callback = node.arguments[0]
      if (!callback) {
        errors.push({ pos: node.getStart(), message: `${node.expression.text} requires a callback` })
      } else if (ts.isArrowFunction(callback)) {
        if (callback.parameters.length > 0) {
          errors.push({ pos: callback.getStart(), message: `${node.expression.text} arrow callbacks must not declare parameters` })
        }
      } else if (!ts.isIdentifier(callback)) {
        errors.push({
          pos: callback.getStart(),
          message: `${node.expression.text} callbacks must be function identifiers or zero-argument arrow functions`,
        })
      }
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'fetch') {
      if (node.arguments.length < 1 || node.arguments.length > 2) {
        errors.push({ pos: node.getStart(), message: 'fetch currently supports fetch(url) or fetch(url, { method, body, headers })' })
      }
      const init = node.arguments[1]
      if (init && !ts.isObjectLiteralExpression(init)) {
        errors.push({ pos: init.getStart(), message: 'fetch init must be an object literal for now' })
      }
      if (init && ts.isObjectLiteralExpression(init)) {
        for (const prop of init.properties) {
          if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name)) {
            errors.push({ pos: prop.getStart(), message: 'fetch init only supports plain method/body/headers properties' })
            continue
          }
          if (prop.name.text === 'headers') {
            if (!ts.isObjectLiteralExpression(prop.initializer)) {
              errors.push({ pos: prop.initializer.getStart(), message: 'fetch init headers must be an object literal for now' })
              continue
            }
            for (const headerProp of prop.initializer.properties) {
              if (
                !ts.isPropertyAssignment(headerProp) ||
                (!ts.isIdentifier(headerProp.name) && !ts.isStringLiteral(headerProp.name))
              ) {
                errors.push({
                  pos: headerProp.getStart(),
                  message: 'fetch init headers only support plain string-valued properties',
                })
              }
            }
            continue
          }
          if (prop.name.text !== 'method' && prop.name.text !== 'body') {
            errors.push({ pos: prop.name.getStart(), message: `fetch init property "${prop.name.text}" is not supported yet` })
          }
        }
      }
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

    if (ts.isAwaitExpression(node) && !isInsideAsyncFunction(node)) {
      errors.push({ pos: node.getStart(), message: '"await" is only supported inside async functions' })
    }

    // Async functions are supported in the current narrow lowering path.
    // For now, explicit async return annotations must be Promise<T>.
    if (ts.isFunctionDeclaration(node) && node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.AsyncKeyword) && node.type) {
      if (!ts.isTypeReferenceNode(node.type) || node.type.typeName.getText() !== 'Promise') {
        errors.push({ pos: node.type.getStart(), message: 'async functions must return Promise<T>' })
      }
    }

    if (ts.isTryStatement(node)) {
      if (!node.catchClause) {
        errors.push({ pos: node.getStart(), message: 'try statements must include a catch block' })
      }
      if (node.finallyBlock) {
        reportFinallyControlFlow(node.tryBlock, 'try blocks when finally is present', true)
        reportFinallyControlFlow(node.catchClause?.block, 'catch blocks when finally is present', false)
        reportFinallyControlFlow(node.finallyBlock, 'finally blocks', false)
      }
    }

    // Classes: now supported via codegen

    // Ban: bare module imports (non-relative)
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const spec = node.moduleSpecifier.text
      if (!spec.startsWith('.') && !isTSNStdlibModule(spec) && spec !== 'module') {
        errors.push({ pos: node.getStart(), message: `Cannot import "${spec}" — only relative imports (./path) and TSN stdlib imports are supported` })
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return errors
}
