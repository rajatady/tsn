export interface Response {
  status: number
  statusText: string
  ok: boolean
  body: string
  header(name: string): string
  text(): Promise<string>
}

export declare function fetch(
  url: string,
  init?: { method?: string, body?: string, headers?: { [name: string]: string } }
): Promise<Response>
