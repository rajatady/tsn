// Perry benchmark: Nested loops (3000x3000)

function main(): void {
    const SIZE: number = 3000
    const arr: number[] = []
    for (let i: number = 0; i < SIZE; i += 1) {
        arr.push(i)
    }

    let sum: number = 0
    const start: number = Date.now()
    for (let i: number = 0; i < arr.length; i += 1) {
        for (let j: number = 0; j < arr.length; j += 1) {
            sum += arr[i] + arr[j]
        }
    }
    const elapsed: number = Date.now() - start

    console.log("nested_loops:" + String(elapsed))
    console.log("sum:" + String(sum))
}

main()
