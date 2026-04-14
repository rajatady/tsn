// Perry benchmark: Accumulate with modulo (100M iterations)

function main(): void {
    const ITERATIONS: number = 100000000
    let sum: number = 0

    const start: number = Date.now()
    for (let i: number = 0; i < ITERATIONS; i += 1) {
        sum += i % 1000
    }
    const elapsed: number = Date.now() - start

    console.log("accumulate:" + String(elapsed))
    console.log("sum:" + String(sum))
}

main()
