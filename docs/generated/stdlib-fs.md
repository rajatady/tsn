# File System (@tsn/fs)

## Contents

- [readFile](#readfile)
- [writeFile](#writefile)
- [appendFile](#appendfile)
- [fileExists](#fileexists)
- [fileSize](#filesize)
- [listDir](#listdir)
- [readFileAsync](#readfileasync)
- [writeFileAsync](#writefileasync)
- [appendFileAsync](#appendfileasync)
- [fileExistsAsync](#fileexistsasync)
- [fileSizeAsync](#filesizeasync)
- [listDirAsync](#listdirasync)

### readFile

Read the entire contents of a file as a UTF-8 string.

Reads synchronously — the program blocks until the file is fully loaded.
For non-blocking I/O, use `readFileAsync` instead.

**Signature:**
```typescript
function readFile(path: string): string
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to the file |

**Returns:** `string` — The file contents as a UTF-8 string

**Example:**
```typescript
const config = readFile("config.json")
const lines = config.split("\n")
console.log("Lines:", lines.length)
```

> Since 0.1.0

---

### writeFile

Write a string to a file, creating it if it doesn't exist
or overwriting it completely if it does.

**Signature:**
```typescript
function writeFile(path: string, content: string): void
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to the file |
| `content` | `string` | The string content to write |

**Example:**
```typescript
const report = "Total: " + String(count)
writeFile("report.txt", report)
```

> Since 0.1.0

---

### appendFile

Append a string to the end of a file, creating it if it doesn't exist.

Useful for log files and incremental output.

**Signature:**
```typescript
function appendFile(path: string, content: string): void
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to the file |
| `content` | `string` | The string content to append |

**Example:**
```typescript
appendFile("log.txt", "started at " + timestamp + "\n")
```

> Since 0.1.0

---

### fileExists

Check whether a file exists at the given path.

Returns `true` if the file exists, `false` otherwise.
Does not throw on missing files.

**Signature:**
```typescript
function fileExists(path: string): boolean
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to check |

**Returns:** `boolean` — `true` if the file exists

**Example:**
```typescript
if (fileExists("cache.json")) {
  const cached = readFile("cache.json")
}
```

> Since 0.1.0

---

### fileSize

Get the size of a file in bytes.

**Signature:**
```typescript
function fileSize(path: string): number
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to the file |

**Returns:** `number` — File size in bytes

**Example:**
```typescript
const size = fileSize("data.csv")
console.log("File is", size, "bytes")
```

> Since 0.1.0

---

### listDir

List the entries (files and directories) in a directory.

Returns filenames only, not full paths. Does not recurse
into subdirectories.

**Signature:**
```typescript
function listDir(path: string): string[]
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to the directory |

**Returns:** `string[]` — An array of filenames in the directory

**Example:**
```typescript
const files = listDir("./src")
for (const file of files) {
  console.log(file)
}
```

> Since 0.1.0

---

### readFileAsync

Read the entire contents of a file asynchronously.

Returns a promise that resolves when the file is fully read.
Backed by the libuv event loop — the caller suspends and
other async work can proceed while the read is in flight.

Rejects if the file doesn't exist or can't be read.

**Signature:**
```typescript
function readFileAsync(path: string): Promise<string>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to the file |

**Returns:** `Promise<string>` — A promise resolving to the file contents as a UTF-8 string

**Example:**
```typescript
async function main(): Promise<void> {
  const data = await readFileAsync("data.csv")
  const lines = data.split("\n")
  console.log("Loaded", lines.length, "lines")
}
```

> Since 0.1.0

---

### writeFileAsync

Write a string to a file asynchronously.

Creates the file if it doesn't exist, overwrites if it does.
Rejects on OS-level write failures.

**Signature:**
```typescript
function writeFileAsync(path: string, content: string): Promise<void>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to the file |
| `content` | `string` | The string content to write |

**Returns:** `Promise<void>` — A promise that resolves when the write completes

**Example:**
```typescript
await writeFileAsync("output.json", jsonString)
```

> Since 0.1.0

---

### appendFileAsync

Append a string to a file asynchronously.

Creates the file if it doesn't exist. Rejects on write failure.

**Signature:**
```typescript
function appendFileAsync(path: string, content: string): Promise<void>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to the file |
| `content` | `string` | The string content to append |

**Returns:** `Promise<void>` — A promise that resolves when the append completes

> Since 0.1.0

---

### fileExistsAsync

Check whether a file exists, asynchronously.

Unlike other async functions, this resolves `false` for missing
paths instead of rejecting — matching the sync `fileExists` behavior.

**Signature:**
```typescript
function fileExistsAsync(path: string): Promise<boolean>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to check |

**Returns:** `Promise<boolean>` — A promise resolving to `true` if the file exists

> Since 0.1.0

---

### fileSizeAsync

Get the size of a file in bytes, asynchronously.

Rejects if the file doesn't exist.

**Signature:**
```typescript
function fileSizeAsync(path: string): Promise<number>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to the file |

**Returns:** `Promise<number>` — A promise resolving to the file size in bytes

> Since 0.1.0

---

### listDirAsync

List the entries in a directory, asynchronously.

**Signature:**
```typescript
function listDirAsync(path: string): Promise<string[]>
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `path` | `string` | Absolute or relative path to the directory |

**Returns:** `Promise<string[]>` — A promise resolving to an array of filenames

> Since 0.1.0

---
