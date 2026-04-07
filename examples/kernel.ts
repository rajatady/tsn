
import { cursorX, cursorY, colorFg, colorBg, promptColor } from './state'
import { serialOk, lastScan } from './state'
import { VGA_BASE, TERM_W, TERM_H } from './state'
import { KBD_PORT, SERIAL_DATA, SERIAL_STATUS } from './state'
import { VGA_CTRL, VGA_CDATA, SCAN_MAP } from './state'

// ─── Serial ─────────────────────────────────────

function serialInit(): void {
    if (serialOk === 1) return
    serialOk = 1
    Cpu.outb(SERIAL_DATA + 1, 0)
    Cpu.outb(SERIAL_DATA + 3, 128)
    Cpu.outb(SERIAL_DATA, 3)
    Cpu.outb(SERIAL_DATA + 1, 0)
    Cpu.outb(SERIAL_DATA + 3, 3)
    Cpu.outb(SERIAL_DATA + 2, 199)
    Cpu.outb(SERIAL_DATA + 4, 11)
}

function serialWrite(ch: number): void {
    serialInit()
    let w: number = 0
    while (w < 50000) {
        const st: number = Cpu.inb(SERIAL_STATUS)
        if (Math.floor(st / 32) - Math.floor(st / 64) * 2 >= 1) {
            Cpu.outb(SERIAL_DATA, ch)
            return
        }
        w = w + 1
    }
}

// ─── VGA ────────────────────────────────────────

function vgaCell(ch: number, fg: number, bg: number): number {
    return ch + (bg * 16 + fg) * 256
}

function vgaWrite(x: number, y: number, ch: number, fg: number, bg: number): void {
    Mem.writeU16(VGA_BASE + (y * TERM_W + x) * 2, vgaCell(ch, fg, bg))
}

function vgaClear(): void {
    let i: number = 0
    while (i < TERM_W * TERM_H) {
        Mem.writeU16(VGA_BASE + i * 2, vgaCell(32, colorFg, colorBg))
        i = i + 1
    }
    cursorX = 0
    cursorY = 0
}

function vgaScroll(): void {
    let i: number = 0
    while (i < (TERM_H - 1) * TERM_W) {
        Mem.writeU16(VGA_BASE + i * 2, Mem.readU16(VGA_BASE + (i + TERM_W) * 2))
        i = i + 1
    }
    i = (TERM_H - 1) * TERM_W
    while (i < TERM_H * TERM_W) {
        Mem.writeU16(VGA_BASE + i * 2, vgaCell(32, colorFg, colorBg))
        i = i + 1
    }
    cursorY = TERM_H - 1
}

function vgaCursor(): void {
    const pos: number = cursorY * TERM_W + cursorX
    Cpu.outb(VGA_CTRL, 14)
    Cpu.outb(VGA_CDATA, Math.floor(pos / 256))
    Cpu.outb(VGA_CTRL, 15)
    Cpu.outb(VGA_CDATA, pos - Math.floor(pos / 256) * 256)
}

// ─── Terminal ───────────────────────────────────

function putChar(ch: number): void {
    serialWrite(ch)
    if (ch === 10) {
        serialWrite(13)
        cursorX = 0
        cursorY = cursorY + 1
        if (cursorY >= TERM_H) vgaScroll()
        return
    }
    if (ch === 8) {
        if (cursorX > 0) { cursorX = cursorX - 1; vgaWrite(cursorX, cursorY, 32, colorFg, colorBg) }
        return
    }
    vgaWrite(cursorX, cursorY, ch, colorFg, colorBg)
    cursorX = cursorX + 1
    if (cursorX >= TERM_W) { cursorX = 0; cursorY = cursorY + 1; if (cursorY >= TERM_H) vgaScroll() }
}

function printStr(s: string): void {
    let i: number = 0
    while (i < s.length) { putChar(s.charCodeAt(i)); i = i + 1 }
}

function println(s: string): void {
    printStr(s)
    putChar(10)
}

function printNum(n: number): void {
    printStr(String(Math.floor(n)))
}

function setColor(fg: number, bg: number): void {
    colorFg = fg
    colorBg = bg
}

// ─── Keyboard ───────────────────────────────────

function readKey(): number {
    let a: number = 0
    while (a < 300000) {
        const sc: number = Cpu.inb(KBD_PORT)
        if (sc !== lastScan) {
            lastScan = sc
            if (sc < 128) {
                if (sc === 28) return 10
                if (sc === 14) return 8
                if (sc > 0 && sc < SCAN_MAP.length) {
                    const ch: number = SCAN_MAP.charCodeAt(sc)
                    if (ch !== 63 && ch !== 64) return ch
                }
            }
        }
        a = a + 1
    }
    return 0
}

// ─── Build command string from key codes ────────

function buildCmd(codes: number[], len: number): string {
    let result: string = ""
    let i: number = 0
    while (i < len) {
        result = result + String.fromCharCode(codes[i])
        i = i + 1
    }
    return result
}

// ─── Commands ───────────────────────────────────

function cmdHelp(): void {
    setColor(14, 0)
    println("  Commands:")
    setColor(11, 0)
    println("    help    Show this")
    println("    about   About tsnOS")
    println("    hw      Live hardware reads")
    println("    fib     Fibonacci 0..20")
    println("    prime   Primes under 200")
    println("    hello   A greeting")
    println("    clear   Clear screen")
    println("    panic   Kernel panic (fake)")
    println("")
    setColor(15, 0)
}

function cmdAbout(): void {
    setColor(15, 0)
    println("  tsnOS v0.2 — 100% TypeScript kernel")
    println("")
    setColor(7, 0)
    println("  Hardware access is TypeScript:")
    println("    Cpu.inb(0x60)        reads keyboard")
    println("    Cpu.outb(0x3F8, ch)  writes serial")
    println("    Mem.writeU16(addr,v) writes VGA")
    println("")
    println("  These compile to inline x86 assembly.")
    println("  No C wrapper. No glue. No abstraction.")
    println("  TypeScript at the bottom of the stack.")
    println("")
    setColor(15, 0)
}

function cmdHw(): void {
    setColor(14, 0)
    println("  Live hardware reads (via Cpu.inb):")
    setColor(7, 0)
    printStr("    COM1 status:  ")
    printNum(Cpu.inb(SERIAL_STATUS))
    println("")
    printStr("    KBD status:   ")
    printNum(Cpu.inb(100))
    println("")
    Cpu.outb(67, 0)
    const pitL: number = Cpu.inb(64)
    const pitH: number = Cpu.inb(64)
    printStr("    PIT counter:  ")
    printNum(pitH * 256 + pitL)
    println("")
    Cpu.outb(112, 0)
    printStr("    RTC seconds:  ")
    printNum(Cpu.inb(113))
    println("")
    printStr("    VGA[0,0]:     ")
    printNum(Mem.readU16(VGA_BASE))
    println("")
    println("")
    setColor(15, 0)
}

function cmdFib(): void {
    setColor(14, 0)
    printStr("  ")
    let a: number = 0
    let b: number = 1
    let i: number = 0
    while (i < 20) {
        printNum(a)
        printStr(" ")
        const t: number = a + b
        a = b
        b = t
        i = i + 1
    }
    println("")
    println("")
    setColor(15, 0)
}

function cmdPrime(): void {
    setColor(14, 0)
    printStr("  ")
    let count: number = 0
    let n: number = 2
    while (n <= 200) {
        let ok: number = 1
        let d: number = 2
        while (d * d <= n) {
            if (n - Math.floor(n / d) * d === 0) ok = 0
            d = d + 1
        }
        if (ok === 1) { printNum(n); printStr(" "); count = count + 1 }
        n = n + 1
    }
    println("")
    printStr("  (")
    printNum(count)
    println(" primes)")
    println("")
    setColor(15, 0)
}

function cmdPanic(): void {
    setColor(15, 4)
    println("")
    println("  *** KERNEL PANIC ***")
    println("  fault: typescript_on_bare_metal")
    println("  (Not real. No segfaults in TypeScript.)")
    println("")
    setColor(15, 0)
}

function runCommand(cmd: string): void {
    if (cmd === "help")  { cmdHelp(); return }
    if (cmd === "about") { cmdAbout(); return }
    if (cmd === "hw")    { cmdHw(); return }
    if (cmd === "fib")   { cmdFib(); return }
    if (cmd === "prime") { cmdPrime(); return }
    if (cmd === "clear") { vgaClear(); return }
    if (cmd === "panic") { cmdPanic(); return }
    if (cmd === "hello") {
        setColor(13, 0)
        println("  Hello from tsnOS!")
        println("  Rendered via Mem.writeU16(0xB8000, ...)")
        println("")
        setColor(15, 0)
        return
    }
    if (cmd.length > 0) {
        setColor(12, 0)
        printStr("  Unknown: ")
        println(cmd)
        println("  Type 'help'")
        println("")
        setColor(15, 0)
    }
}

// ─── Shell + entry ──────────────────────────────

function drawPrompt(): void {
    setColor(promptColor, 0)
    printStr("tsn> ")
    setColor(15, 0)
    vgaCursor()
}

function main(): void {
    vgaClear()
    setColor(11, 0)
    println("")
    println("   _            ___  ____  ")
    println("  | |_ ___ _ _ / _ \\/ ___| ")
    println("  | __/ __| '_| | | \\___ \\ ")
    println("  | |_\\__ | | | |_| |___) |")
    println("   \\__|___|_|  \\___/|____/ ")
    println("")
    setColor(15, 0)
    println("  tsnOS v0.2 | 100% TypeScript kernel")
    setColor(7, 0)
    println("  Cpu.inb() / Mem.writeU16() hardware intrinsics")
    println("")
    setColor(10, 0)
    println("  Type 'help' for commands.")
    println("")

    let cmdCodes: number[] = []
    let cmdLen: number = 0
    drawPrompt()

    while (true) {
        const key: number = readKey()
        if (key === 0) continue
        if (key === 10) {
            putChar(10)
            const cmd: string = buildCmd(cmdCodes, cmdLen)
            runCommand(cmd)
            let fresh: number[] = []
            cmdCodes = fresh
            cmdLen = 0
            drawPrompt()
        } else if (key === 8) {
            if (cmdLen > 0) { cmdLen = cmdLen - 1; putChar(8); vgaCursor() }
        } else if (key >= 32 && key < 127) {
            cmdCodes.push(key)
            cmdLen = cmdLen + 1
            putChar(key)
            vgaCursor()
        }
    }
}