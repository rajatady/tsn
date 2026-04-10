export declare function readFile(path: string): string
export declare function writeFile(path: string, content: string): void
export declare function appendFile(path: string, content: string): void
export declare function fileExists(path: string): boolean
export declare function fileSize(path: string): number
export declare function listDir(path: string): string[]

export declare function readFileAsync(path: string): Promise<string>
export declare function writeFileAsync(path: string, content: string): Promise<void>
export declare function appendFileAsync(path: string, content: string): Promise<void>
export declare function fileExistsAsync(path: string): Promise<boolean>
export declare function fileSizeAsync(path: string): Promise<number>
export declare function listDirAsync(path: string): Promise<string[]>
