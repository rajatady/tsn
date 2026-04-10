import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

import { assertIncludesAll, compileAndRunFromText, generateCFromText, validateMessages } from '../helpers.js'

async function withHttpServerScript(
  script: string,
  run: (baseUrl: string) => Promise<void> | void,
): Promise<void> {
  const child: ChildProcessWithoutNullStreams = spawn(process.execPath, ['-e', script], {
    stdio: ['ignore', 'pipe', 'inherit'],
  })

  const portLine = await new Promise<string>((resolve, reject) => {
    let buffer = ''
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8')
      const newline = buffer.indexOf('\n')
      if (newline >= 0) {
        child.stdout.off('data', onData)
        resolve(buffer.slice(0, newline).trim())
      }
    }
    child.stdout.on('data', onData)
    child.once('error', reject)
    child.once('exit', (code) => {
      reject(new Error(`test HTTP server exited early with code ${code}`))
    })
  })

  const baseUrl = `http://127.0.0.1:${portLine}`
  try {
    await run(baseUrl)
  } finally {
    child.kill('SIGTERM')
    await once(child, 'exit')
  }
}

test('validator rejects unsupported fetch init shapes', () => {
  const messages = validateMessages(`
function main(): void {
  fetch("http://example.com", { headers: "x" })
}
`)

  assert.ok(messages.some(msg => msg.includes('fetch init property "headers" is not supported yet')))
})

test('codegen lowers fetch and response.text through hosted runtime helpers', () => {
  const cCode = generateCFromText(`
async function load(): Promise<string> {
  const res: Response = await fetch("http://example.com")
  return await res.text()
}
`)

  assertIncludesAll(cCode, [
    'DEFINE_PROMISE(Promise_TSFetchResponse, TSFetchResponse)',
    'static inline Promise_TSFetchResponse ts_fetch(Str url, Str method, Str body) { Promise_TSFetchResponse _p = Promise_TSFetchResponse_pending(); ts_schedule_fetch(_p.state, url, method, body); return _p; }',
    'static inline Promise_Str ts_response_text(TSFetchResponse response) { return Promise_Str_resolved(str_retain(response.body)); }',
    'TSFetchResponse res = TS_AWAIT(Promise_TSFetchResponse, ts_fetch(str_lit("http://example.com"), str_lit("GET"), str_lit("")));',
    'return Promise_Str_resolved(TS_AWAIT(Promise_Str, ts_response_text(res)));',
  ])
})

test('fetch resolves successful responses and response.text() end to end', async () => {
  await withHttpServerScript(`
    const http = require('node:http');
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('hello fetch');
    });
    server.listen(0, '127.0.0.1', () => {
      console.log(server.address().port);
    });
  `, async (baseUrl) => {
    const output = compileAndRunFromText(`
async function main(): Promise<void> {
  const res: Response = await fetch(${JSON.stringify(baseUrl + '/hello')})
  const body: string = await res.text()
  console.log(res.status, res.ok, body)
}
`)

    assertIncludesAll(output, [
      '200',
      'true',
      'hello fetch',
    ])
  })
})

test('fetch resolves non-2xx responses with ok=false instead of rejecting', async () => {
  await withHttpServerScript(`
    const http = require('node:http');
    const server = http.createServer((_req, res) => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('missing');
    });
    server.listen(0, '127.0.0.1', () => {
      console.log(server.address().port);
    });
  `, async (baseUrl) => {
    const output = compileAndRunFromText(`
async function main(): Promise<void> {
  const res: Response = await fetch(${JSON.stringify(baseUrl + '/missing')})
  const body: string = await res.text()
  console.log(res.status, res.ok, body)
}
`)

    assertIncludesAll(output, [
      '404',
      'false',
      'missing',
    ])
  })
})

test('fetch supports narrow method/body init objects', async () => {
  await withHttpServerScript(`
    const http = require('node:http');
    const server = http.createServer((req, res) => {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        res.writeHead(201, { 'Content-Type': 'text/plain' });
        res.end('echo:' + body);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      console.log(server.address().port);
    });
  `, async (baseUrl) => {
    const output = compileAndRunFromText(`
async function main(): Promise<void> {
  const res: Response = await fetch(${JSON.stringify(baseUrl + '/echo')}, {
    method: "POST",
    body: "ping"
  })
  const body: string = await res.text()
  console.log(res.status, res.ok, body)
}
`)

    assertIncludesAll(output, [
      '201',
      'true',
      'echo:ping',
    ])
  })
})

test('fetch transport failures reject and can be caught through await', () => {
  const output = compileAndRunFromText(`
async function main(): Promise<void> {
  try {
    const res: Response = await fetch("http://127.0.0.1:65534/unreachable")
    console.log(String(res.status))
  } catch (err) {
    console.log("caught")
  }
}
`)

  assert.equal(output.trim(), 'caught')
})
