/*
 * Hand-optimized Markdown Parser in C.
 * Same logic as targets/markdown-parser.ts.
 *
 * Works directly on the input buffer. Only allocates for output.
 * All parsing is done with pointer arithmetic — no string objects.
 */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>

/* ─── Output buffer ────────────────────────────────────────────── */

typedef struct {
    char *buf;
    int len;
    int cap;
} OutBuf;

static void out_init(OutBuf *o) { o->cap = 65536; o->buf = (char*)malloc(o->cap); o->len = 0; }
static void out_ensure(OutBuf *o, int n) {
    while (o->len + n >= o->cap) { o->cap *= 2; o->buf = (char*)realloc(o->buf, o->cap); }
}
static void out_str(OutBuf *o, const char *s) {
    int n = (int)strlen(s); out_ensure(o, n); memcpy(o->buf + o->len, s, n); o->len += n;
}
static void out_mem(OutBuf *o, const char *s, int n) {
    out_ensure(o, n); memcpy(o->buf + o->len, s, n); o->len += n;
}
static void out_char(OutBuf *o, char c) { out_ensure(o, 1); o->buf[o->len++] = c; }

/* ─── Inline formatting ───────────────────────────────────────── */

static void parse_inline(OutBuf *o, const char *text, int len) {
    int i = 0;
    while (i < len) {
        /* Bold: **text** */
        if (i + 1 < len && text[i] == '*' && text[i+1] == '*') {
            int end = i + 2;
            while (end + 1 < len && !(text[end] == '*' && text[end+1] == '*')) end++;
            if (end + 1 < len) {
                out_str(o, "<strong>");
                out_mem(o, text + i + 2, end - i - 2);
                out_str(o, "</strong>");
                i = end + 2;
                continue;
            }
        }
        /* Italic: *text* */
        if (text[i] == '*' && (i + 1 >= len || text[i+1] != '*')) {
            int end = i + 1;
            while (end < len && text[end] != '*') end++;
            if (end < len) {
                out_str(o, "<em>");
                out_mem(o, text + i + 1, end - i - 1);
                out_str(o, "</em>");
                i = end + 1;
                continue;
            }
        }
        /* Inline code: `text` */
        if (text[i] == '`') {
            int end = i + 1;
            while (end < len && text[end] != '`') end++;
            if (end < len) {
                out_str(o, "<code>");
                out_mem(o, text + i + 1, end - i - 1);
                out_str(o, "</code>");
                i = end + 1;
                continue;
            }
        }
        /* Link: [text](url) */
        if (text[i] == '[') {
            int cb = i + 1;
            while (cb < len && text[cb] != ']') cb++;
            if (cb < len && cb + 1 < len && text[cb+1] == '(') {
                int cp = cb + 2;
                while (cp < len && text[cp] != ')') cp++;
                if (cp < len) {
                    out_str(o, "<a href=\"");
                    out_mem(o, text + cb + 2, cp - cb - 2);
                    out_str(o, "\">");
                    out_mem(o, text + i + 1, cb - i - 1);
                    out_str(o, "</a>");
                    i = cp + 1;
                    continue;
                }
            }
        }
        out_char(o, text[i]);
        i++;
    }
}

int main(void) {
    /* Read stdin */
    size_t cap = 65536, len = 0;
    char *input = (char *)malloc(cap);
    size_t n;
    while ((n = fread(input + len, 1, cap - len, stdin)) > 0) {
        len += n;
        if (len == cap) { cap *= 2; input = (char *)realloc(input, cap); }
    }

    OutBuf out; out_init(&out);
    int header_count = 0, para_count = 0, code_block_count = 0;
    bool in_code_block = false;
    int code_start = 0;

    int i = 0;
    while (i < (int)len) {
        /* Find line boundaries */
        int line_start = i;
        while (i < (int)len && input[i] != '\n') i++;
        int line_end = i;
        if (i < (int)len) i++; /* skip \n */

        /* Trim */
        int ts = line_start, te = line_end;
        while (ts < te && (input[ts] == ' ' || input[ts] == '\t')) ts++;
        while (te > ts && (input[te-1] == ' ' || input[te-1] == '\t')) te--;
        int trimmed_len = te - ts;

        /* Code block toggle */
        if (trimmed_len >= 3 && input[ts] == '`' && input[ts+1] == '`' && input[ts+2] == '`') {
            if (in_code_block) {
                out_str(&out, "<pre><code>");
                out_mem(&out, input + code_start, line_start - code_start - 1);
                out_str(&out, "</code></pre>\n");
                code_block_count++;
                in_code_block = false;
            } else {
                in_code_block = true;
                code_start = i;
            }
            continue;
        }
        if (in_code_block) continue;

        /* Blank line */
        if (trimmed_len == 0) continue;

        /* Headers */
        int hashes = 0;
        while (hashes < trimmed_len && hashes < 6 && input[ts + hashes] == '#') hashes++;
        if (hashes > 0 && ts + hashes < te && input[ts + hashes] == ' ') {
            char tag[4];
            sprintf(tag, "h%d", hashes);
            out_char(&out, '<'); out_str(&out, tag); out_char(&out, '>');
            parse_inline(&out, input + ts + hashes + 1, te - ts - hashes - 1);
            out_str(&out, "</"); out_str(&out, tag); out_str(&out, ">\n");
            header_count++;
            continue;
        }

        /* Paragraph */
        out_str(&out, "<p>");
        parse_inline(&out, input + ts, trimmed_len);
        out_str(&out, "</p>\n");
        para_count++;
    }

    /* Output HTML */
    fwrite(out.buf, 1, out.len, stdout);

    /* Stats */
    printf("---\nHeaders: %d\nParagraphs: %d\nCode blocks: %d\n",
           header_count, para_count, code_block_count);

    free(input);
    free(out.buf);
    return 0;
}
