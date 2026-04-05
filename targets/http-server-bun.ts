interface Route {
  method: string
  handler: string
  parts: string[]
  paramNames: string[]
}

interface QueryParam {
  key: string
  value: string
}

const routes: Route[] = [
  makeRoute("GET", "/", "home"),
  makeRoute("GET", "/users", "listUsers"),
  makeRoute("GET", "/users/:id", "getUser"),
  makeRoute("GET", "/users/:id/posts", "getUserPosts"),
  makeRoute("POST", "/users", "createUser"),
  makeRoute("GET", "/users/:id/posts/:postId", "getPost"),
  makeRoute("GET", "/search", "search"),
  makeRoute("GET", "/api/v1/health", "healthCheck"),
]

function splitPath(path: string): string[] {
  return path.split("/").filter(Boolean)
}

function makeRoute(method: string, path: string, handler: string): Route {
  const parts = splitPath(path)
  return {
    method,
    handler,
    parts,
    paramNames: parts.filter(part => part.startsWith(":")).map(part => part.slice(1)),
  }
}

function parseQuery(search: string): QueryParam[] {
  const query = search.startsWith("?") ? search.slice(1) : search
  if (query.length === 0) return []
  return query
    .split("&")
    .filter(Boolean)
    .map(pair => {
      const eq = pair.indexOf("=")
      return eq < 0
        ? { key: pair, value: "" }
        : { key: pair.slice(0, eq), value: pair.slice(eq + 1) }
    })
}

function formatResponse(status: number, handler: string, paramNames: string[], paramValues: string[], queryParams: QueryParam[]): string {
  let out = `HTTP ${status} | handler: ${handler}`
  if (paramNames.length > 0) {
    out += " | params: "
    out += paramNames.map((name, index) => `${name}=${paramValues[index]}`).join(", ")
  }
  if (queryParams.length > 0) {
    out += " | query: "
    out += queryParams.map(param => `${param.key}=${param.value}`).join(", ")
  }
  return out
}

function routeRequest(method: string, pathname: string, search: string): { status: number; body: string } {
  const parts = splitPath(pathname)
  const queryParams = parseQuery(search)

  for (const route of routes) {
    if (route.method !== method) continue
    if (route.parts.length !== parts.length) continue

    const paramValues: string[] = []
    let matched = true
    for (let i = 0; i < route.parts.length; i++) {
      const pattern = route.parts[i]
      const value = parts[i]
      if (pattern.startsWith(":")) {
        paramValues.push(value)
      } else if (pattern !== value) {
        matched = false
        break
      }
    }
    if (matched) {
      return { status: 200, body: formatResponse(200, route.handler, route.paramNames, paramValues, queryParams) }
    }
  }

  return { status: 404, body: "HTTP 404 | handler: none" }
}

const port = Number(process.env.HTTP_SERVER_PORT || "3000")

Bun.serve({
  port,
  reusePort: true,
  fetch(req) {
    const url = new URL(req.url)
    const routed = routeRequest(req.method, url.pathname, url.search)
    return new Response(routed.body, {
      status: routed.status,
      headers: { "content-type": "text/plain" },
    })
  },
})

console.log(`bun-http-server listening on ${port}`)
