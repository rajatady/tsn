export interface FuncSig {
  name: string
  params: Array<{ name: string; tsType: string; cType: string; defaultExpr?: string }>
  returnType: string
  returnCType: string
}
