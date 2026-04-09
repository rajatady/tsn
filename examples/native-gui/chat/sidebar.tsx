import {
  setChatThemeEmerald,
  setChatThemeSlate,
  setChatThemeStone,
  toggleChatSidebar,
} from './state'

export function ChatSidebar(theme: string, collapsed: boolean) {
  if (theme === 'stone') {
    let content: JSX.Element = (
      <>
        <HStack className="items-center justify-between">
          <HStack className="items-center gap-3">
            <View className="w-[40] h-[40] rounded-[12] bg-stone-900 items-center justify-center">
              <Text className="text-sm font-semibold text-white">◎</Text>
            </View>
            {collapsed ? <View /> : (
              <VStack className="gap-1">
                <Text className="text-sm font-medium text-stone-950">TSN Chat</Text>
                <Text className="text-xs text-stone-500">Personal workspace</Text>
              </VStack>
            )}
          </HStack>
          <Button testId="sidebar-collapse-btn" variant="ghost" onClick={toggleChatSidebar}>≡</Button>
        </HStack>
        <Button testId="new-chat-btn" variant="primary">New chat</Button>
        {collapsed ? <View /> : <View className="h-[44] rounded-[12] border border-stone-300 bg-white px-4 py-3"><Text className="text-sm text-stone-500">Search chats</Text></View>}
        {collapsed ? <View /> : <Text className="text-xs font-medium uppercase tracking-[2] text-stone-500">Recent</Text>}
        <VStack className="gap-1">
          <View testId="nav-chat" className="rounded-[12] bg-stone-200 px-3 py-3">
            {collapsed ? <Text className="text-sm text-stone-950">●</Text> : <Text className="text-sm font-medium text-stone-950">Today’s draft</Text>}
          </View>
          <View className="rounded-[12] px-3 py-3">{collapsed ? <Text className="text-sm text-stone-500">●</Text> : <Text className="text-sm text-stone-600">Design review</Text>}</View>
          <View className="rounded-[12] px-3 py-3">{collapsed ? <Text className="text-sm text-stone-500">●</Text> : <Text className="text-sm text-stone-600">Launch notes</Text>}</View>
        </VStack>
        {collapsed ? <View /> : <Text className="text-xs font-medium uppercase tracking-[2] text-stone-500">Themes</Text>}
        {collapsed ? (
          <VStack className="gap-2">
            <Button onClick={setChatThemeSlate} variant="ghost">S</Button>
            <Button onClick={setChatThemeStone} variant="ghost">O</Button>
            <Button onClick={setChatThemeEmerald} variant="ghost">E</Button>
          </VStack>
        ) : (
          <HStack testId="theme-switcher" className="gap-2">
            <Button testId="theme-slate" onClick={setChatThemeSlate} variant="ghost">Slate</Button>
            <Button testId="theme-stone" onClick={setChatThemeStone} variant="secondary">Stone</Button>
            <Button testId="theme-emerald" onClick={setChatThemeEmerald} variant="ghost">Emerald</Button>
          </HStack>
        )}
        <Spacer />
        {collapsed ? <View /> : (
          <VStack className="gap-2">
            <Text className="text-xs font-medium uppercase tracking-[2] text-stone-500">Pinned Files</Text>
            <View className="rounded-[14] border border-stone-300 bg-white p-3">
              <VStack className="gap-1">
                <Text className="text-sm font-medium text-stone-950">roadmap-q3.pdf</Text>
                <Text className="text-xs text-stone-500">Attached in this chat</Text>
              </VStack>
            </View>
            <View className="rounded-[14] border border-stone-300 bg-white p-3">
              <VStack className="gap-1">
                <Text className="text-sm font-medium text-stone-950">demo-script.md</Text>
                <Text className="text-xs text-stone-500">Working draft</Text>
              </VStack>
            </View>
          </VStack>
        )}
      </>
    )

    if (collapsed) {
      return <VStack testId="sidebar" className="w-[84] min-w-[84] h-full gap-4 border-r border-stone-300 bg-stone-50 p-4">{content}</VStack>
    }
    return (
      <VStack testId="sidebar" className="w-[272] min-w-[272] h-full gap-4 border-r border-stone-300 bg-stone-50 p-4">
        {content}
      </VStack>
    )
  }

  if (theme === 'emerald') {
    let content: JSX.Element = (
      <>
        <HStack className="items-center justify-between">
          <HStack className="items-center gap-3">
            <View className="w-[40] h-[40] rounded-[12] bg-emerald-400 items-center justify-center">
              <Text className="text-sm font-semibold text-emerald-950">◎</Text>
            </View>
            {collapsed ? <View /> : (
              <VStack className="gap-1">
                <Text className="text-sm font-medium text-emerald-50">TSN Chat</Text>
                <Text className="text-xs text-emerald-100/50">Personal workspace</Text>
              </VStack>
            )}
          </HStack>
          <Button testId="sidebar-collapse-btn" variant="ghost" onClick={toggleChatSidebar}>≡</Button>
        </HStack>
        <Button testId="new-chat-btn" variant="primary">New chat</Button>
        {collapsed ? <View /> : <View className="h-[44] rounded-[12] border border-emerald-900 bg-[#12231c] px-4 py-3"><Text className="text-sm text-emerald-100/55">Search chats</Text></View>}
        {collapsed ? <View /> : <Text className="text-xs font-medium uppercase tracking-[2] text-emerald-100/45">Recent</Text>}
        <VStack className="gap-1">
          <View testId="nav-chat" className="rounded-[12] bg-[#163127] px-3 py-3">
            {collapsed ? <Text className="text-sm text-emerald-100">●</Text> : <Text className="text-sm font-medium text-emerald-50">Today’s draft</Text>}
          </View>
          <View className="rounded-[12] px-3 py-3">{collapsed ? <Text className="text-sm text-emerald-100/55">●</Text> : <Text className="text-sm text-emerald-100/75">Design review</Text>}</View>
          <View className="rounded-[12] px-3 py-3">{collapsed ? <Text className="text-sm text-emerald-100/55">●</Text> : <Text className="text-sm text-emerald-100/75">Launch notes</Text>}</View>
        </VStack>
        {collapsed ? <View /> : <Text className="text-xs font-medium uppercase tracking-[2] text-emerald-100/45">Themes</Text>}
        {collapsed ? (
          <VStack className="gap-2">
            <Button onClick={setChatThemeSlate} variant="ghost">S</Button>
            <Button onClick={setChatThemeStone} variant="ghost">O</Button>
            <Button onClick={setChatThemeEmerald} variant="secondary">E</Button>
          </VStack>
        ) : (
          <HStack testId="theme-switcher" className="gap-2">
            <Button testId="theme-slate" onClick={setChatThemeSlate} variant="ghost">Slate</Button>
            <Button testId="theme-stone" onClick={setChatThemeStone} variant="ghost">Stone</Button>
            <Button testId="theme-emerald" onClick={setChatThemeEmerald} variant="secondary">Emerald</Button>
          </HStack>
        )}
        <Spacer />
        {collapsed ? <View /> : (
          <VStack className="gap-2">
            <Text className="text-xs font-medium uppercase tracking-[2] text-emerald-100/45">Pinned Files</Text>
            <View className="rounded-[14] border border-emerald-900 bg-[#12231c] p-3">
              <VStack className="gap-1">
                <Text className="text-sm font-medium text-emerald-50">roadmap-q3.pdf</Text>
                <Text className="text-xs text-emerald-100/55">Attached in this chat</Text>
              </VStack>
            </View>
            <View className="rounded-[14] border border-emerald-900 bg-[#12231c] p-3">
              <VStack className="gap-1">
                <Text className="text-sm font-medium text-emerald-50">demo-script.md</Text>
                <Text className="text-xs text-emerald-100/55">Working draft</Text>
              </VStack>
            </View>
          </VStack>
        )}
      </>
    )

    if (collapsed) {
      return <VStack testId="sidebar" className="w-[84] min-w-[84] h-full gap-4 border-r border-emerald-900 bg-[#091611] p-4">{content}</VStack>
    }
    return (
      <VStack testId="sidebar" className="w-[272] min-w-[272] h-full gap-4 border-r border-emerald-900 bg-[#091611] p-4">
        {content}
      </VStack>
    )
  }

  let content: JSX.Element = (
    <>
      <HStack className="items-center justify-between">
        <HStack className="items-center gap-3">
          <View className="w-[40] h-[40] rounded-[12] bg-white items-center justify-center">
            <Text className="text-sm font-semibold text-zinc-950">◎</Text>
          </View>
          {collapsed ? <View /> : (
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-zinc-50">TSN Chat</Text>
              <Text className="text-xs text-zinc-500">Personal workspace</Text>
            </VStack>
          )}
        </HStack>
        <Button testId="sidebar-collapse-btn" variant="ghost" onClick={toggleChatSidebar}>≡</Button>
      </HStack>
      <Button testId="new-chat-btn" variant="primary">New chat</Button>
      {collapsed ? <View /> : <View className="h-[44] rounded-[12] border border-white/10 bg-[#232327] px-4 py-3"><Text className="text-sm text-zinc-500">Search chats</Text></View>}
      {collapsed ? <View /> : <Text className="text-xs font-medium uppercase tracking-[2] text-zinc-500">Recent</Text>}
      <VStack className="gap-1">
        <View testId="nav-chat" className="rounded-[12] bg-[#232327] px-3 py-3">
          {collapsed ? <Text className="text-sm text-zinc-100">●</Text> : <Text className="text-sm font-medium text-zinc-50">Today’s draft</Text>}
        </View>
        <View className="rounded-[12] px-3 py-3">{collapsed ? <Text className="text-sm text-zinc-500">●</Text> : <Text className="text-sm text-zinc-400">Design review</Text>}</View>
        <View className="rounded-[12] px-3 py-3">{collapsed ? <Text className="text-sm text-zinc-500">●</Text> : <Text className="text-sm text-zinc-400">Launch notes</Text>}</View>
      </VStack>
      {collapsed ? <View /> : <Text className="text-xs font-medium uppercase tracking-[2] text-zinc-500">Themes</Text>}
      {collapsed ? (
        <VStack className="gap-2">
          <Button onClick={setChatThemeSlate} variant="secondary">S</Button>
          <Button onClick={setChatThemeStone} variant="ghost">O</Button>
          <Button onClick={setChatThemeEmerald} variant="ghost">E</Button>
        </VStack>
      ) : (
        <HStack testId="theme-switcher" className="gap-2">
          <Button testId="theme-slate" onClick={setChatThemeSlate} variant="secondary">Slate</Button>
          <Button testId="theme-stone" onClick={setChatThemeStone} variant="ghost">Stone</Button>
          <Button testId="theme-emerald" onClick={setChatThemeEmerald} variant="ghost">Emerald</Button>
        </HStack>
      )}
      <Spacer />
      {collapsed ? <View /> : (
        <VStack className="gap-2">
          <Text className="text-xs font-medium uppercase tracking-[2] text-zinc-500">Pinned Files</Text>
          <View className="rounded-[14] border border-white/10 bg-[#232327] p-3">
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-zinc-50">roadmap-q3.pdf</Text>
              <Text className="text-xs text-zinc-500">Attached in this chat</Text>
            </VStack>
          </View>
          <View className="rounded-[14] border border-white/10 bg-[#232327] p-3">
            <VStack className="gap-1">
              <Text className="text-sm font-medium text-zinc-50">demo-script.md</Text>
              <Text className="text-xs text-zinc-500">Working draft</Text>
            </VStack>
          </View>
        </VStack>
      )}
    </>
  )

  if (collapsed) {
    return <VStack testId="sidebar" className="w-[84] min-w-[84] h-full gap-4 border-r border-white/10 bg-[#121214] p-4">{content}</VStack>
  }
  return (
    <VStack testId="sidebar" className="w-[272] min-w-[272] h-full gap-4 border-r border-white/10 bg-[#121214] p-4">
      {content}
    </VStack>
  )
}
