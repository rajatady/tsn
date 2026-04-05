export declare function useState<T>(initial: T): [T, (next: T | ((prev: T) => T)) => void]

export declare function useRoute(initial: string): [string, (next: string | ((prev: string) => string)) => void]
