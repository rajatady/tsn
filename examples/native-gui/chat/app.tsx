import { useStore } from '../../../packages/tsn-ui/src/react'
import { AttachDialog } from './dialogs'
import { ChatLoginScreen } from './login'
import { ChatSidebar } from './sidebar'
import { ChatWorkspace } from './workspace'

export function App() {
  const [loggedIn, _setLoggedIn] = useStore<boolean>('chat:logged-in', false)
  const [theme, _setTheme] = useStore<string>('chat:theme', 'slate')
  const [collapsed, _setCollapsed] = useStore<boolean>('chat:sidebar-collapsed', false)
  const [themePanelOpen, _setThemePanelOpen] = useStore<boolean>('chat:theme-panel-open', false)
  const [thinkingOpen, _setThinkingOpen] = useStore<boolean>('chat:thinking-open', true)
  const [attachOpen, _setAttachOpen] = useStore<boolean>('chat:attach-open', false)
  const [draft, _setDraft] = useStore<string>('chat:draft', 'Draft the native screen structure and keep the primitives clean.')
  const [roadmap, _setRoadmap] = useStore<boolean>('chat:file-roadmap', true)
  const [script, _setScript] = useStore<boolean>('chat:file-script', true)
  const [notes, _setNotes] = useStore<boolean>('chat:file-notes', false)
  const [analytics, _setAnalytics] = useStore<boolean>('chat:file-analytics', false)
  const [wireframe, _setWireframe] = useStore<boolean>('chat:file-wireframe', false)
  const [handoff, _setHandoff] = useStore<boolean>('chat:file-handoff', false)

  let body: JSX.Element = ChatLoginScreen(theme)
  if (loggedIn) {
    if (theme === 'stone') {
      body = (
        <VStack testId="app-shell" className="flex-1 p-4">
          <ZStack className="flex-1">
            <View className="flex-1 rounded-[24] border border-stone-300 bg-white overflow-hidden">
              <HStack className="flex-1 gap-0">
                {ChatSidebar(theme, collapsed)}
                {ChatWorkspace(theme, themePanelOpen, thinkingOpen, draft, roadmap, script, notes, analytics, wireframe, handoff)}
              </HStack>
            </View>
            {AttachDialog(attachOpen, roadmap, script, notes, analytics, wireframe, handoff)}
          </ZStack>
        </VStack>
      )
    } else if (theme === 'emerald') {
      body = (
        <VStack testId="app-shell" className="flex-1 p-4">
          <ZStack className="flex-1">
            <View className="flex-1 rounded-[24] border border-emerald-900 bg-[#11231c] overflow-hidden">
              <HStack className="flex-1 gap-0">
                {ChatSidebar(theme, collapsed)}
                {ChatWorkspace(theme, themePanelOpen, thinkingOpen, draft, roadmap, script, notes, analytics, wireframe, handoff)}
              </HStack>
            </View>
            {AttachDialog(attachOpen, roadmap, script, notes, analytics, wireframe, handoff)}
          </ZStack>
        </VStack>
      )
    } else {
      body = (
        <VStack testId="app-shell" className="flex-1 p-4">
          <ZStack className="flex-1">
            <View className="flex-1 rounded-[24] border border-white/10 bg-[#18181b] overflow-hidden">
              <HStack className="flex-1 gap-0">
                {ChatSidebar(theme, collapsed)}
                {ChatWorkspace(theme, themePanelOpen, thinkingOpen, draft, roadmap, script, notes, analytics, wireframe, handoff)}
              </HStack>
            </View>
            {AttachDialog(attachOpen, roadmap, script, notes, analytics, wireframe, handoff)}
          </ZStack>
        </VStack>
      )
    }
  }

  return (
    <Window title="TSN Chat" width={1440} height={920} dark subtitle="Simulated workspace">
      {body}
    </Window>
  )
}
