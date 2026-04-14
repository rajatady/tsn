// Perry benchmark: Loop overhead (100M iterations)
// Measures raw loop iteration speed.

function main(): void {
    const ITERATIONS: number = 100000000
    let sum: number = 0

    const start: number = Date.now()
    for (let i: number = 0; i < ITERATIONS; i += 1) {
        sum += 1
    }
    const elapsed: number = Date.now() - start

    console.log("loop_overhead:" + String(elapsed))
    console.log("sum:" + String(sum))
}

main()
