# Control Flow

### overview

Control flow in TSN maps directly to C — no hidden transformations,
no implicit async boundaries. What you write is what runs.

Supported: if/else, for, for-of, while, do-while, switch/case,
break, continue, return, throw, try/catch/finally.

**Syntax:**
```typescript
if (cond) { }
for (let i = 0; i < n; i++) { }
while (cond) { }
do { } while (cond)
switch (n) { case 1: break }
for (const x of arr) { }
```

**Compiles to:**
Direct C equivalents. for-of becomes an indexed for loop over the array's .data/.len fields. Scope-local variables are released at the end of each iteration via ARC.

**Limitations:**
- for-in is not supported — only for-of over arrays.
- switch expressions are cast to int — no string switch.
- Labeled break/continue not supported.

**Example:**
```typescript
for (const entry of logs) {
  if (entry.level === "ERROR") continue
  console.log(entry.message)
}

let retries: number = 0
do {
  retries = retries + 1
} while (retries < 3)
```

> Since 0.1.0

---
