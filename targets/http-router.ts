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
  // Split on &
  let current: string = "";
  let i: number = 0;
  while (i < qs.length) {
    const ch: string = qs.slice(i, i + 1);
    if (ch === "&") {
      if (current.length > 0) {
        const parsed: QueryParam = parseOneParam(current);
        params.push(parsed);
      }
      current = "";
    } else {
      current = current + ch;
    }
    i = i + 1;
  }
  if (current.length > 0) {
    const parsed: QueryParam = parseOneParam(current);
    params.push(parsed);
  }
  return params;
}

function parseOneParam(s: string): QueryParam {
  let key: string = "";
  let value: string = "";
  let foundEq: boolean = false;
  let i: number = 0;
  while (i < s.length) {
    const ch: string = s.slice(i, i + 1);
    if (ch === "=" && !foundEq) {
      foundEq = true;
    } else if (foundEq) {
      value = value + ch;
    } else {
      key = key + ch;
    }
    i = i + 1;
  }
  const result: QueryParam = { key: key, value: value };
  return result;
}

// ─── URL Parser ─────────────────────────────────────────────────────

function parseRequest(line: string): ParsedRequest {
  // Format: "GET /users/42/posts?page=2&limit=10"
  let method: string = "";
  let rest: string = "";
  let foundSpace: boolean = false;
  let i: number = 0;
  while (i < line.length) {
    const ch: string = line.slice(i, i + 1);
    if (ch === " " && !foundSpace) {
      foundSpace = true;
    } else if (!foundSpace) {
      method = method + ch;
    } else {
      rest = rest + ch;
    }
    i = i + 1;
  }

  // Split path and query
  let path: string = "";
  let qs: string = "";
  let foundQ: boolean = false;
  let j: number = 0;
  while (j < rest.length) {
    const ch: string = rest.slice(j, j + 1);
    if (ch === "?" && !foundQ) {
      foundQ = true;
    } else if (foundQ) {
      qs = qs + ch;
    } else {
      path = path + ch;
    }
    j = j + 1;
  }

  const queryParams: QueryParam[] = parseQueryString(qs);
  const req: ParsedRequest = { method: method, path: path, queryParams: queryParams };
  return req;
}

// ─── Route Matching ─────────────────────────────────────────────────

function splitPath(path: string): string[] {
  const parts: string[] = [];
  let current: string = "";
  let i: number = 0;
  while (i < path.length) {
    const ch: string = path.slice(i, i + 1);
    if (ch === "/") {
      if (current.length > 0) {
        parts.push(current);
        current = "";
      }
    } else {
      current = current + ch;
    }
    i = i + 1;
  }
  if (current.length > 0) {
    parts.push(current);
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

  if (route.method !== req.method) {
    return noMatch;
  }

  const patternParts: string[] = splitPath(route.pattern);
  const pathParts: string[] = splitPath(req.path);

  if (patternParts.length !== pathParts.length) {
    return noMatch;
  }

  const params: string[] = [];
  const paramValues: string[] = [];

  let i: number = 0;
  while (i < patternParts.length) {
    const pp: string = patternParts[i];
    const rp: string = pathParts[i];

    if (pp.slice(0, 1) === ":") {
      // This is a parameter segment
      params.push(pp.slice(1));
      paramValues.push(rp);
    } else if (pp !== rp) {
      return noMatch;
    }
    i = i + 1;
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

function findRoute(routes: Route[], req: ParsedRequest): Response {
  let i: number = 0;
  while (i < routes.length) {
    const result: MatchResult = matchRoute(routes[i], req);
    if (result.matched) {
      const resp: Response = {
        status: 200,
        body: "OK",
        handler: result.handler,
        params: result.params,
        paramValues: result.paramValues,
        queryParams: req.queryParams,
      };
      return resp;
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
