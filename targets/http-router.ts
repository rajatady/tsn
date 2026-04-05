// ─── Target 2: HTTP Router ──────────────────────────────────────────
// Real-world pattern: define routes, match URLs, parse query strings,
// extract params, build response objects.
// Exercises: string parsing, pattern matching, typed objects.
//
// StrictTS only — no any, no dynamic access, no eval.

interface Route {
  method: string;
  handler: string;    // handler name (we just print it)
  parts: string[];
  paramNames: string[];
}

interface QueryParam {
  key: string;
  value: string;
}

interface ParsedRequest {
  method: string;
  pathParts: string[];
  queryParams: QueryParam[];
}

interface Response {
  status: number;
  body: string;
  handler: string;
  params: string[];
  paramValues: string[];
  queryParams: QueryParam[];
}

// ─── Query String Parser ────────────────────────────────────────────

function parseQueryString(qs: string): QueryParam[] {
  const params: QueryParam[] = [];
  if (qs.length === 0) {
    return params;
  }
  const pairs: string[] = qs.split("&");
  let i: number = 0;
  while (i < pairs.length) {
    const pair: string = pairs[i];
    if (pair.length > 0) {
      const parsed: QueryParam = parseOneParam(pair);
      params.push(parsed);
    }
    i = i + 1;
  }
  return params;
}

function parseOneParam(s: string): QueryParam {
  const eqIdx: number = s.indexOf("=");
  if (eqIdx < 0) {
    const result: QueryParam = { key: s, value: "" };
    return result;
  }
  const key: string = s.slice(0, eqIdx);
  const value: string = s.slice(eqIdx + 1);
  const result: QueryParam = { key: key, value: value };
  return result;
}

// ─── URL Parser ─────────────────────────────────────────────────────

function parseRequest(line: string): ParsedRequest {
  // Format: "GET /users/42/posts?page=2&limit=10"
  const spaceIdx: number = line.indexOf(" ");
  let method: string = line;
  let rest: string = "";
  if (spaceIdx >= 0) {
    method = line.slice(0, spaceIdx);
    rest = line.slice(spaceIdx + 1);
  }

  // Split path and query
  const queryIdx: number = rest.indexOf("?");
  let path: string = rest;
  let qs: string = "";
  if (queryIdx >= 0) {
    path = rest.slice(0, queryIdx);
    qs = rest.slice(queryIdx + 1);
  }

  const pathParts: string[] = splitPath(path);
  const queryParams: QueryParam[] = parseQueryString(qs);
  const req: ParsedRequest = {
    method: method,
    pathParts: pathParts,
    queryParams: queryParams,
  };
  return req;
}

// ─── Route Matching ─────────────────────────────────────────────────

function splitPath(path: string): string[] {
  const rawParts: string[] = path.split("/");
  const parts: string[] = [];
  let i: number = 0;
  while (i < rawParts.length) {
    const part: string = rawParts[i];
    if (part.length > 0) {
      parts.push(part);
    }
    i = i + 1;
  }
  return parts;
}

function collectParamNames(parts: string[]): string[] {
  const paramNames: string[] = [];
  let i: number = 0;
  while (i < parts.length) {
    const part: string = parts[i];
    if (part.startsWith(":")) {
      paramNames.push(part.slice(1));
    }
    i = i + 1;
  }
  return paramNames;
}

// ─── Router ─────────────────────────────────────────────────────────

function findRoute(routes: Route[], req: ParsedRequest): Response {
  let i: number = 0;
  while (i < routes.length) {
    if (routes[i].method === req.method && routes[i].parts.length === req.pathParts.length) {
      let matched: boolean = true;
      let j: number = 0;
      while (j < routes[i].parts.length) {
        const routePart: string = routes[i].parts[j];
        if (!routePart.startsWith(":") && routePart !== req.pathParts[j]) {
          matched = false;
          break;
        }
        j = j + 1;
      }

      if (matched) {
        const paramValues: string[] = [];
        j = 0;
        while (j < routes[i].parts.length) {
          const routePart: string = routes[i].parts[j];
          if (routePart.startsWith(":")) {
            paramValues.push(req.pathParts[j]);
          }
          j = j + 1;
        }

      const resp: Response = {
        status: 200,
        body: "OK",
        handler: routes[i].handler,
        params: routes[i].paramNames,
        paramValues: paramValues,
        queryParams: req.queryParams,
      };
      return resp;
      }
    }
    i = i + 1;
  }
  const notFound: Response = {
    status: 404,
    body: "Not Found",
    handler: "none",
    params: [],
    paramValues: [],
    queryParams: [],
  };
  return notFound;
}

function formatResponse(resp: Response): string {
  let out: string = "HTTP " + String(resp.status) + " | handler: " + resp.handler;

  if (resp.params.length > 0) {
    out = out + " | params: ";
    let i: number = 0;
    while (i < resp.params.length) {
      if (i > 0) {
        out = out + ", ";
      }
      out = out + resp.params[i] + "=" + resp.paramValues[i];
      i = i + 1;
    }
  }

  if (resp.queryParams.length > 0) {
    out = out + " | query: ";
    let i: number = 0;
    while (i < resp.queryParams.length) {
      if (i > 0) {
        out = out + ", ";
      }
      out = out + resp.queryParams[i].key + "=" + resp.queryParams[i].value;
      i = i + 1;
    }
  }

  return out;
}

// ─── Main ───────────────────────────────────────────────────────────

function main(): void {
  // Define routes
  const routes: Route[] = [
    { method: "GET", handler: "home", parts: splitPath("/"), paramNames: collectParamNames(splitPath("/")) },
    { method: "GET", handler: "listUsers", parts: splitPath("/users"), paramNames: collectParamNames(splitPath("/users")) },
    { method: "GET", handler: "getUser", parts: splitPath("/users/:id"), paramNames: collectParamNames(splitPath("/users/:id")) },
    { method: "GET", handler: "getUserPosts", parts: splitPath("/users/:id/posts"), paramNames: collectParamNames(splitPath("/users/:id/posts")) },
    { method: "POST", handler: "createUser", parts: splitPath("/users"), paramNames: collectParamNames(splitPath("/users")) },
    { method: "GET", handler: "getPost", parts: splitPath("/users/:id/posts/:postId"), paramNames: collectParamNames(splitPath("/users/:id/posts/:postId")) },
    { method: "GET", handler: "search", parts: splitPath("/search"), paramNames: collectParamNames(splitPath("/search")) },
    { method: "GET", handler: "healthCheck", parts: splitPath("/api/v1/health"), paramNames: collectParamNames(splitPath("/api/v1/health")) },
  ];

  // Test requests
  const requests: string[] = [
    "GET /",
    "GET /users",
    "GET /users/42",
    "GET /users/42/posts",
    "GET /users/42/posts/7",
    "POST /users",
    "GET /search?q=hello&page=2&limit=20",
    "GET /api/v1/health",
    "GET /nonexistent",
    "DELETE /users/1",
    "GET /users/99/posts?sort=date&order=desc",
  ];

  console.log("=== HTTP ROUTER TEST ===");
  console.log("");

  let i: number = 0;
  while (i < requests.length) {
    const reqLine: string = requests[i];
    const req: ParsedRequest = parseRequest(reqLine);
    const resp: Response = findRoute(routes, req);
    console.log("REQ: " + reqLine);
    console.log("RES: " + formatResponse(resp));
    console.log("");
    i = i + 1;
  }

  // Benchmark: match many routes
  const total: number = 100000;
  let matched: number = 0;
  let k: number = 0;
  while (k < total) {
    const idx: number = k - Math.floor(k / requests.length) * requests.length;
    const req: ParsedRequest = parseRequest(requests[idx]);
    const resp: Response = findRoute(routes, req);
    if (resp.status === 200) {
      matched = matched + 1;
    }
    k = k + 1;
  }
  console.log("Benchmark: " + String(total) + " route matches, " + String(matched) + " matched");
}

main();
