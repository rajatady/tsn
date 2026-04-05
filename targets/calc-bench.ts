// Static Hermes benchmark: calc.js (factorial loop)
// Original: https://github.com/KusStar/benchmark-static-hermes
//
// Computes factorial of 100, repeated 4 million times.
// Time is measured externally by the benchmark harness.

function bench(lc: number, fc: number): number {
    let n: number = 0;
    let fact: number = 0;
    let res: number = 0;
    while (lc > 0) {
        lc = lc - 1;
        n = fc;
        fact = n;
        while (n > 2) {
            n = n - 1;
            fact = fact * n;
        }
        res = res + fact;
    }
    return res;
}

function main(): void {
    const res: number = bench(4000000, 100);
    console.log(res);
}

main();
