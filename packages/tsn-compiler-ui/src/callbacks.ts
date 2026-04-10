import * as ts from 'typescript'
import type { CodeGenContext } from './types.js'

export class CallbackBridge {
  private wrappedFns = new Set<string>()
  private anonymousCounter = 0

  constructor(private readonly ctx: CodeGenContext) {}

  liftCallback(expr: ts.Node, fnType: string): string {
    if (ts.isIdentifier(expr)) {
      const fnName = expr.text
      if (fnType === 'UIClickFn') return this.wrapForClick(fnName)
      if (fnType === 'UITextChangedFn') return this.wrapForTextChanged(fnName)
      if (fnType === 'UIBoolChangedFn') return this.wrapForBoolChanged(fnName)
      if (fnType === 'UITableCellFn') return this.wrapForCellFn(fnName)
      return fnName
    }

    if (ts.isArrowFunction(expr)) {
      const name = `_jsx_cb_${this.anonymousCounter++}`
      const paramName = expr.parameters.length > 0 ? expr.parameters[0].name.getText() : ''
      const prevType = paramName ? this.ctx.varTypes.get(paramName) : undefined

      let prologue = ''
      if (fnType === 'UIClickFn' && paramName) {
        this.ctx.varTypes.set(paramName, 'number')
        prologue = `    double ${paramName} = (double)_tag;\n`
      }
      if (fnType === 'UITextChangedFn' && paramName) {
        this.ctx.varTypes.set(paramName, 'string')
        prologue = `    Str ${paramName} = str_from(_text, (int)strlen(_text));\n`
      }
      if (fnType === 'UIBoolChangedFn' && paramName) {
        this.ctx.varTypes.set(paramName, 'boolean')
        prologue = `    bool ${paramName} = _on;\n`
      }

      let body: string
      if (ts.isBlock(expr.body)) {
        const stmts: string[] = []
        for (const s of expr.body.statements) {
          if (ts.isExpressionStatement(s)) stmts.push(`    ${this.ctx.emitExpr(s.expression)};`)
        }
        body = stmts.join('\n')
      } else {
        body = `    ${this.ctx.emitExpr(expr.body)};`
      }

      if (prevType) this.ctx.varTypes.set(paramName, prevType)
      else if (paramName) this.ctx.varTypes.delete(paramName)

      if (fnType === 'UIClickFn') {
        this.ctx.lambdas.push(`static void ${name}(int _tag) {\n${prologue}${body}\n}`)
        return name
      }
      if (fnType === 'UITextChangedFn') {
        this.ctx.lambdas.push(`static void ${name}(const char *_text) {\n${prologue}${body}\n}`)
        return name
      }
      if (fnType === 'UIBoolChangedFn') {
        this.ctx.lambdas.push(`static void ${name}(bool _on) {\n${prologue}${body}\n}`)
        return name
      }
    }
    return 'NULL'
  }

  private wrapForClick(fnName: string): string {
    const wrapName = `_wrap_click_${fnName}`
    if (!this.wrappedFns.has(wrapName)) {
      this.wrappedFns.add(wrapName)
      const sig = this.ctx.funcSigs.get(fnName)
      if (sig && sig.params.length >= 1) {
        this.ctx.lambdas.push(
          `static void ${wrapName}(int _tag) {\n` +
          `    ${fnName}((double)_tag);\n` +
          `}`
        )
      } else {
        this.ctx.lambdas.push(
          `static void ${wrapName}(int _tag) {\n` +
          `    ${fnName}();\n` +
          `}`
        )
      }
    }
    return wrapName
  }

  private wrapForTextChanged(fnName: string): string {
    const wrapName = `_wrap_text_${fnName}`
    if (!this.wrappedFns.has(wrapName)) {
      this.wrappedFns.add(wrapName)
      this.ctx.lambdas.push(
        `static void ${wrapName}(const char *_text) {\n` +
        `    ${fnName}(str_from(_text, (int)strlen(_text)));\n` +
        `}`
      )
    }
    return wrapName
  }

  private wrapForBoolChanged(fnName: string): string {
    const wrapName = `_wrap_bool_${fnName}`
    if (!this.wrappedFns.has(wrapName)) {
      this.wrappedFns.add(wrapName)
      const sig = this.ctx.funcSigs.get(fnName)
      if (sig && sig.params.length >= 1) {
        this.ctx.lambdas.push(
          `static void ${wrapName}(bool _on) {\n` +
          `    ${fnName}(_on);\n` +
          `}`
        )
      } else {
        this.ctx.lambdas.push(
          `static void ${wrapName}(bool _on) {\n` +
          `    ${fnName}();\n` +
          `}`
        )
      }
    }
    return wrapName
  }

  private wrapForCellFn(fnName: string): string {
    const wrapName = `_wrap_cell_${fnName}`
    if (!this.wrappedFns.has(wrapName)) {
      this.wrappedFns.add(wrapName)
      this.ctx.lambdas.push(
        `static char _cell_buf[4096];\n` +
        `static const char *${wrapName}(int _row, int _col, void *_ctx) {\n` +
        `    Str _r = ${fnName}((double)_row, (double)_col);\n` +
        `    if (_r.len > 4095) _r.len = 4095;\n` +
        `    memcpy(_cell_buf, _r.data, _r.len);\n` +
        `    _cell_buf[_r.len] = 0;\n` +
        `    return _cell_buf;\n` +
        `}`
      )
    }
    return wrapName
  }
}
