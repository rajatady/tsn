import { useStore } from '../../../packages/tsn-ui/src/react'

export function beginChatLogin(): void {
  const [_loggedIn, setLoggedIn] = useStore<boolean>('chat:logged-in', false)
  setLoggedIn(true)
}

export function toggleChatSidebar(): void {
  const [collapsed, setCollapsed] = useStore<boolean>('chat:sidebar-collapsed', false)
  setCollapsed(!collapsed)
}

export function toggleChatThemePanel(): void {
  const [open, setOpen] = useStore<boolean>('chat:theme-panel-open', false)
  setOpen(!open)
}

export function setChatThemeSlate(): void {
  const [_theme, setTheme] = useStore<string>('chat:theme', 'slate')
  setTheme('slate')
}

export function setChatThemeStone(): void {
  const [_theme, setTheme] = useStore<string>('chat:theme', 'slate')
  setTheme('stone')
}

export function setChatThemeEmerald(): void {
  const [_theme, setTheme] = useStore<string>('chat:theme', 'slate')
  setTheme('emerald')
}

export function toggleThinkingOpen(): void {
  const [open, setOpen] = useStore<boolean>('chat:thinking-open', true)
  setOpen(!open)
}

export function openAttachDialog(): void {
  const [_open, setOpen] = useStore<boolean>('chat:attach-open', false)
  setOpen(true)
}

export function closeAttachDialog(): void {
  const [_open, setOpen] = useStore<boolean>('chat:attach-open', false)
  setOpen(false)
}

export function onComposerChange(next: string): void {
  const [_draft, setDraft] = useStore<string>('chat:draft', 'Draft the native screen structure and keep the primitives clean.')
  setDraft(next)
}

export function toggleFileRoadmap(_next: boolean): void {
  const [selected, setSelected] = useStore<boolean>('chat:file-roadmap', true)
  setSelected(!selected)
}

export function toggleFileScript(_next: boolean): void {
  const [selected, setSelected] = useStore<boolean>('chat:file-script', true)
  setSelected(!selected)
}

export function toggleFileNotes(_next: boolean): void {
  const [selected, setSelected] = useStore<boolean>('chat:file-notes', false)
  setSelected(!selected)
}

export function toggleFileAnalytics(_next: boolean): void {
  const [selected, setSelected] = useStore<boolean>('chat:file-analytics', false)
  setSelected(!selected)
}

export function toggleFileWireframe(_next: boolean): void {
  const [selected, setSelected] = useStore<boolean>('chat:file-wireframe', false)
  setSelected(!selected)
}

export function toggleFileHandoff(_next: boolean): void {
  const [selected, setSelected] = useStore<boolean>('chat:file-handoff', false)
  setSelected(!selected)
}

export function applySelectedFiles(): void {
  const [_open, setOpen] = useStore<boolean>('chat:attach-open', false)
  setOpen(false)
}
