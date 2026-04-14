// Perry benchmark: Recursive Fibonacci (fib(40))
// Measures function call overhead and recursion.
// Adapted for TSN: wrapped in main().

function fib(n: number): number {
    if (n <= 1) return n
    return fib(n - 1) + fib(n - 2)
}

function main(): void {
    const N: number = 40
    const start: number = Date.now()
    const result: number = fib(N)
    const elapsed: number = Date.now() - start

    console.log("fibonacci:" + String(elapsed))
    console.log("fib(" + String(N) + "):" + String(result))
}

main()
