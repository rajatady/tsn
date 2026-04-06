import * as path from 'node:path'

export const gtkHostRoot = path.join('packages', 'tsn-host-gtk', 'src')
export const gtkHeaderPath = path.join(gtkHostRoot, 'ui.h')
export const gtkSourcePath = path.join(gtkHostRoot, 'ui.c')
