// Perry benchmark: Harmonic series (50M iterations with division)

function main(): void {
    const ITERATIONS: number = 50000000
    let result: number = 1.0

    const start: number = Date.now()
    for (let i: number = 1; i < ITERATIONS; i += 1) {
        result += 1.0 / i
    }
    const elapsed: number = Date.now() - start

    console.log("math_intensive:" + String(elapsed))
    console.log("result:" + String(result))
}

main()
