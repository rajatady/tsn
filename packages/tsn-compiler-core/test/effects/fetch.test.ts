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

test('validator allows fetch headers object literals and rejects unsupported header shapes', () => {
  const okMessages = validateMessages(`
function main(): void {
  fetch("http://example.com", {
    method: "POST",
    body: "ping",
    headers: {
      Accept: "application/json",
      "X-Trace": "demo"
    }
  })
}
`)

  assert.equal(okMessages.length, 0)

  const messages = validateMessages(`
function main(): void {
  fetch("http://example.com", { headers: { [String(1)]: "x" } })
}
`)

  assert.ok(messages.some(msg => msg.includes('fetch init headers only support plain string-valued properties')))
})

test('codegen lowers fetch and response.text through resumable async frames', () => {
  const cCode = generateCFromText(`
async function load(): Promise<string> {
  const res: Response = await fetch("http://example.com", {
    headers: {
      Accept: "application/json",
      "X-Trace": "demo"
    }
  })
  return res.statusText + " " + res.header("content-type") + " " + await res.text()
}
`)

  assertIncludesAll(cCode, [
    'DEFINE_PROMISE(Promise_TSFetchResponse, TSFetchResponse)',
    'static inline Promise_TSFetchResponse ts_fetch(Str url, Str method, Str body, Str headers) { Promise_TSFetchResponse _p = Promise_TSFetchResponse_pending(); ts_schedule_fetch(_p.state, url, method, body, headers); return _p; }',
    'static inline Promise_Str ts_response_text(TSFetchResponse response) { return Promise_Str_resolved(str_retain(response.body)); }',
    'static inline Str ts_response_status_text(TSFetchResponse response) { return ts_fetch_status_text(response.status); }',
    'static inline Str ts_response_header(TSFetchResponse response, Str name) { return ts_fetch_header(response, name); }',
    'frame->__await0 = ts_fetch(str_lit("http://example.com"), str_lit("GET"), str_lit(""), ({ STRBUF(_fetch_headers_',
    'frame->res = Promise_TSFetchResponse_value(frame->__await0);',
    'ts_response_status_text(frame->res)',
    'ts_response_header(frame->res, str_lit("content-type"))',
    'TS_AWAIT(Promise_Str, ts_response_text(frame->res))',
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

test('fetch supports request headers plus response statusText and response.header()', async () => {
  await withHttpServerScript(`
    const http = require('node:http');
    const server = http.createServer((req, res) => {
      const trace = req.headers['x-trace'] || '';
      const accept = req.headers['accept'] || '';
      res.writeHead(202, {
        'Content-Type': 'application/json',
        'ETag': 'etag-42',
        'X-Echo-Trace': String(trace),
        'X-Echo-Accept': String(accept)
      });
      res.end('{"ok":true}');
    });
    server.listen(0, '127.0.0.1', () => {
      console.log(server.address().port);
    });
  `, async (baseUrl) => {
    const output = compileAndRunFromText(`
async function main(): Promise<void> {
  const res: Response = await fetch(${JSON.stringify(baseUrl + '/headers')}, {
    headers: {
      Accept: "application/json",
      "X-Trace": "demo-trace"
    }
  })
  const body: string = await res.text()
  console.log(res.status, res.statusText, res.header("etag"), res.header("x-echo-trace"), res.header("x-echo-accept"), body)
}
`)

    assertIncludesAll(output, [
      '202',
      'Accepted',
      'etag-42',
      'demo-trace',
      'application/json',
      '{"ok":true}',
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
