/*
 * tsnOS globals — constants and mutable state
 * Library module: tsn emits these as initialized C globals
 */

// Hardware addresses (decimal — tsn uses double)
const VGA_BASE: number   = 753664    // 0xB8000
const TERM_W: number     = 80
const TERM_H: number     = 25
const KBD_PORT: number   = 96        // 0x60
const SERIAL_DATA: number   = 1016   // 0x3F8
const SERIAL_STATUS: number = 1021   // 0x3FD
const VGA_CTRL: number   = 980       // 0x3D4
const VGA_CDATA: number  = 981       // 0x3D5

// Scancode set 1 → ASCII lookup
// Index = scancode, char = ASCII. '?' and '@' are placeholders.
const SCAN_MAP: string = "??1234567890-=?@qwertyuiop[]?@asdfghjkl;'`?\\zxcvbnm,./?*? "

// Terminal state
let cursorX: number     = 0
let cursorY: number     = 0
let colorFg: number     = 15
let colorBg: number     = 0
let promptColor: number = 10
let serialOk: number    = 0
let lastScan: number    = 0