import {
  openAttachDialog,
  onComposerChange,
  toggleChatThemePanel,
  toggleThinkingOpen,
} from './state'

function AttachmentRow(roadmap: boolean, script: boolean, notes: boolean, analytics: boolean, wireframe: boolean, handoff: boolean) {
  return (
    <HStack testId="attachment-row" className="gap-2">
      {roadmap ? <View className="rounded-[8] border border-white/10 bg-[#232327] px-3 py-2"><Text className="text-xs text-zinc-400">roadmap-q3.pdf</Text></View> : <View />}
      {script ? <View className="rounded-[8] border border-white/10 bg-[#232327] px-3 py-2"><Text className="text-xs text-zinc-400">demo-script.md</Text></View> : <View />}
      {notes ? <View className="rounded-[8] border border-white/10 bg-[#232327] px-3 py-2"><Text className="text-xs text-zinc-400">notes.txt</Text></View> : <View />}
      {analytics ? <View className="rounded-[8] border border-white/10 bg-[#232327] px-3 py-2"><Text className="text-xs text-zinc-400">analytics.csv</Text></View> : <View />}
      {wireframe ? <View className="rounded-[8] border border-white/10 bg-[#232327] px-3 py-2"><Text className="text-xs text-zinc-400">wireframe.png</Text></View> : <View />}
      {handoff ? <View className="rounded-[8] border border-white/10 bg-[#232327] px-3 py-2"><Text className="text-xs text-zinc-400">handoff.docx</Text></View> : <View />}
    </HStack>
  )
}

function ContextRail(theme: string) {
  if (theme === 'stone') {
    return (
      <VStack testId="context-rail" className="w-[300] min-w-[300] gap-4 border-l border-stone-300 bg-stone-50 p-5">
        <View className="rounded-[18] border border-stone-300 bg-white p-4">
          <VStack className="gap-1">
            <Text className="text-sm font-medium text-stone-950">Session</Text>
            <Text className="text-xs text-stone-500">Launch planning conversation</Text>
          </VStack>
        </View>
        <View className="rounded-[18] border border-stone-300 bg-white p-4">
          <VStack className="gap-3">
            <Text className="text-sm font-medium text-stone-950">Files</Text>
            <Text className="text-sm text-stone-700">roadmap-q3.pdf</Text>
            <Text className="text-sm text-stone-700">demo-script.md</Text>
            <Text className="text-sm text-stone-700">notes.txt</Text>
          </VStack>
        </View>
        <View className="rounded-[18] border border-stone-300 bg-white p-4">
          <VStack className="gap-2">
            <Text className="text-sm font-medium text-stone-950">Shortcuts</Text>
            <HStack className="justify-between"><Text className="text-xs text-stone-600">New chat</Text><Text className="text-xs text-stone-500">⌘N</Text></HStack>
            <HStack className="justify-between"><Text className="text-xs text-stone-600">Attach file</Text><Text className="text-xs text-stone-500">⇧⌘A</Text></HStack>
            <HStack className="justify-between"><Text className="text-xs text-stone-600">Toggle thinking</Text><Text className="text-xs text-stone-500">⌘.</Text></HStack>
          </VStack>
        </View>
      </VStack>
    )
  }

  if (theme === 'emerald') {
    return (
      <VStack testId="context-rail" className="w-[300] min-w-[300] gap-4 border-l border-emerald-900 bg-[#0d1c16] p-5">
        <View className="rounded-[18] border border-emerald-900 bg-[#11231c] p-4">
          <VStack className="gap-1">
            <Text className="text-sm font-medium text-emerald-50">Session</Text>
            <Text className="text-xs text-emerald-100/55">Launch planning conversation</Text>
          </VStack>
        </View>
        <View className="rounded-[18] border border-emerald-900 bg-[#11231c] p-4">
          <VStack className="gap-3">
            <Text className="text-sm font-medium text-emerald-50">Files</Text>
            <Text className="text-sm text-emerald-100/75">roadmap-q3.pdf</Text>
            <Text className="text-sm text-emerald-100/75">demo-script.md</Text>
            <Text className="text-sm text-emerald-100/75">notes.txt</Text>
          </VStack>
        </View>
        <View className="rounded-[18] border border-emerald-900 bg-[#11231c] p-4">
          <VStack className="gap-2">
            <Text className="text-sm font-medium text-emerald-50">Shortcuts</Text>
            <HStack className="justify-between"><Text className="text-xs text-emerald-100/75">New chat</Text><Text className="text-xs text-emerald-100/55">⌘N</Text></HStack>
            <HStack className="justify-between"><Text className="text-xs text-emerald-100/75">Attach file</Text><Text className="text-xs text-emerald-100/55">⇧⌘A</Text></HStack>
            <HStack className="justify-between"><Text className="text-xs text-emerald-100/75">Toggle thinking</Text><Text className="text-xs text-emerald-100/55">⌘.</Text></HStack>
          </VStack>
        </View>
      </VStack>
    )
  }

  return (
    <VStack testId="context-rail" className="w-[300] min-w-[300] gap-4 border-l border-white/10 bg-[#18181b] p-5">
      <View className="rounded-[18] border border-white/10 bg-[#232327] p-4">
        <VStack className="gap-1">
          <Text className="text-sm font-medium text-zinc-50">Session</Text>
          <Text className="text-xs text-zinc-500">Launch planning conversation</Text>
        </VStack>
      </View>
      <View className="rounded-[18] border border-white/10 bg-[#232327] p-4">
        <VStack className="gap-3">
          <Text className="text-sm font-medium text-zinc-50">Files</Text>
          <Text className="text-sm text-zinc-300">roadmap-q3.pdf</Text>
          <Text className="text-sm text-zinc-300">demo-script.md</Text>
          <Text className="text-sm text-zinc-300">notes.txt</Text>
        </VStack>
      </View>
      <View className="rounded-[18] border border-white/10 bg-[#232327] p-4">
        <VStack className="gap-2">
          <Text className="text-sm font-medium text-zinc-50">Shortcuts</Text>
          <HStack className="justify-between"><Text className="text-xs text-zinc-400">New chat</Text><Text className="text-xs text-zinc-500">⌘N</Text></HStack>
          <HStack className="justify-between"><Text className="text-xs text-zinc-400">Attach file</Text><Text className="text-xs text-zinc-500">⇧⌘A</Text></HStack>
          <HStack className="justify-between"><Text className="text-xs text-zinc-400">Toggle thinking</Text><Text className="text-xs text-zinc-500">⌘.</Text></HStack>
        </VStack>
      </View>
    </VStack>
  )
}

export function ChatWorkspace(
  theme: string,
  themePanelOpen: boolean,
  thinkingOpen: boolean,
  draft: string,
  roadmap: boolean,
  script: boolean,
  notes: boolean,
  analytics: boolean,
  wireframe: boolean,
  handoff: boolean,
) {
  if (theme === 'stone') {
    return (
      <HStack className="flex-1 gap-0 bg-stone-100">
        <VStack testId="chat-main" className="flex-1 gap-0 bg-stone-100">
          <HStack testId="chat-header" className="h-[64] items-center justify-between border-b border-stone-300 px-6">
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-stone-950">Launch the TSN chat app</Text>
              <Text className="text-xs text-stone-500">Simulated local workspace</Text>
            </VStack>
            <HStack className="items-center gap-2">
              <View testId="model-chip" className="rounded-[999] border border-stone-300 bg-white px-3 py-2"><Text className="text-xs text-stone-600">GPT-5.4 • Simulated</Text></View>
              <Button testId="theme-panel-btn" variant="ghost" onClick={toggleChatThemePanel}>◐</Button>
              <View className="w-[36] h-[36] rounded-[12] bg-stone-900 items-center justify-center"><Text className="text-sm font-semibold text-white">RK</Text></View>
            </HStack>
          </HStack>
          {themePanelOpen ? (
            <HStack testId="theme-panel" className="items-center justify-between border-b border-stone-300 bg-white px-6 py-4">
              <VStack className="gap-1">
                <Text className="text-sm font-medium text-stone-950">Theme</Text>
                <Text className="text-xs text-stone-500">Keep this simple and familiar.</Text>
              </VStack>
              <HStack className="gap-2">
                <Button onClick={toggleChatThemePanel} variant="ghost">Close</Button>
              </HStack>
            </HStack>
          ) : <View />}
          <Scroll testId="conversation-scroll" className="flex-1 overflow-y-auto">
            <VStack className="items-center px-6 py-6">
            <VStack testId="conversation-panel" className="w-[840] gap-5">
              <HStack className="justify-end">
                <View testId="msg-user-0" className="w-[720] rounded-[18] border border-stone-300 bg-stone-200 px-5 py-4">
                  <VStack className="w-[640] gap-4">
                    <Text className="text-sm leading-6 text-stone-900">
                      Build a clean TSN-native chat app with simulated login, themes, files, and a calm chat shell.
                    </Text>
                    <HStack className="gap-2">
                      {roadmap ? <View testId="attached-pill-0" className="rounded-[8] border border-stone-300 bg-white px-3 py-2"><Text className="text-xs text-stone-600">roadmap-q3.pdf</Text></View> : <View />}
                      {script ? <View testId="attached-pill-1" className="rounded-[8] border border-stone-300 bg-white px-3 py-2"><Text className="text-xs text-stone-600">demo-script.md</Text></View> : <View />}
                    </HStack>
                  </VStack>
                </View>
              </HStack>
              <HStack className="justify-start">
                <View testId="msg-assistant-0" className="w-[760] rounded-[18] border border-stone-300 bg-white px-5 py-5">
                  <VStack className="w-[680] gap-4">
                    <HStack className="items-center gap-3">
                      <View className="w-[32] h-[32] rounded-[10] bg-stone-900 items-center justify-center"><Text className="text-xs font-semibold text-white">◎</Text></View>
                      <VStack className="gap-1">
                        <Text className="text-sm font-medium text-stone-950">TSN Assistant</Text>
                        <Text className="text-xs text-stone-500">Drafting the oracle first</Text>
                      </VStack>
                    </HStack>
                    <View testId="thinking-panel-0" className="rounded-[14] border border-stone-300 bg-stone-50">
                      <VStack className="gap-0">
                        <Button testId="thinking-toggle-0" className="h-[48]" variant="ghost" onClick={toggleThinkingOpen}>Thinking</Button>
                        {thinkingOpen ? <Text className="px-4 pb-4 text-sm leading-6 text-stone-600">Start with the browser oracle and keep the native pass inside the current primitive set.</Text> : <View />}
                      </VStack>
                    </View>
                    <Text className="text-sm leading-6 text-stone-900">Keep the layout standard: compact sidebar, centered transcript, quiet header, and a simple composer.</Text>
                    <Text className="text-sm leading-6 text-stone-900">The interesting part is the state and composition, not dramatic styling.</Text>
                  </VStack>
                </View>
              </HStack>
            </VStack>
            </VStack>
          </Scroll>
          <VStack testId="composer-wrap" className="items-center gap-3 px-6 pb-6">
            <View className="max-w-[840] mx-auto rounded-[18] border border-stone-300 bg-white p-4">
              <VStack className="gap-3">
                {AttachmentRow(roadmap, script, notes, analytics, wireframe, handoff)}
                <HStack className="items-end gap-3">
                  <TextArea testId="composer-input" value={draft} onChange={onComposerChange} placeholder="Message TSN Chat…" className="flex-1 h-[72] bg-white" />
                  <Button testId="attach-btn" className="w-[40] h-[40]" variant="ghost" onClick={openAttachDialog}>＋</Button>
                  <Button testId="send-btn" className="w-[66] h-[40]" variant="primary">Send</Button>
                </HStack>
              </VStack>
            </View>
          </VStack>
        </VStack>
        {ContextRail(theme)}
      </HStack>
    )
  }

  if (theme === 'emerald') {
    return (
      <HStack className="flex-1 gap-0 bg-[#07120e]">
        <VStack testId="chat-main" className="flex-1 gap-0 bg-[#07120e]">
          <HStack testId="chat-header" className="h-[64] items-center justify-between border-b border-emerald-900 px-6">
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-emerald-50">Launch the TSN chat app</Text>
              <Text className="text-xs text-emerald-100/55">Simulated local workspace</Text>
            </VStack>
            <HStack className="items-center gap-2">
              <View testId="model-chip" className="rounded-[999] border border-emerald-900 bg-[#11231c] px-3 py-2"><Text className="text-xs text-emerald-100/70">GPT-5.4 • Simulated</Text></View>
              <Button testId="theme-panel-btn" variant="ghost" onClick={toggleChatThemePanel}>◐</Button>
              <View className="w-[36] h-[36] rounded-[12] bg-emerald-400 items-center justify-center"><Text className="text-sm font-semibold text-emerald-950">RK</Text></View>
            </HStack>
          </HStack>
          {themePanelOpen ? (
            <HStack testId="theme-panel" className="items-center justify-between border-b border-emerald-900 bg-[#11231c] px-6 py-4">
              <VStack className="gap-1">
                <Text className="text-sm font-medium text-emerald-50">Theme</Text>
                <Text className="text-xs text-emerald-100/55">Keep this simple and familiar.</Text>
              </VStack>
              <Button onClick={toggleChatThemePanel} variant="ghost">Close</Button>
            </HStack>
          ) : <View />}
          <Scroll testId="conversation-scroll" className="flex-1 overflow-y-auto">
            <VStack className="items-center px-6 py-6">
            <VStack testId="conversation-panel" className="max-w-[840] mx-auto gap-5">
              <HStack className="justify-end">
                <View testId="msg-user-0" className="w-[720] rounded-[18] border border-emerald-900 bg-[#163127] px-5 py-4">
                  <VStack className="w-[640] gap-4">
                    <Text className="text-sm leading-6 text-emerald-50">
                      Build a clean TSN-native chat app with simulated login, themes, files, and a calm chat shell.
                    </Text>
                    <HStack className="gap-2">
                      {roadmap ? <View testId="attached-pill-0" className="rounded-[8] border border-emerald-900 bg-[#11231c] px-3 py-2"><Text className="text-xs text-emerald-100/75">roadmap-q3.pdf</Text></View> : <View />}
                      {script ? <View testId="attached-pill-1" className="rounded-[8] border border-emerald-900 bg-[#11231c] px-3 py-2"><Text className="text-xs text-emerald-100/75">demo-script.md</Text></View> : <View />}
                    </HStack>
                  </VStack>
                </View>
              </HStack>
              <HStack className="justify-start">
                <View testId="msg-assistant-0" className="w-[760] rounded-[18] border border-emerald-900 bg-[#11231c] px-5 py-5">
                  <VStack className="w-[680] gap-4">
                    <HStack className="items-center gap-3">
                      <View className="w-[32] h-[32] rounded-[10] bg-emerald-400 items-center justify-center"><Text className="text-xs font-semibold text-emerald-950">◎</Text></View>
                      <VStack className="gap-1">
                        <Text className="text-sm font-medium text-emerald-50">TSN Assistant</Text>
                        <Text className="text-xs text-emerald-100/55">Drafting the oracle first</Text>
                      </VStack>
                    </HStack>
                    <View testId="thinking-panel-0" className="rounded-[14] border border-emerald-900 bg-[#163127]">
                      <VStack className="gap-0">
                        <Button testId="thinking-toggle-0" className="h-[48]" variant="ghost" onClick={toggleThinkingOpen}>Thinking</Button>
                        {thinkingOpen ? <Text className="px-4 pb-4 text-sm leading-6 text-emerald-100/75">Start with the browser oracle and keep the native pass inside the current primitive set.</Text> : <View />}
                      </VStack>
                    </View>
                    <Text className="text-sm leading-6 text-emerald-50">Keep the layout standard: compact sidebar, centered transcript, quiet header, and a simple composer.</Text>
                    <Text className="text-sm leading-6 text-emerald-50">The interesting part is the state and composition, not dramatic styling.</Text>
                  </VStack>
                </View>
              </HStack>
            </VStack>
            </VStack>
          </Scroll>
          <VStack testId="composer-wrap" className="items-center gap-3 px-6 pb-6">
            <View className="max-w-[840] mx-auto rounded-[18] border border-emerald-900 bg-[#11231c] p-4">
              <VStack className="gap-3">
                {AttachmentRow(roadmap, script, notes, analytics, wireframe, handoff)}
                <HStack className="items-end gap-3">
                  <TextArea testId="composer-input" value={draft} onChange={onComposerChange} placeholder="Message TSN Chat…" className="flex-1 h-[72] bg-[#11231c]" />
                  <Button testId="attach-btn" className="w-[40] h-[40]" variant="ghost" onClick={openAttachDialog}>＋</Button>
                  <Button testId="send-btn" className="w-[66] h-[40]" variant="primary">Send</Button>
                </HStack>
              </VStack>
            </View>
          </VStack>
        </VStack>
        {ContextRail(theme)}
      </HStack>
    )
  }

  return (
    <HStack className="flex-1 gap-0 bg-[#09090b]">
      <VStack testId="chat-main" className="flex-1 gap-0 bg-[#09090b]">
        <HStack testId="chat-header" className="h-[64] items-center justify-between border-b border-white/10 px-6">
          <VStack className="gap-1">
            <Text className="text-sm font-medium text-zinc-50">Launch the TSN chat app</Text>
            <Text className="text-xs text-zinc-500">Simulated local workspace</Text>
          </VStack>
          <HStack className="items-center gap-2">
            <View testId="model-chip" className="rounded-[999] border border-white/10 bg-[#232327] px-3 py-2"><Text className="text-xs text-zinc-400">GPT-5.4 • Simulated</Text></View>
            <Button testId="theme-panel-btn" variant="ghost" onClick={toggleChatThemePanel}>◐</Button>
            <View className="w-[36] h-[36] rounded-[12] bg-white items-center justify-center"><Text className="text-sm font-semibold text-zinc-950">RK</Text></View>
          </HStack>
        </HStack>
        {themePanelOpen ? (
          <HStack testId="theme-panel" className="items-center justify-between border-b border-white/10 bg-[#18181b] px-6 py-4">
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-zinc-50">Theme</Text>
              <Text className="text-xs text-zinc-500">Keep this simple and familiar.</Text>
            </VStack>
            <Button onClick={toggleChatThemePanel} variant="ghost">Close</Button>
          </HStack>
        ) : <View />}
        <Scroll testId="conversation-scroll" className="flex-1 overflow-y-auto">
          <VStack className="items-center px-6 py-6">
            <VStack testId="conversation-panel" className="max-w-[840] mx-auto gap-5">
            <HStack className="justify-end">
              <View testId="msg-user-0" className="w-[720] rounded-[18] border border-white/10 bg-[#27272a] px-5 py-4">
                <VStack className="gap-4">
                  <Text className="text-sm leading-6 text-zinc-50">
                    Build a clean TSN-native chat app that feels close to ChatGPT. Keep the design standard, keep the architecture honest, and simulate login, themes, files, and thinking UI.
                  </Text>
                  <HStack className="gap-2">
                    {roadmap ? <View testId="attached-pill-0" className="rounded-[8] border border-white/10 bg-[#232327] px-3 py-2"><Text className="text-xs text-zinc-400">roadmap-q3.pdf</Text></View> : <View />}
                    {script ? <View testId="attached-pill-1" className="rounded-[8] border border-white/10 bg-[#232327] px-3 py-2"><Text className="text-xs text-zinc-400">demo-script.md</Text></View> : <View />}
                  </HStack>
                </VStack>
              </View>
            </HStack>
            <HStack className="justify-start mt-1">
              <View testId="msg-assistant-0" className="w-[760] rounded-[18] border border-white/10 bg-[#18181b] px-5 py-7">
                <VStack className="gap-4">
                  <HStack className="items-center gap-3">
                    <View className="w-[32] h-[32] rounded-[10] bg-white items-center justify-center"><Text className="text-xs font-semibold text-zinc-950">◎</Text></View>
                    <VStack className="gap-1">
                      <Text className="text-sm font-medium text-zinc-50">TSN Assistant</Text>
                      <Text className="text-xs text-zinc-500">Drafting the oracle first</Text>
                    </VStack>
                  </HStack>
                  <View testId="thinking-panel-0" className="w-[720] rounded-[14] border border-white/10 bg-[#232327]">
                    <VStack className="gap-0">
                      <Button testId="thinking-toggle-0" className="h-[48]" variant="ghost" onClick={toggleThinkingOpen}>Thinking</Button>
                      {thinkingOpen ? <Text className="px-4 pb-4 text-sm leading-6 text-zinc-400">Start with a browser oracle, keep the surfaces flat, and make the native version prove the primitive split by avoiding framework edits unless a real low-level gap shows up.</Text> : <View />}
                    </VStack>
                  </View>
                  <Text className="text-sm leading-6 text-zinc-50">I’d keep the shell very standard: a compact sidebar, a centered transcript, a quiet header, and a composer with attachments and a send action.</Text>
                  <Text className="text-sm leading-6 text-zinc-50">The interesting part is the state and composition, not dramatic styling. This should feel familiar before it feels fancy.</Text>
                </VStack>
              </View>
            </HStack>
          </VStack>
          </VStack>
        </Scroll>
        <VStack testId="composer-wrap" className="items-center gap-3 px-6 pb-6">
          <View className="max-w-[840] mx-auto rounded-[18] border border-white/10 bg-[#18181b] p-4">
            <VStack className="gap-3">
              {AttachmentRow(roadmap, script, notes, analytics, wireframe, handoff)}
              <HStack className="items-end gap-3">
                <TextArea testId="composer-input" value={draft} onChange={onComposerChange} placeholder="Message TSN Chat…" className="flex-1 h-[72] bg-[#18181b]" />
                <Button testId="attach-btn" className="w-[40] h-[40]" variant="ghost" onClick={openAttachDialog}>＋</Button>
                <Button testId="send-btn" className="w-[66] h-[40]" variant="primary">Send</Button>
              </HStack>
            </VStack>
          </View>
        </VStack>
      </VStack>
      {ContextRail(theme)}
    </HStack>
  )
}
