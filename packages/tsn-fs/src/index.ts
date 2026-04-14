/**
 * Read the entire contents of a file as a UTF-8 string.
 *
 * Reads synchronously — the program blocks until the file is fully loaded.
 * For non-blocking I/O, use `readFileAsync` instead.
 *
 * @page stdlib/fs
 * @section readFile
 * @param path Absolute or relative path to the file
 * @returns The file contents as a UTF-8 string
 * @example
 * const config = readFile("config.json")
 * const lines = config.split("\n")
 * console.log("Lines:", lines.length)
 * @since 0.1.0
 */
export declare function readFile(path: string): string

/**
 * Write a string to a file, creating it if it doesn't exist
 * or overwriting it completely if it does.
 *
 * @page stdlib/fs
 * @section writeFile
 * @param path Absolute or relative path to the file
 * @param content The string content to write
 * @example
 * const report = "Total: " + String(count)
 * writeFile("report.txt", report)
 * @since 0.1.0
 */
export declare function writeFile(path: string, content: string): void

/**
 * Append a string to the end of a file, creating it if it doesn't exist.
 *
 * Useful for log files and incremental output.
 *
 * @page stdlib/fs
 * @section appendFile
 * @param path Absolute or relative path to the file
 * @param content The string content to append
 * @example
 * appendFile("log.txt", "started at " + timestamp + "\n")
 * @since 0.1.0
 */
export declare function appendFile(path: string, content: string): void

/**
 * Check whether a file exists at the given path.
 *
 * Returns `true` if the file exists, `false` otherwise.
 * Does not throw on missing files.
 *
 * @page stdlib/fs
 * @section fileExists
 * @param path Absolute or relative path to check
 * @returns `true` if the file exists
 * @example
 * if (fileExists("cache.json")) {
 *   const cached = readFile("cache.json")
 * }
 * @since 0.1.0
 */
export declare function fileExists(path: string): boolean

/**
 * Get the size of a file in bytes.
 *
 * @page stdlib/fs
 * @section fileSize
 * @param path Absolute or relative path to the file
 * @returns File size in bytes
 * @example
 * const size = fileSize("data.csv")
 * console.log("File is", size, "bytes")
 * @since 0.1.0
 */
export declare function fileSize(path: string): number

/**
 * List the entries (files and directories) in a directory.
 *
 * Returns filenames only, not full paths. Does not recurse
 * into subdirectories.
 *
 * @page stdlib/fs
 * @section listDir
 * @param path Absolute or relative path to the directory
 * @returns An array of filenames in the directory
 * @example
 * const files = listDir("./src")
 * for (const file of files) {
 *   console.log(file)
 * }
 * @since 0.1.0
 */
export declare function listDir(path: string): string[]

/**
 * Read the entire contents of a file asynchronously.
 *
 * Returns a promise that resolves when the file is fully read.
 * Backed by the libuv event loop — the caller suspends and
 * other async work can proceed while the read is in flight.
 *
 * Rejects if the file doesn't exist or can't be read.
 *
 * @page stdlib/fs
 * @section readFileAsync
 * @param path Absolute or relative path to the file
 * @returns A promise resolving to the file contents as a UTF-8 string
 * @example
 * async function main(): Promise<void> {
 *   const data = await readFileAsync("data.csv")
 *   const lines = data.split("\n")
 *   console.log("Loaded", lines.length, "lines")
 * }
 * @since 0.1.0
 */
export declare function readFileAsync(path: string): Promise<string>

/**
 * Write a string to a file asynchronously.
 *
 * Creates the file if it doesn't exist, overwrites if it does.
 * Rejects on OS-level write failures.
 *
 * @page stdlib/fs
 * @section writeFileAsync
 * @param path Absolute or relative path to the file
 * @param content The string content to write
 * @returns A promise that resolves when the write completes
 * @example
 * await writeFileAsync("output.json", jsonString)
 * @since 0.1.0
 */
export declare function writeFileAsync(path: string, content: string): Promise<void>

/**
 * Append a string to a file asynchronously.
 *
 * Creates the file if it doesn't exist. Rejects on write failure.
 *
 * @page stdlib/fs
 * @section appendFileAsync
 * @param path Absolute or relative path to the file
 * @param content The string content to append
 * @returns A promise that resolves when the append completes
 * @since 0.1.0
 */
export declare function appendFileAsync(path: string, content: string): Promise<void>

/**
 * Check whether a file exists, asynchronously.
 *
 * Unlike other async functions, this resolves `false` for missing
 * paths instead of rejecting — matching the sync `fileExists` behavior.
 *
 * @page stdlib/fs
 * @section fileExistsAsync
 * @param path Absolute or relative path to check
 * @returns A promise resolving to `true` if the file exists
 * @since 0.1.0
 */
export declare function fileExistsAsync(path: string): Promise<boolean>

/**
 * Get the size of a file in bytes, asynchronously.
 *
 * Rejects if the file doesn't exist.
 *
 * @page stdlib/fs
 * @section fileSizeAsync
 * @param path Absolute or relative path to the file
 * @returns A promise resolving to the file size in bytes
 * @since 0.1.0
 */
export declare function fileSizeAsync(path: string): Promise<number>

/**
 * List the entries in a directory, asynchronously.
 *
 * @page stdlib/fs
 * @section listDirAsync
 * @param path Absolute or relative path to the directory
 * @returns A promise resolving to an array of filenames
 * @since 0.1.0
 */
export declare function listDirAsync(path: string): Promise<string[]>
