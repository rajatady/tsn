import { useRoute, useStore } from '../../../packages/tsn-ui/src/react'
import { activeStorefrontRoute } from './navigation'
import { AppStoreContent } from './content'

function storefrontTitle(route: string): string {
  if (route === 'arcade') return 'Arcade'
  if (route === 'play') return 'Play'
  if (route === 'develop') return 'Develop'
  return 'Today'
}

function IOSTodayTab() {
  const [currentRoute, navigate] = useRoute('discover')
  const [returnRoute, setReturnRoute] = useStore<string>('app-store:return-route', 'discover')
  const activeRoute: string = activeStorefrontRoute(currentRoute, returnRoute)
  const active: boolean = activeRoute === 'discover'

  if (active) {
    return (
      <VStack
        testId="ios-tab-today"
        className="flex-1 items-center justify-center gap-[3px] py-2"
        onClick={() => { setReturnRoute('discover'); navigate('discover') }}
      >
        <Text className="text-[16px] text-[#3b9aff]">◉</Text>
        <Text className="text-[11px] font-semibold text-[#3b9aff]">Today</Text>
      </VStack>
    )
  }

  return (
    <VStack
      testId="ios-tab-today"
      className="flex-1 items-center justify-center gap-[3px] py-2"
      onClick={() => { setReturnRoute('discover'); navigate('discover') }}
    >
      <Text className="text-[16px] text-white/35">◉</Text>
      <Text className="text-[11px] text-white/45">Today</Text>
    </VStack>
  )
}

function IOSArcadeTab() {
  const [currentRoute, navigate] = useRoute('discover')
  const [returnRoute, setReturnRoute] = useStore<string>('app-store:return-route', 'discover')
  const activeRoute: string = activeStorefrontRoute(currentRoute, returnRoute)
  const active: boolean = activeRoute === 'arcade'

  if (active) {
    return (
      <VStack
        testId="ios-tab-arcade"
        className="flex-1 items-center justify-center gap-[3px] py-2"
        onClick={() => { setReturnRoute('arcade'); navigate('arcade') }}
      >
        <Text className="text-[16px] text-[#3b9aff]">◎</Text>
        <Text className="text-[11px] font-semibold text-[#3b9aff]">Arcade</Text>
      </VStack>
    )
  }

  return (
    <VStack
      testId="ios-tab-arcade"
      className="flex-1 items-center justify-center gap-[3px] py-2"
      onClick={() => { setReturnRoute('arcade'); navigate('arcade') }}
    >
      <Text className="text-[16px] text-white/35">◎</Text>
      <Text className="text-[11px] text-white/45">Arcade</Text>
    </VStack>
  )
}

function IOSPlayTab() {
  const [currentRoute, navigate] = useRoute('discover')
  const [returnRoute, setReturnRoute] = useStore<string>('app-store:return-route', 'discover')
  const activeRoute: string = activeStorefrontRoute(currentRoute, returnRoute)
  const active: boolean = activeRoute === 'play'

  if (active) {
    return (
      <VStack
        testId="ios-tab-play"
        className="flex-1 items-center justify-center gap-[3px] py-2"
        onClick={() => { setReturnRoute('play'); navigate('play') }}
      >
        <Text className="text-[16px] text-[#3b9aff]">▶</Text>
        <Text className="text-[11px] font-semibold text-[#3b9aff]">Play</Text>
      </VStack>
    )
  }

  return (
    <VStack
      testId="ios-tab-play"
      className="flex-1 items-center justify-center gap-[3px] py-2"
      onClick={() => { setReturnRoute('play'); navigate('play') }}
    >
      <Text className="text-[16px] text-white/35">▶</Text>
      <Text className="text-[11px] text-white/45">Play</Text>
    </VStack>
  )
}

function IOSDevelopTab() {
  const [currentRoute, navigate] = useRoute('discover')
  const [returnRoute, setReturnRoute] = useStore<string>('app-store:return-route', 'discover')
  const activeRoute: string = activeStorefrontRoute(currentRoute, returnRoute)
  const active: boolean = activeRoute === 'develop'

  if (active) {
    return (
      <VStack
        testId="ios-tab-develop"
        className="flex-1 items-center justify-center gap-[3px] py-2"
        onClick={() => { setReturnRoute('develop'); navigate('develop') }}
      >
        <Text className="text-[16px] text-[#3b9aff]">{'</>'}</Text>
        <Text className="text-[11px] font-semibold text-[#3b9aff]">Develop</Text>
      </VStack>
    )
  }

  return (
    <VStack
      testId="ios-tab-develop"
      className="flex-1 items-center justify-center gap-[3px] py-2"
      onClick={() => { setReturnRoute('develop'); navigate('develop') }}
    >
      <Text className="text-[16px] text-white/35">{'</>'}</Text>
      <Text className="text-[11px] text-white/45">Develop</Text>
    </VStack>
  )
}

function IOSHeader() {
  const [currentRoute, navigate] = useRoute('discover')
  const [returnRoute, setReturnRoute] = useStore<string>('app-store:return-route', 'discover')
  const activeRoute: string = activeStorefrontRoute(currentRoute, returnRoute)
  const title: string = storefrontTitle(activeRoute)

  return (
    <VStack className="gap-0 px-5 pt-5 pb-3 bg-[#0f1014] border-b border-white/[0.06]">
      <HStack className="items-center gap-3 mb-3">
        <VStack className="gap-0">
          <Text className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/35">App Store</Text>
          <Text className="text-[30px] font-bold tracking-tight text-white">{title}</Text>
        </VStack>
        <Spacer />
        <ZStack className="w-[34] h-[34] rounded-full overflow-hidden bg-[#1f2025] items-center justify-center">
          <Text className="text-[12px] font-bold text-white/80">RJ</Text>
        </ZStack>
      </HStack>

      <HStack className="items-center gap-2 rounded-[18px] bg-white/[0.05] px-4 py-3">
        <Text className="text-[13px] text-white/35">Search apps, games, stories</Text>
      </HStack>
    </VStack>
  )
}

function IOSBottomBar() {
  return (
    <HStack className="items-center gap-0 px-2 pt-2 pb-4 bg-[#0f1014] border-t border-white/[0.06]">
      <IOSTodayTab />
      <IOSArcadeTab />
      <IOSPlayTab />
      <IOSDevelopTab />
    </HStack>
  )
}

export function IOSApp() {
  const [route, navigate] = useRoute('discover')

  return (
    <Window title="App Store" width={430} height={932} dark subtitle="iOS shell">
      <VStack className="flex-1 gap-0 bg-[#161617]">
        <IOSHeader />
        <VStack className="flex-1 min-h-0 bg-[#161617]">
          <AppStoreContent route={route} />
        </VStack>
        <IOSBottomBar />
      </VStack>
    </Window>
  )
}
