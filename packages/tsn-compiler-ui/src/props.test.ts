import test from 'node:test'
import assert from 'node:assert/strict'
import * as ts from 'typescript'

import { JsxProps } from './props.js'
import type { CodeGenContext } from './types.js'

function makeCtx(): CodeGenContext {
  return {
    jsxStmts: [],
    lambdas: [],
    indent: 0,
    hasJsx: false,
    funcSigs: new Map(),
    pad: () => '',
    pushJsxStmt: () => {},
    emitExpr: () => '""',
    exprType: () => 'string',
    arrayCElemType: () => '',
    getStructFields: () => undefined,
    varTypes: new Map(),
  }
}

function openingElement(sourceText: string): ts.JsxOpeningElement | ts.JsxSelfClosingElement {
  const source = ts.createSourceFile('test.tsx', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let found: ts.JsxOpeningElement | ts.JsxSelfClosingElement | null = null
  function visit(node: ts.Node): void {
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      found = node
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  if (!found) throw new Error('No JSX element found')
  return found
}

test('propStr resolves const string aliases', () => {
  const element = openingElement(`
    function Demo() {
      const cls = "px-4 py-2";
      return <VStack className={cls} />;
    }
  `)
  const props = new JsxProps(makeCtx()).getProps(element)
  assert.equal(new JsxProps(makeCtx()).propStr(props, 'className'), 'px-4 py-2')
})

test('propStr resolves static conditional strings', () => {
  const element = openingElement(`
    function Demo() {
      const active = true;
      return <VStack className={active ? "bg-white" : "bg-black"} />;
    }
  `)
  const util = new JsxProps(makeCtx())
  const props = util.getProps(element)
  assert.equal(util.propStr(props, 'className'), 'bg-white')
  assert.equal(util.isStaticallyResolvableString(props, 'className'), true)
})

test('propStr rejects non-static conditional strings', () => {
  const element = openingElement(`
    function Demo(active: boolean) {
      return <VStack className={active ? "bg-white" : "bg-black"} />;
    }
  `)
  const util = new JsxProps(makeCtx())
  const props = util.getProps(element)
  assert.equal(util.propStr(props, 'className'), '')
  assert.equal(util.isStaticallyResolvableString(props, 'className'), false)
})
