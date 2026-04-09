import { beginChatLogin } from './state'

export function ChatLoginScreen(theme: string) {
  if (theme === 'stone') {
    return (
      <HStack testId="login-screen" className="flex-1 items-center justify-center bg-stone-100 p-6">
        <HStack className="w-[980] h-[720] gap-0 rounded-[28] border border-stone-300 bg-white overflow-hidden">
          <VStack className="flex-1 gap-6 bg-stone-50 p-12">
            <Text className="text-xs font-medium uppercase tracking-[2] text-stone-500">Chat oracle</Text>
            <VStack className="gap-2">
              <Text className="text-4xl font-semibold text-stone-950">A clean</Text>
              <Text className="text-4xl font-semibold text-stone-950">chat shell.</Text>
            </VStack>
            <Text className="text-base leading-[26] text-stone-600">
              Simulated sign-in first. Then a quiet chat workspace.
            </Text>
            <HStack className="gap-4">
              <View className="w-[164] h-[132] rounded-[20] border border-stone-300 bg-white p-5">
                <VStack className="gap-3">
                  <Text className="text-xs font-medium uppercase tracking-[2] text-stone-500">Flow</Text>
                  <Text className="text-sm leading-[22] text-stone-900">Sign in and restore the last draft.</Text>
                </VStack>
              </View>
              <View className="w-[164] h-[132] rounded-[20] border border-stone-300 bg-white p-5">
                <VStack className="gap-3">
                  <Text className="text-xs font-medium uppercase tracking-[2] text-stone-500">UI</Text>
                  <Text className="text-sm leading-[22] text-stone-900">Sidebar, transcript, composer, and files.</Text>
                </VStack>
              </View>
            </HStack>
          </VStack>
          <HStack className="flex-1 items-center justify-center bg-stone-50 p-12">
            <View testId="login-card" className="w-[380] rounded-[24] border border-stone-300 bg-white p-8">
              <VStack className="gap-6">
                <View className="w-[48] h-[48] rounded-[16] bg-stone-900 items-center justify-center">
                  <Text className="text-lg font-semibold text-white">◎</Text>
                </View>
                <VStack className="gap-2">
                  <Text className="text-[34] font-semibold leading-[38] text-stone-950">Welcome back</Text>
                  <Text className="text-sm leading-6 text-stone-600">
                    Continue with a simulated Apple sign-in. No networking, just local state transitions.
                  </Text>
                </VStack>
                <Button testId="apple-login-btn" className="h-[48]" variant="primary" onClick={beginChatLogin}>Continue with Apple</Button>
                <Button className="h-[48]" variant="ghost">Continue with email</Button>
              </VStack>
            </View>
          </HStack>
        </HStack>
      </HStack>
    )
  }

  if (theme === 'emerald') {
    return (
      <HStack testId="login-screen" className="flex-1 items-center justify-center bg-[#07120e] p-6">
        <HStack className="w-[980] h-[720] gap-0 rounded-[28] border border-emerald-900 bg-[#0b1713] overflow-hidden">
          <VStack className="flex-1 gap-6 bg-[#0e1c16] p-12">
            <Text className="text-xs font-medium uppercase tracking-[2] text-emerald-300/60">Chat oracle</Text>
            <VStack className="gap-2">
              <Text className="text-4xl font-semibold text-emerald-50">A clean</Text>
              <Text className="text-4xl font-semibold text-emerald-50">chat shell.</Text>
            </VStack>
            <Text className="text-base leading-[26] text-emerald-100/70">
              Simulated sign-in first. Then a quiet chat workspace.
            </Text>
            <HStack className="gap-4">
              <View className="w-[164] h-[132] rounded-[20] border border-emerald-900 bg-[#11231c] p-5">
                <VStack className="gap-3">
                  <Text className="text-xs font-medium uppercase tracking-[2] text-emerald-300/60">Flow</Text>
                  <Text className="text-sm leading-[22] text-emerald-50">Sign in and restore the last draft.</Text>
                </VStack>
              </View>
              <View className="w-[164] h-[132] rounded-[20] border border-emerald-900 bg-[#11231c] p-5">
                <VStack className="gap-3">
                  <Text className="text-xs font-medium uppercase tracking-[2] text-emerald-300/60">UI</Text>
                  <Text className="text-sm leading-[22] text-emerald-50">Sidebar, transcript, composer, and files.</Text>
                </VStack>
              </View>
            </HStack>
          </VStack>
          <HStack className="flex-1 items-center justify-center bg-[#0c1714] p-12">
            <View testId="login-card" className="w-[380] rounded-[24] border border-emerald-900 bg-[#11231c] p-8">
              <VStack className="gap-6">
                <View className="w-[48] h-[48] rounded-[16] bg-emerald-400 items-center justify-center">
                  <Text className="text-lg font-semibold text-emerald-950">◎</Text>
                </View>
                <VStack className="gap-2">
                  <Text className="text-[34] font-semibold leading-[38] text-emerald-50">Welcome back</Text>
                  <Text className="text-sm leading-6 text-emerald-100/70">
                    Continue with a simulated Apple sign-in. No networking, just local state transitions.
                  </Text>
                </VStack>
                <Button testId="apple-login-btn" className="h-[48]" variant="primary" onClick={beginChatLogin}>Continue with Apple</Button>
                <Button className="h-[48]" variant="ghost">Continue with email</Button>
              </VStack>
            </View>
          </HStack>
        </HStack>
      </HStack>
    )
  }

  return (
    <HStack testId="login-screen" className="flex-1 items-center justify-center bg-[#09090b] p-6">
      <HStack className="w-[980] h-[720] gap-0 rounded-[28] border border-white/10 bg-[#18181b] overflow-hidden">
          <VStack className="flex-1 gap-6 bg-[#1f1f23] p-12">
            <Text className="text-xs font-medium uppercase tracking-[2] text-zinc-400">Chat oracle</Text>
          <VStack className="gap-2">
            <Text className="text-4xl font-semibold text-zinc-50">A clean</Text>
            <Text className="text-4xl font-semibold text-zinc-50">chat shell.</Text>
          </VStack>
          <Text className="text-base leading-[26] text-zinc-400">
            Simulated sign-in first. Then a quiet chat workspace.
          </Text>
          <HStack className="gap-4">
            <View className="w-[164] h-[132] rounded-[20] border border-white/10 bg-[#232327] p-5">
              <VStack className="gap-3">
                <Text className="text-xs font-medium uppercase tracking-[2] text-zinc-500">Flow</Text>
                <Text className="text-sm leading-[22] text-zinc-100">Sign in and restore the last draft.</Text>
              </VStack>
            </View>
            <View className="w-[164] h-[132] rounded-[20] border border-white/10 bg-[#232327] p-5">
              <VStack className="gap-3">
                <Text className="text-xs font-medium uppercase tracking-[2] text-zinc-500">UI</Text>
                <Text className="text-sm leading-[22] text-zinc-100">Sidebar, transcript, composer, and files.</Text>
              </VStack>
            </View>
          </HStack>
        </VStack>
        <HStack className="flex-1 items-center justify-center bg-[#1b1b1f] p-12">
          <View testId="login-card" className="w-[380] rounded-[24] border border-white/10 bg-[#232327] p-8">
            <VStack>
              <View className="w-[48] h-[48] rounded-[16] bg-white items-center justify-center">
                <Text className="text-lg font-semibold text-zinc-950">◎</Text>
              </View>
              <Text className="mt-6 text-3xl font-semibold text-zinc-50">Welcome back</Text>
              <Text className="mt-2 text-sm leading-6 text-zinc-400">
                  Continue with a simulated Apple sign-in. No networking, just local state transitions.
              </Text>
              <Button testId="apple-login-btn" className="mt-8 h-[48]" variant="primary" onClick={beginChatLogin}>Continue with Apple</Button>
              <Button className="mt-3 h-[48]" variant="ghost">Continue with email</Button>
            </VStack>
          </View>
        </HStack>
      </HStack>
    </HStack>
  )
}
