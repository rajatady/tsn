// ─── Target 3: Markdown Parser ──────────────────────────────────────
// Real-world pattern: parse markdown text into HTML.
// Supports: headers, bold, italic, links, inline code, code blocks, paragraphs.
// Exercises: state machine, string manipulation, output generation.
//
// TSN only — no any, no dynamic access, no eval, no regex.

interface Token {
  type: string;   // "h1"-"h6", "paragraph", "code_block", "blank"
  content: string;
}

// ─── Tokenizer (line-level) ─────────────────────────────────────────

function countLeadingHashes(line: string): number {
  let count: number = 0;
  while (count < line.length && count < 6) {
    if (line.slice(count, count + 1) === "#") {
      count = count + 1;
    } else {
      break;
    }
  }
  // Must be followed by a space
  if (count > 0 && count < line.length && line.slice(count, count + 1) === " ") {
    return count;
  }
  return 0;
}

function tokenizeLines(input: string): Token[] {
  const tokens: Token[] = [];
  let current: string = "";
  let inCodeBlock: boolean = false;
  let codeContent: string = "";
  let i: number = 0;

  // Split into lines manually
  const lines: string[] = [];
  while (i < input.length) {
    const ch: string = input.slice(i, i + 1);
    if (ch === "\n") {
      lines.push(current);
      current = "";
    } else {
      current = current + ch;
    }
    i = i + 1;
  }
  if (current.length > 0) {
    lines.push(current);
  }

  let li: number = 0;
  while (li < lines.length) {
    const line: string = lines[li];
    const trimmed: string = trimString(line);

    // Code block toggle
    if (trimmed.slice(0, 3) === "```") {
      if (inCodeBlock) {
        const tok: Token = { type: "code_block", content: codeContent };
        tokens.push(tok);
        codeContent = "";
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeContent = "";
      }
      li = li + 1;
      continue;
    }

    if (inCodeBlock) {
      if (codeContent.length > 0) {
        codeContent = codeContent + "\n";
      }
      codeContent = codeContent + line;
      li = li + 1;
      continue;
    }

    // Blank line
    if (trimmed.length === 0) {
      const tok: Token = { type: "blank", content: "" };
      tokens.push(tok);
      li = li + 1;
      continue;
    }

    // Headers
    const hashCount: number = countLeadingHashes(trimmed);
    if (hashCount > 0) {
      const headerContent: string = trimmed.slice(hashCount + 1);
      const tok: Token = { type: "h" + String(hashCount), content: headerContent };
      tokens.push(tok);
      li = li + 1;
      continue;
    }

    // Paragraph
    const tok: Token = { type: "paragraph", content: trimmed };
    tokens.push(tok);
    li = li + 1;
  }

  return tokens;
}

// ─── Inline Formatting ──────────────────────────────────────────────

function parseInline(text: string): string {
  let out: string = "";
  let i: number = 0;

  while (i < text.length) {
    const ch: string = text.slice(i, i + 1);
    const next: string = i + 1 < text.length ? text.slice(i + 1, i + 2) : "";

    // Bold: **text**
    if (ch === "*" && next === "*") {
      const end: number = findPattern(text, "**", i + 2);
      if (end !== -1) {
        const inner: string = text.slice(i + 2, end);
        out = out + "<strong>" + inner + "</strong>";
        i = end + 2;
        continue;
      }
    }

    // Italic: *text*
    if (ch === "*" && next !== "*") {
      const end: number = findChar(text, "*", i + 1);
      if (end !== -1) {
        const inner: string = text.slice(i + 1, end);
        out = out + "<em>" + inner + "</em>";
        i = end + 1;
        continue;
      }
    }

    // Inline code: `text`
    if (ch === "`") {
      const end: number = findChar(text, "`", i + 1);
      if (end !== -1) {
        const inner: string = text.slice(i + 1, end);
        out = out + "<code>" + inner + "</code>";
        i = end + 1;
        continue;
      }
    }

    // Link: [text](url)
    if (ch === "[") {
      const closeBracket: number = findChar(text, "]", i + 1);
      if (closeBracket !== -1 && closeBracket + 1 < text.length) {
        if (text.slice(closeBracket + 1, closeBracket + 2) === "(") {
          const closeParen: number = findChar(text, ")", closeBracket + 2);
          if (closeParen !== -1) {
            const linkText: string = text.slice(i + 1, closeBracket);
            const url: string = text.slice(closeBracket + 2, closeParen);
            out = out + "<a href=\"" + url + "\">" + linkText + "</a>";
            i = closeParen + 1;
            continue;
          }
        }
      }
    }

    out = out + ch;
    i = i + 1;
  }

  return out;
}

function findChar(text: string, ch: string, start: number): number {
  const rest: string = text.slice(start)
  const idx: number = rest.indexOf(ch)
  if (idx === -1) return -1
  return start + idx
}

function findPattern(text: string, pattern: string, start: number): number {
  const rest: string = text.slice(start)
  const idx: number = rest.indexOf(pattern)
  if (idx === -1) return -1
  return start + idx
}

function trimString(s: string): string {
  return s.trim()
}

// ─── HTML Generator ─────────────────────────────────────────────────

function tokensToHtml(tokens: Token[]): string {
  let html: string = "";
  let i: number = 0;

  while (i < tokens.length) {
    const tok: Token = tokens[i];

    if (tok.type === "blank") {
      i = i + 1;
      continue;
    }

    if (tok.type === "h1") {
      html = html + "<h1>" + parseInline(tok.content) + "</h1>\n";
    } else if (tok.type === "h2") {
      html = html + "<h2>" + parseInline(tok.content) + "</h2>\n";
    } else if (tok.type === "h3") {
      html = html + "<h3>" + parseInline(tok.content) + "</h3>\n";
    } else if (tok.type === "h4") {
      html = html + "<h4>" + parseInline(tok.content) + "</h4>\n";
    } else if (tok.type === "h5") {
      html = html + "<h5>" + parseInline(tok.content) + "</h5>\n";
    } else if (tok.type === "h6") {
      html = html + "<h6>" + parseInline(tok.content) + "</h6>\n";
    } else if (tok.type === "code_block") {
      html = html + "<pre><code>" + tok.content + "</code></pre>\n";
    } else if (tok.type === "paragraph") {
      html = html + "<p>" + parseInline(tok.content) + "</p>\n";
    }

    i = i + 1;
  }

  return html;
}

// ─── Main ───────────────────────────────────────────────────────────
import { createRequire } from "module";
const require = createRequire(import.meta.url);

function main(): void {
  const fs = require("fs");
  const input: string = fs.readFileSync("/dev/stdin", "utf-8");

  const tokens: Token[] = tokenizeLines(input);
  const html: string = tokensToHtml(tokens);

  console.log(html);

  // Stats
  let headerCount: number = 0;
  let paragraphCount: number = 0;
  let codeBlockCount: number = 0;
  let i: number = 0;
  while (i < tokens.length) {
    const t: string = tokens[i].type;
    if (t === "h1" || t === "h2" || t === "h3" || t === "h4" || t === "h5" || t === "h6") {
      headerCount = headerCount + 1;
    } else if (t === "paragraph") {
      paragraphCount = paragraphCount + 1;
    } else if (t === "code_block") {
      codeBlockCount = codeBlockCount + 1;
    }
    i = i + 1;
  }
  console.log("---");
  console.log("Headers: " + String(headerCount));
  console.log("Paragraphs: " + String(paragraphCount));
  console.log("Code blocks: " + String(codeBlockCount));
}

main();
