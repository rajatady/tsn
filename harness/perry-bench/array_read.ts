// Perry benchmark: Array read (10M elements, sequential read + sum)

function main(): void {
    const SIZE: number = 10000000
    const arr: number[] = []
    for (let i: number = 0; i < SIZE; i += 1) {
        arr.push(i)
    }

    let sum: number = 0
    const start: number = Date.now()
    for (let i: number = 0; i < arr.length; i += 1) {
        sum += arr[i]
    }
    const elapsed: number = Date.now() - start

    console.log("array_read:" + String(elapsed))
    console.log("sum:" + String(sum))
}

main()
