/*
 * TSN Agent Brief CLI
 *
 * A persistent terminal workflow that keeps local session state across runs.
 * It fetches a remote release brief, keeps an ETag/cache/session log on disk,
 * and prints a compact operator-friendly summary on each invocation.
 */

import { appendFileAsync, readFileAsync, writeFileAsync } from '@tsn/fs'
import { fetch, Response } from '@tsn/http'

const SOURCE_URL = 'https://api.github.com/repos/libuv/libuv/releases/latest'
const CACHE_PATH = 'build/agent-brief-cache.json'
const ETAG_PATH = 'build/agent-brief-etag.txt'
const SESSION_PATH = 'build/agent-brief-session.log'

async function readOptional(path: string): Promise<string> {
  try {
    return await readFileAsync(path)
  } catch (_err) {
    return ''
  }
}

async function appendSession(line: string): Promise<void> {
  await appendFileAsync(SESSION_PATH, line + '\n')
}

function extractJsonStringField(body: string, key: string): string {
  const marker = '"' + key + '":"'
  const start = body.indexOf(marker)
  if (start < 0) return ''
  const from = start + marker.length
  const end = body.indexOf('"', from)
  if (end < 0) return ''
  return body.slice(from, end)
}

function printSection(title: string): void {
  console.log('')
  console.log(title)
  console.log('========================')
}

async function loadBriefBody(): Promise<string> {
  const knownEtag: string = await readOptional(ETAG_PATH)
  let finalStatus = ''
  let resultBody = ''
  let fatalError = ''

  try {
    let response: Response
    if (knownEtag.length > 0) {
      response = await fetch(SOURCE_URL, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'tsn-agent-brief',
          'If-None-Match': knownEtag
        }
      })
    } else {
      response = await fetch(SOURCE_URL, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'tsn-agent-brief'
        }
      })
    }

    const notModified: boolean = response.status === 304
    if (notModified) {
      const cached: string = await readOptional(CACHE_PATH)
      const cacheMissing: boolean = cached.length === 0
      if (cacheMissing) {
        fatalError = 'Remote returned 304 but no local cache exists yet'
      } else {
        finalStatus = 'Remote unchanged (' + response.statusText + ')'
        console.log(finalStatus)
        await appendSession(finalStatus)
        resultBody = cached
      }
    } else {
      const body: string = await response.text()
      await writeFileAsync(CACHE_PATH, body)
      const nextEtag: string = response.header('etag')
      if (nextEtag.length > 0) {
        await writeFileAsync(ETAG_PATH, nextEtag)
      }

      finalStatus = 'Synced ' + response.statusText + ' from GitHub'
      console.log(finalStatus)
      await appendSession(finalStatus)
      resultBody = body
    }
  } catch (err) {
    finalStatus = 'Remote sync failed'
    console.log(finalStatus)
    await appendSession(finalStatus + ' | ' + err)
    const cached: string = await readOptional(CACHE_PATH)
    if (cached.length > 0) {
      console.log('Falling back to cached snapshot')
      resultBody = cached
    } else {
      fatalError = err
    }
  } finally {
    console.log('sync complete')
  }

  if (fatalError.length > 0) {
    throw fatalError
  }

  return resultBody
}

async function main(): Promise<void> {
  printSection('TSN Agent Brief')

  const lastSession: string = await readOptional(SESSION_PATH)
  if (lastSession.length > 0) {
    console.log('Persistent session log found at ' + SESSION_PATH)
  } else {
    console.log('No prior session log yet. Bootstrapping a fresh workspace.')
  }

  const body: string = await loadBriefBody()
  const tagName: string = extractJsonStringField(body, 'tag_name')
  const releaseName: string = extractJsonStringField(body, 'name')
  const publishedAt: string = extractJsonStringField(body, 'published_at')
  const htmlUrl: string = extractJsonStringField(body, 'html_url')

  printSection('Current Brief')
  console.log('Tag: ' + (tagName.length > 0 ? tagName : 'unknown'))
  console.log('Name: ' + (releaseName.length > 0 ? releaseName : 'unknown'))
  console.log('Published: ' + (publishedAt.length > 0 ? publishedAt : 'unknown'))
  console.log('URL: ' + (htmlUrl.length > 0 ? htmlUrl : 'unknown'))

  printSection('Recent Session Tail')
  if (lastSession.length > 0) {
    const trimmed: string = lastSession.trim()
    console.log(trimmed)
  } else {
    console.log('No earlier session entries.')
  }

  await appendSession('brief rendered for ' + (tagName.length > 0 ? tagName : 'unknown'))
}
