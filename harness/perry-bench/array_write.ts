// Perry benchmark: Array write (10M elements)
// TSN uses push() (direct index assignment doesn't grow arrays).

function main(): void {
    const SIZE: number = 10000000
    const arr: number[] = []

    const start: number = Date.now()
    for (let i: number = 0; i < SIZE; i += 1) {
        arr.push(i)
    }
    const elapsed: number = Date.now() - start

    console.log("array_write:" + String(elapsed))
    console.log("length:" + String(arr.length))
}

main()
