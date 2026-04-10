import { useStore } from '../../../packages/tsn-ui/src/react'

const CACHE_PATH = 'build/ops-brief-cache.json'
const SOURCE_URL = 'https://api.github.com/repos/libuv/libuv/releases/latest'
let pollTimerId = 0

function setBriefStatus(next: string): void {
  const [_status, setStatus] = useStore<string>('ops-brief:status', 'Idle. Load cache or refresh from GitHub.')
  setStatus(next)
}

function setBriefPayload(next: string): void {
  const [_payload, setPayload] = useStore<string>('ops-brief:payload', 'No snapshot loaded yet.')
  setPayload(next)
}

function setBriefError(next: string): void {
  const [_error, setError] = useStore<string>('ops-brief:error', '')
  setError(next)
}

function setBriefBusy(next: boolean): void {
  const [_busy, setBusy] = useStore<boolean>('ops-brief:busy', false)
  setBusy(next)
}

function setBriefPolling(next: boolean): void {
  const [_polling, setPolling] = useStore<boolean>('ops-brief:polling', false)
  setPolling(next)
}

function getBriefEtag(): string {
  const [etag, _setEtag] = useStore<string>('ops-brief:etag', '')
  return etag
}

function setBriefEtag(next: string): void {
  const [_etag, setEtag] = useStore<string>('ops-brief:etag', '')
  setEtag(next)
}

export function loadOpsBriefCache(): void {
  const _work = loadOpsBriefCacheAsync()
}

async function loadOpsBriefCacheAsync(): Promise<void> {
  setBriefBusy(true)
  setBriefError('')
  try {
    const cached: string = await readFileAsync(CACHE_PATH)
    setBriefPayload(cached)
    setBriefStatus('Loaded cached snapshot')
  } catch (err) {
    setBriefError(err)
    setBriefStatus('No cached snapshot available yet')
  } finally {
    setBriefBusy(false)
  }
}

export function refreshOpsBrief(): void {
  const _work = refreshOpsBriefAsync()
}

export function pollOpsBriefTick(): void {
  const _work = refreshOpsBriefAsync()
}

async function refreshOpsBriefAsync(): Promise<void> {
  let fallbackPayload: string = ''
  setBriefBusy(true)
  setBriefError('')
  setBriefStatus('Syncing release brief from GitHub...')

  try {
    const etag: string = getBriefEtag()
    let response: Response
    if (etag.length > 0) {
      response = await fetch(SOURCE_URL, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'tsn-ops-brief',
          'If-None-Match': etag
        }
      })
    } else {
      response = await fetch(SOURCE_URL, {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'tsn-ops-brief'
        }
      })
    }

    if (response.status === 304) {
      setBriefStatus('Up to date (' + response.statusText + ')')
    } else {
      const body: string = await response.text()
      await writeFileAsync(CACHE_PATH, body)
      const nextEtag: string = response.header('etag')
      if (nextEtag.length > 0) {
        setBriefEtag(nextEtag)
      }
      setBriefPayload(body)
      setBriefStatus('Synced ' + response.statusText + ' from GitHub')
    }
  } catch (err) {
    setBriefError(err)
    setBriefStatus('Network failed. Falling back to cache...')
    try {
      fallbackPayload = await readFileAsync(CACHE_PATH)
      setBriefPayload(fallbackPayload)
      setBriefStatus('Showing cached snapshot after network failure')
    } catch (cacheErr) {
      setBriefPayload('No cached snapshot available yet.')
      setBriefError(err + ' | cache: ' + cacheErr)
      setBriefStatus('No cache available after network failure')
    }
  } finally {
    setBriefBusy(false)
  }
}

export function startOpsBriefPolling(): void {
  if (pollTimerId !== 0) {
    setBriefStatus('Polling is already running')
    return
  }
  pollTimerId = setInterval(pollOpsBriefTick, 15000)
  setBriefPolling(true)
  setBriefStatus('Polling every 15 seconds')
  const _work = refreshOpsBriefAsync()
}

export function stopOpsBriefPolling(): void {
  if (pollTimerId !== 0) {
    clearInterval(pollTimerId)
    pollTimerId = 0
  }
  setBriefPolling(false)
  setBriefStatus('Polling paused')
}
