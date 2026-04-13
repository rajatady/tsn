/**
 * TSN Code Generator v3 — Generate actual C.
 *
 * Type mappings:
 *   number       → double
 *   string       → Str  (16 bytes, by value, zero alloc)
 *   boolean      → bool
 *   JSX.Element  → UIHandle
 *   T[]          → TArr (typed dynamic array via DEFINE_ARRAY macro)
 *   interface T  → struct T
 *   function     → C function
 *
 * String strategy:
 *   - Literals: str_lit("x") — points to .rodata, zero alloc
 *   - Slices: str_slice(s, a, b) — pointer arithmetic, zero alloc
 *   - Char compare: str_at(s, i) == 'x' — zero alloc
 *   - Building: StrBuf on stack, write chars, finish to Str
 *   - Concat for return: strbuf, append pieces, finish
 *
 * console.log strategy:
 *   - Write pieces directly to stdout via print_str/print_num/print_cstr
 *   - No string concatenation at all for output
 */

import * as ts from 'typescript'
import { JsxEmitter } from '../../tsn-compiler-ui/src/jsx.js'
import type { UIHostTarget } from '../../tsn-compiler-ui/src/host_target.js'
import type { CodeGenContext, FuncSig } from '../../tsn-compiler-ui/src/types.js'
import {
  emitClassDeclaration as emitClassDeclarationFor,
  ensureMonomorphized as ensureMonomorphizedFor,
  monomorphizeName as monomorphizeNameFor,
  parseAndEmitClass as parseAndEmitClassFor,
} from './codegen/classes.js'
import {
  emitPredicateCallback as emitPredicateCallbackFor,
  getStructFields as getStructFieldsFor,
  nextTempId as nextTempIdFor,
  pushJsxStmt as pushJsxStmtFor,
  withStmtSink as withStmtSinkFor,
} from './codegen/context.js'
import {
  emitBinary as emitBinaryFor,
  emitCall as emitCallFor,
  emitObjLit as emitObjLitFor,
  emitPropAccess as emitPropAccessFor,
  emitTemplate as emitTemplateFor,
  extractCharSlice as extractCharSliceFor,
} from './codegen/expr.js'
import {
  emitAwait as emitAwaitFor,
  wrapAsyncThrow as wrapAsyncThrowFor,
  wrapAsyncReturn as wrapAsyncReturnFor,
} from './codegen/async-lowering.js'
import type { CatchTarget } from './codegen/exceptions.js'
import {
  describeParameter as describeParameterFor,
  inferFunctionReturnType as inferFunctionReturnTypeFor,
} from './codegen/functions.js'
import { emitFunction as emitFunctionFor } from './codegen/function-emit.js'
import {
  emitInterface as emitInterfaceFor,
  exprType as exprTypeFor,
  inferVarTsType as inferVarTsTypeFor,
  inferVarType as inferVarTypeFor,
  unwrapParens as unwrapParensFor,
} from './codegen/inference.js'
import {
  detectBuilders as detectBuildersFor,
  emitScopeCleanup as emitScopeCleanupFor,
  flattenBuilderConcat as flattenBuilderConcatFor,
  getReleaseForType as getReleaseForTypeFor,
  isBuilderConcat as isBuilderConcatFor,
} from './codegen/lifetime.js'
import { genJsonParser as genJsonParserFor } from './codegen/json.js'
import { runCompilationPasses } from './codegen/passes.js'
import { assembleProgram } from './codegen/program.js'
import { emitBlock as emitBlockFor, emitStmt as emitStmtFor, emitVarDecl as emitVarDeclFor } from './codegen/stmt.js'
import { isSkippableStatement, sourceLineDirective } from './codegen/top-level.js'
import { HookRegistry } from './hooks.js'
import {
  arrayCElemType as arrayCElemTypeFor,
  arrayTypeName as arrayTypeNameFor,
  zeroValueForTsType as zeroValueForTsTypeFor,
  tsTypeName as tsTypeNameFor,
  tsTypeNameToC as tsTypeNameToCFor,
  tsTypeToC as tsTypeToCFor,
  type ClassDef,
  type ParamAlias,
  type ParamInfo,
  type StructDef,
} from './codegen/types.js'
import { registerPromiseType as registerPromiseTypeFor } from './codegen/async-types.js'

class CodeGen {
  // TODO: Collapse this coordinator into a smaller driver/context surface once the
  // current module split and behavior-stabilization pass are finished.
  private structs: StructDef[] = []
  private functions: string[] = []
  funcSigs: Map<string, FuncSig> = new Map()
  lambdas: string[] = []
  private lambdaCounter = 0
  varTypes: Map<string, string> = new Map()
  indent = 0
  private needsJsonParser = false
  private jsonParseTargetType = ''
  private arrayTypes: Set<string> = new Set()  // track which array types we need
  private promiseTypes: Map<string, string> = new Map()
  // Track variables that are being built with StrBuf in current scope
  private builderVars: Set<string> = new Set()
  private funcLocalVars: Map<string, string> = new Map()
  private funcTopLevelVars: Set<string> = new Set()
  private funcDeclaredSoFar: Set<string> = new Set()  // tracks declaration order for return cleanup
  activeTryFrames: string[] = []
  currentFunctionReturnTsType: string | null = null
  currentFunctionIsAsync = false
  currentCatchTarget: CatchTarget | null = null
  private identifierAliases: Map<string, string> = new Map()
  private hooks: HookRegistry
  private jsxBootStmts: string[] = []
  // JSX support
  jsxStmts: string[] = []    // accumulated C statements from JSX emission
  jsxGlobals: string[] = []  // global variable declarations for JSX mode
  hasJsx = false              // track if source uses JSX (for includes/linking)
  uiHostTarget: UIHostTarget
  private jsxEmitter: JsxEmitter
  private activeStmtSink: string[] | null = null
  // Source mapping
  private sourceFile: ts.SourceFile | null = null
  private sourceFileName = ''
  // Class support
  private classDefs: Map<string, ClassDef> = new Map()
  private classTemplates: Map<string, ts.ClassDeclaration> = new Map()
  private currentClass: string | null = null

  constructor(uiHostTarget: UIHostTarget) {
    this.uiHostTarget = uiHostTarget
    this.jsxEmitter = new JsxEmitter(this as CodeGenContext)
    this.hooks = new HookRegistry({
      tsTypeNameToC: (tsType: string, fallback = 'double') => this.tsTypeNameToC(tsType, fallback),
      arrayTypeName: (innerTsType: string) => this.arrayTypeName(innerTsType),
      exprType: (node: ts.Node) => this.exprType(node),
      emitExpr: (node: ts.Node) => this.emitExpr(node),
      getReleaseForType: (varName: string, tsType: string) => this.getReleaseForType(varName, tsType),
      varTypes: this.varTypes,
      identifierAliases: this.identifierAliases,
    })
  }

  // ─── Type Resolution ────────────────────────────────────────────

  private tsTypeNameToC(tsType: string, fallback = 'double'): string {
    return tsTypeNameToCFor(
      tsType,
      {
        arrayTypes: this.arrayTypes,
        promiseTypes: this.promiseTypes,
        hasClassType: (name: string) => this.classDefs.has(name),
      },
      fallback,
    )
  }

  private tsTypeToC(typeNode: ts.TypeNode | undefined, fallback = 'double'): string {
    return tsTypeToCFor(
      typeNode,
      {
        arrayTypes: this.arrayTypes,
        promiseTypes: this.promiseTypes,
        hasClassType: (name: string) => this.classDefs.has(name),
      },
      fallback,
    )
  }

  private tsTypeName(typeNode: ts.TypeNode | undefined): string {
    return tsTypeNameFor(typeNode)
  }

  arrayTypeName(innerTsType: string): string {
    return arrayTypeNameFor(innerTsType, this.arrayTypes)
  }

  arrayCElemType(tsType: string): string {
    return arrayCElemTypeFor(tsType)
  }

  pushJsxStmt(line: string): void {
    pushJsxStmtFor(this.activeStmtSink, this.jsxStmts, line)
  }

  getStructFields(name: string): Array<{ name: string; tsType: string; cType: string }> | undefined {
    return getStructFieldsFor(this.structs, name)
  }

  private withStmtSink<T>(sink: string[], fn: () => T): T {
    return withStmtSinkFor(this, sink, fn)
  }

  nextTempId(): number {
    return nextTempIdFor(this)
  }

  registerPromiseType(valueCType: string): string {
    return registerPromiseTypeFor({ promiseTypes: this.promiseTypes }, valueCType)
  }

  zeroValueForTsType(tsType: string): string {
    return zeroValueForTsTypeFor(tsType, {
      arrayTypes: this.arrayTypes,
      promiseTypes: this.promiseTypes,
      hasClassType: (name: string) => this.classDefs.has(name),
    })
  }

  emitPredicateCallback(fnExpr: ts.Expression, paramType: string): { paramName: string; body: string } | null {
    return emitPredicateCallbackFor(fnExpr, paramType, {
      emitExpr: (node: ts.Node) => this.emitExpr(node),
      varTypes: this.varTypes,
    })
  }

  private inferFunctionReturnType(node: ts.FunctionDeclaration): { tsType: string; cType: string } {
    return inferFunctionReturnTypeFor(this, node)
  }

  private describeParameter(p: ts.ParameterDeclaration, index: number): ParamInfo {
    return describeParameterFor(this, p, index)
  }

  /** Infer C type from a variable declaration's initializer */
  private inferVarType(d: ts.VariableDeclaration): string {
    return inferVarTypeFor(this, d)
  }

  /** Infer TypeScript type name from a variable declaration's initializer */
  private inferVarTsType(d: ts.VariableDeclaration): string {
    return inferVarTsTypeFor(this, d)
  }

  private unwrapParens<T extends ts.Node>(node: T): ts.Node {
    return unwrapParensFor(node)
  }

  // ─── Struct Generation ──────────────────────────────────────────

  private emitInterface(node: ts.InterfaceDeclaration): void {
    emitInterfaceFor(this, node)
  }

  // ─── Expression Generation ──────────────────────────────────────

  emitExpr(node: ts.Node): string {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return `str_lit(${JSON.stringify(node.text)})`

    if (ts.isNumericLiteral(node)) return node.text

    if (node.kind === ts.SyntaxKind.TrueKeyword) return 'true'
    if (node.kind === ts.SyntaxKind.FalseKeyword) return 'false'
    if (node.kind === ts.SyntaxKind.NullKeyword) {
      if (this.currentFunctionReturnTsType) return this.zeroValueForTsType(this.currentFunctionReturnTsType)
      return '0'
    }

    if (ts.isIdentifier(node)) {
      if (node.text === 'undefined') {
        if (this.currentFunctionReturnTsType) return this.zeroValueForTsType(this.currentFunctionReturnTsType)
        return '0'
      }
      // If this var is a builder, emit a zero-alloc view of the builder content
      if (this.builderVars.has(node.text)) {
        return `strbuf_to_str(&_b_${node.text})`
      }
      const alias = this.identifierAliases.get(node.text)
      if (alias) return alias
      return node.text
    }

    if (ts.isParenthesizedExpression(node))
      return `(${this.emitExpr(node.expression)})`

    if (ts.isPropertyAccessExpression(node) || ts.isPropertyAccessChain(node))
      return emitPropAccessFor(this, node)

    if (ts.isElementAccessExpression(node)) {
      const arr = this.emitExpr(node.expression)
      const arrName = node.expression.getText()
      const idx = this.emitExpr(node.argumentExpression)
      const sl = this.sourceFile ? this.sourceFile.getLineAndCharacterOfPosition(node.getStart()) : null
      const file = this.sourceFileName || 'unknown'
      const line = sl ? sl.line + 1 : 0
      return `ARRAY_GET(${arr}, ${idx}, "${arrName}", "${file}", ${line})`
    }

    if (ts.isCallExpression(node))
      return emitCallFor(this, node)

    if (ts.isAwaitExpression(node))
      return emitAwaitFor(this, node)

    if (ts.isBinaryExpression(node))
      return emitBinaryFor(this, node)

    if (ts.isPrefixUnaryExpression(node)) {
      const op = node.operator === ts.SyntaxKind.ExclamationToken ? '!' :
                 node.operator === ts.SyntaxKind.MinusToken ? '-' : '+'
      return `${op}${this.emitExpr(node.operand)}`
    }

    if (ts.isConditionalExpression(node))
      return `(${this.emitExpr(node.condition)} ? ${this.emitExpr(node.whenTrue)} : ${this.emitExpr(node.whenFalse)})`

    if (ts.isObjectLiteralExpression(node))
      return this.emitObjLit(node)

    if (ts.isTemplateExpression(node))
      return this.emitTemplate(node)

    if (ts.isArrowFunction(node))
      return `_lambda_${this.lambdaCounter++}`

    // Class instantiation: new VGA(), new Ring<number>(8, 0)
    if (ts.isNewExpression(node)) {
      let typeName = node.expression.getText()
      // Generic: new Ring<number>(8, 0) → monomorphize
      if (node.typeArguments && node.typeArguments.length > 0) {
        const typeArg = this.tsTypeName(node.typeArguments[0])
        typeName = this.ensureMonomorphized(typeName, typeArg)
      }
      const args = node.arguments
        ? node.arguments.map(a => this.emitExpr(a)).join(', ')
        : ''
      return `${typeName}_new(${args})`
    }

    // `this` inside a class method → dereference self pointer
    if (node.kind === ts.SyntaxKind.ThisKeyword && this.currentClass)
      return '(*self)'

    // Empty array literal [] in expression context
    if (ts.isArrayLiteralExpression(node) && node.elements.length === 0)
      return `StrArr_new()` // default to StrArr; will be overridden by var decl context

    // JSX support — delegated to JsxEmitter
    if (ts.isJsxElement(node))
      return this.jsxEmitter.emitElement(node.openingElement, node.children)
    if (ts.isJsxSelfClosingElement(node))
      return this.jsxEmitter.emitElement(node, [])
    if (ts.isJsxExpression(node) && node.expression)
      return this.emitExpr(node.expression)
    if (ts.isJsxFragment(node))
      return this.jsxEmitter.emitFragment(node.children)

    return `/* UNSUPPORTED: ${ts.SyntaxKind[node.kind]} */0`
  }

  private extractCharSlice(node: ts.Node): { str: string; idx: string } | null {
    return extractCharSliceFor(this, node)
  }

  private emitObjLit(node: ts.ObjectLiteralExpression, targetStructName?: string): string {
    return emitObjLitFor(this, node, targetStructName)
  }

  private emitTemplate(node: ts.TemplateExpression): string {
    return emitTemplateFor(this, node)
  }

  // ─── Type Inference ─────────────────────────────────────────────

  exprType(node: ts.Node): string | undefined {
    return exprTypeFor(this, node)
  }

  wrapAsyncReturn(expr: ts.Expression | null): string {
    return wrapAsyncReturnFor(this, this.currentFunctionReturnTsType ?? 'Promise<void>', expr)
  }

  wrapAsyncThrow(errorExpr: string): string {
    return wrapAsyncThrowFor(this, this.currentFunctionReturnTsType ?? 'Promise<void>', errorExpr)
  }

  // ─── Statement Generation ───────────────────────────────────────

  private emitStmt(node: ts.Node, out: string[]): void {
    emitStmtFor(this, node, out)
  }

  private emitBlock(node: ts.Node, out: string[]): void {
    emitBlockFor(this, node, out)
  }

  private emitVarDecl(decl: ts.VariableDeclaration, out: string[]): void {
    emitVarDeclFor(this, decl, out)
  }

  // ─── String Builder Detection ─────────────────────────────────

  private detectBuilders(block: ts.Block): string[] {
    return detectBuildersFor(this, block)
  }

  // ─── Scope Cleanup (lifetime analysis) ──────────────────────────
  //
  // At the end of each loop iteration, free variables that hold heap data.
  // This is static lifetime analysis — we KNOW these vars die at scope exit.

  private emitScopeCleanup(varsBefore: Set<string>, out: string[], block?: ts.Block): void {
    emitScopeCleanupFor(this, varsBefore, out, block)
  }

  // Generate rc_release calls for a variable based on its type.
  // With refcounting, shared arrays are safe — release decrements rc,
  // only frees when rc hits 0.
  private getReleaseForType(varName: string, tsType: string): string[] {
    return getReleaseForTypeFor(this, varName, tsType)
  }

  // Check if a binary expression is a concat chain starting with the builder var
  private isBuilderConcat(node: ts.BinaryExpression, varName: string): boolean {
    return isBuilderConcatFor(node, varName)
  }

  // Flatten str + a + b + c into [a, b, c] (skip the leading var reference)
  private flattenBuilderConcat(node: ts.BinaryExpression, varName: string, pieces: ts.Node[]): void {
    flattenBuilderConcatFor(node, varName, pieces)
  }

  // ─── Function Generation ────────────────────────────────────────

  private emitFunction(node: ts.FunctionDeclaration): void {
    emitFunctionFor(this, node)
  }

  // ─── JSON Parser Generator ─────────────────────────────────────

  private genJsonParser(): string {
    return genJsonParserFor(this)
  }

  // ─── Helpers ────────────────────────────────────────────────────

  pad(): string { return '    '.repeat(this.indent) }

  /** Emit a #line directive mapping C back to TypeScript source */
  srcLine(node: ts.Node): string {
    return sourceLineDirective(this.sourceFile, this.sourceFileName, node)
  }

  /** Check if a statement should be skipped (import/export/require) */
  private isSkippable(s: ts.Statement): boolean {
    return isSkippableStatement(s)
  }

  // ─── Class Support ───────────────────────────────────────────────

  private monomorphizeName(baseName: string, typeArg: string): string {
    return monomorphizeNameFor(this, baseName, typeArg)
  }

  private ensureMonomorphized(baseName: string, typeArg: string): string {
    return ensureMonomorphizedFor(this, baseName, typeArg)
  }

  private emitClassDeclaration(node: ts.ClassDeclaration): void {
    emitClassDeclarationFor(this, node)
  }

  private parseAndEmitClass(
    node: ts.ClassDeclaration,
    emitName: string,
    typeArgs: Map<string, string>
  ): void {
    parseAndEmitClassFor(this, node, emitName, typeArgs)
  }

  // ─── Main Entry ─────────────────────────────────────────────────

  generate(sourceFiles: ts.SourceFile[]): string {
    const { entryFile, hasTopLevelJsx } = runCompilationPasses(this, sourceFiles)
    return assembleProgram(this, sourceFiles, entryFile, hasTopLevelJsx)
  }
}

export function generateC(sourceFiles: ts.SourceFile[], name: string, uiHostTarget: UIHostTarget): string {
  return new CodeGen(uiHostTarget).generate(sourceFiles)
}

/** Backward-compatible single-file entry point */
export function generateCSingle(sf: ts.SourceFile, name: string, uiHostTarget: UIHostTarget): string {
  return new CodeGen(uiHostTarget).generate([sf])
}
