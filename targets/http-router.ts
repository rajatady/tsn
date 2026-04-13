// ─── Target 2: HTTP Router ──────────────────────────────────────────
// Real-world pattern: define routes, match URLs, parse query strings,
// extract params, build response objects.
// Exercises: string parsing, pattern matching, typed objects.
//
// TSN only — no any, no dynamic access, no eval.

interface Route {
  method: string;
  pattern: string;    // e.g. "/users/:id/posts"
  handler: string;    // handler name (we just print it)
}

interface MatchResult {
  matched: boolean;
  handler: string;
  params: string[];   // parallel arrays since no dynamic keys
  paramValues: string[];
}

interface QueryParam {
  key: string;
  value: string;
}

interface ParsedRequest {
  method: string;
  path: string;
  queryParams: QueryParam[];
}

interface RouteResponse {
  status: number;
  body: string;
  handler: string;
  params: string[];
  paramValues: string[];
  queryParams: QueryParam[];
}

// ─── Query String Parser ────────────────────────────────────────────

function parseOneParam(s: string): QueryParam {
  const eq: number = s.indexOf("=");
  if (eq === -1) {
    const kOnly: QueryParam = { key: s, value: "" };
    return kOnly;
  }
  const result: QueryParam = { key: s.slice(0, eq), value: s.slice(eq + 1) };
  return result;
}

function parseQueryString(qs: string): QueryParam[] {
  const params: QueryParam[] = [];
  if (qs.length === 0) return params;
  for (const segment of qs.split("&")) {
    if (segment.length === 0) continue;
    params.push(parseOneParam(segment));
  }
  return params;
}

// ─── URL Parser ─────────────────────────────────────────────────────

function parseRequest(line: string): ParsedRequest {
  // Format: "GET /users/42/posts?page=2&limit=10"
  const space: number = line.indexOf(" ");
  const method: string = space === -1 ? line : line.slice(0, space);
  const rest: string = space === -1 ? "" : line.slice(space + 1);

  const qmark: number = rest.indexOf("?");
  const path: string = qmark === -1 ? rest : rest.slice(0, qmark);
  const qs: string = qmark === -1 ? "" : rest.slice(qmark + 1);

  const req: ParsedRequest = {
    method: method,
    path: path,
    queryParams: parseQueryString(qs),
  };
  return req;
}

// ─── Route Matching ─────────────────────────────────────────────────

function splitPath(path: string): string[] {
  const all: string[] = path.split("/");
  const parts: string[] = [];
  for (const p of all) {
    if (p.length > 0) parts.push(p);
  }
  return parts;
}

function matchRoute(route: Route, req: ParsedRequest): MatchResult {
  const noMatch: MatchResult = {
    matched: false,
    handler: "",
    params: [],
    paramValues: [],
  };

  if (route.method !== req.method) return noMatch;

  const patternParts: string[] = splitPath(route.pattern);
  const pathParts: string[] = splitPath(req.path);
  if (patternParts.length !== pathParts.length) return noMatch;

  const params: string[] = [];
  const paramValues: string[] = [];

  for (let i: number = 0; i < patternParts.length; i = i + 1) {
    const pp: string = patternParts[i];
    const rp: string = pathParts[i];
    if (pp.slice(0, 1) === ":") {
      params.push(pp.slice(1));
      paramValues.push(rp);
    } else if (pp !== rp) {
      return noMatch;
    }
  }

  const result: MatchResult = {
    matched: true,
    handler: route.handler,
    params: params,
    paramValues: paramValues,
  };
  return result;
}

// ─── Router ─────────────────────────────────────────────────────────

function findRoute(routes: Route[], req: ParsedRequest): RouteResponse {
  for (const route of routes) {
    const result: MatchResult = matchRoute(route, req);
    if (result.matched) {
      const resp: RouteResponse = {
        status: 200,
        body: "OK",
        handler: result.handler,
        params: result.params,
        paramValues: result.paramValues,
        queryParams: req.queryParams,
      };
      return resp;
    }
  }
  const notFound: RouteResponse = {
    status: 404,
    body: "Not Found",
    handler: "none",
    params: [],
    paramValues: [],
    queryParams: [],
  };
  return notFound;
}

function formatResponse(resp: RouteResponse): string {
  let out: string = "HTTP " + String(resp.status) + " | handler: " + resp.handler;

  if (resp.params.length > 0) {
    const pairs: string[] = [];
    for (let i: number = 0; i < resp.params.length; i = i + 1) {
      pairs.push(resp.params[i] + "=" + resp.paramValues[i]);
    }
    out = out + " | params: " + pairs.join(", ");
  }

  if (resp.queryParams.length > 0) {
    const pairs: string[] = resp.queryParams.map(
      (qp: QueryParam): string => qp.key + "=" + qp.value,
    );
    out = out + " | query: " + pairs.join(", ");
  }

  return out;
}

// ─── Main ───────────────────────────────────────────────────────────

function main(): void {
  // Define routes
  const routes: Route[] = [
    { method: "GET", pattern: "/", handler: "home" },
    { method: "GET", pattern: "/users", handler: "listUsers" },
    { method: "GET", pattern: "/users/:id", handler: "getUser" },
    { method: "GET", pattern: "/users/:id/posts", handler: "getUserPosts" },
    { method: "POST", pattern: "/users", handler: "createUser" },
    { method: "GET", pattern: "/users/:id/posts/:postId", handler: "getPost" },
    { method: "GET", pattern: "/search", handler: "search" },
    { method: "GET", pattern: "/api/v1/health", handler: "healthCheck" },
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

  for (const reqLine of requests) {
    const req: ParsedRequest = parseRequest(reqLine);
    const resp: RouteResponse = findRoute(routes, req);
    console.log("REQ: " + reqLine);
    console.log("RES: " + formatResponse(resp));
    console.log("");
  }

  // Benchmark: match many routes
  const total: number = 100000;
  let matched: number = 0;
  for (let k: number = 0; k < total; k = k + 1) {
    const idx: number = k - Math.floor(k / requests.length) * requests.length;
    const req: ParsedRequest = parseRequest(requests[idx]);
    const resp: RouteResponse = findRoute(routes, req);
    if (resp.status === 200) matched = matched + 1;
  }
  console.log("Benchmark: " + String(total) + " route matches, " + String(matched) + " matched");
}

main();
