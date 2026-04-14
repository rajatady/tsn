// Perry benchmark: Object creation (1M objects with 2 fields)

class Point {
    x: number
    y: number
    constructor(x: number, y: number) {
        this.x = x
        this.y = y
    }
}

function main(): void {
    const ITERATIONS: number = 1000000
    let sum: number = 0

    const start: number = Date.now()
    for (let i: number = 0; i < ITERATIONS; i += 1) {
        const p: Point = new Point(i, i + 1)
        sum += p.x + p.y
    }
    const elapsed: number = Date.now() - start

    console.log("object_create:" + String(elapsed))
    console.log("sum:" + String(sum))
}

main()
