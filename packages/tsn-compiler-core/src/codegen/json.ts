import type { StructDef } from './types.js'

export interface JsonEmitterContext {
  jsonParseTargetType: string
  structs: StructDef[]
  arrayTypeName(innerTsType: string): string
}

export function genJsonParser(ctx: JsonEmitterContext): string {
  const inner = ctx.jsonParseTargetType.replace('[]', '')
  const s = ctx.structs.find(x => x.name === inner)
  if (!s) return `/* no struct ${inner} */`
  const arrTypeName = ctx.arrayTypeName(inner)
  const lines: string[] = []
  lines.push(`${arrTypeName} json_parse_${inner}_array(Str input) {`)
  lines.push(`    ${arrTypeName} arr = ${arrTypeName}_new();`)
  lines.push(`    const char *s = input.data;`)
  lines.push(`    int pos = json_skip_ws(s, 0);`)
  lines.push(`    if (s[pos] != '[') return arr;`)
  lines.push(`    pos++;`)
  lines.push(`    while (1) {`)
  lines.push(`        pos = json_skip_ws(s, pos);`)
  lines.push(`        if (s[pos] == ']') break;`)
  lines.push(`        if (s[pos] == ',') { pos++; continue; }`)
  lines.push(`        ${inner} obj; memset(&obj, 0, sizeof(obj));`)
  lines.push(`        if (s[pos] != '{') break;`)
  lines.push(`        pos++;`)
  lines.push(`        while (1) {`)
  lines.push(`            pos = json_skip_ws(s, pos);`)
  lines.push(`            if (s[pos] == '}') { pos++; break; }`)
  lines.push(`            if (s[pos] == ',') { pos++; continue; }`)
  lines.push(`            Str key; pos = json_parse_string(s, pos, &key);`)
  lines.push(`            pos = json_skip_ws(s, pos); pos++;`)
  lines.push(`            pos = json_skip_ws(s, pos);`)
  for (const f of s.fields) {
    const cond = `if (key.len == ${f.name.length} && memcmp(key.data, "${f.name}", ${f.name.length}) == 0)`
    if (f.tsType === 'string') lines.push(`            ${cond} pos = json_parse_string(s, pos, &obj.${f.name});`)
    else if (f.tsType === 'number') lines.push(`            ${cond} pos = json_parse_number(s, pos, &obj.${f.name});`)
    else if (f.tsType === 'boolean') lines.push(`            ${cond} pos = json_parse_bool(s, pos, &obj.${f.name});`)
    lines.push(`            else`)
  }
  lines.push(`            { if (s[pos]=='"'){Str d;pos=json_parse_string(s,pos,&d);}else if(s[pos]=='t'||s[pos]=='f'){bool d;pos=json_parse_bool(s,pos,&d);}else{double d;pos=json_parse_number(s,pos,&d);} }`)
  lines.push(`        }`)
  lines.push(`        ${arrTypeName}_push(&arr, obj);`)
  lines.push(`    }`)
  lines.push(`    return arr;`)
  lines.push(`}`)
  return lines.join('\n')
}
