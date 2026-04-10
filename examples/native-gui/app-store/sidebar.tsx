import { useRoute, useStore } from '../../../packages/tsn-ui/src/react'
import { activeStorefrontRoute } from './navigation'

function handleSidebarSearch(text: string) {
}

interface NavItemProps {
  glyph: string
  label: string
  route: string
}

function NavItem({ glyph, label, route }: NavItemProps) {
  const [currentRoute, navigate] = useRoute('discover')
  const [returnRoute, setReturnRoute] = useStore<string>('app-store:return-route', 'discover')
  const activeRoute: string = activeStorefrontRoute(currentRoute, returnRoute)
  const active: boolean = activeRoute === route

  if (active) {
    if (route === 'discover') {
      return (
        <HStack
          testId="nav-discover"
          className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] font-medium text-white bg-white/[0.08]"
          onClick={() => { setReturnRoute('discover'); navigate('discover') }}
        >
          <Text className="text-[#3b9aff]">{glyph}</Text>
          <Text className="text-[14px] font-medium text-white">{label}</Text>
        </HStack>
      )
    }

    if (route === 'arcade') {
      return (
        <HStack
          testId="nav-arcade"
          className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] font-medium text-white bg-white/[0.08]"
          onClick={() => { setReturnRoute('arcade'); navigate('arcade') }}
        >
          <Text className="text-[#3b9aff]">{glyph}</Text>
          <Text className="text-[14px] font-medium text-white">{label}</Text>
        </HStack>
      )
    }

    if (route === 'play') {
      return (
        <HStack
          testId="nav-play"
          className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] font-medium text-white bg-white/[0.08]"
          onClick={() => { setReturnRoute('play'); navigate('play') }}
        >
          <Text className="text-[#3b9aff]">{glyph}</Text>
          <Text className="text-[14px] font-medium text-white">{label}</Text>
        </HStack>
      )
    }

    if (route === 'develop') {
      return (
        <HStack
          testId="nav-develop"
          className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] font-medium text-white bg-white/[0.08]"
          onClick={() => { setReturnRoute('develop'); navigate('develop') }}
        >
          <Text className="text-[#3b9aff]">{glyph}</Text>
          <Text className="text-[14px] font-medium text-white">{label}</Text>
        </HStack>
      )
    }

    if (route === 'create') {
      return (
        <HStack testId="nav-create" className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] font-medium text-white bg-white/[0.08]">
          <Text className="text-[#3b9aff]">{glyph}</Text>
          <Text className="text-[14px] font-medium text-white">{label}</Text>
        </HStack>
      )
    }

    if (route === 'work') {
      return (
        <HStack testId="nav-work" className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] font-medium text-white bg-white/[0.08]">
          <Text className="text-[#3b9aff]">{glyph}</Text>
          <Text className="text-[14px] font-medium text-white">{label}</Text>
        </HStack>
      )
    }

    return (
      <HStack testId="nav-categories" className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] font-medium text-white bg-white/[0.08]">
        <Text className="text-[#3b9aff]">{glyph}</Text>
        <Text className="text-[14px] font-medium text-white">{label}</Text>
      </HStack>
    )
  }

  if (route === 'discover') {
    return (
      <HStack
        testId="nav-discover"
        className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] text-white/75"
        onClick={() => { setReturnRoute('discover'); navigate('discover') }}
      >
        <Text className="text-white/40">{glyph}</Text>
        <Text className="text-[14px] text-white/75">{label}</Text>
      </HStack>
    )
  }

  if (route === 'arcade') {
    return (
      <HStack
        testId="nav-arcade"
        className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] text-white/75"
        onClick={() => { setReturnRoute('arcade'); navigate('arcade') }}
      >
        <Text className="text-white/40">{glyph}</Text>
        <Text className="text-[14px] text-white/75">{label}</Text>
      </HStack>
    )
  }

  if (route === 'play') {
    return (
      <HStack
        testId="nav-play"
        className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] text-white/75"
        onClick={() => { setReturnRoute('play'); navigate('play') }}
      >
        <Text className="text-white/40">{glyph}</Text>
        <Text className="text-[14px] text-white/75">{label}</Text>
      </HStack>
    )
  }

  if (route === 'develop') {
    return (
      <HStack
        testId="nav-develop"
        className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] text-white/75"
        onClick={() => { setReturnRoute('develop'); navigate('develop') }}
      >
        <Text className="text-white/40">{glyph}</Text>
        <Text className="text-[14px] text-white/75">{label}</Text>
      </HStack>
    )
  }

  if (route === 'create') {
    return (
      <HStack testId="nav-create" className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] text-white/75">
        <Text className="text-white/40">{glyph}</Text>
        <Text className="text-[14px] text-white/75">{label}</Text>
      </HStack>
    )
  }

  if (route === 'work') {
    return (
      <HStack testId="nav-work" className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] text-white/75">
        <Text className="text-white/40">{glyph}</Text>
        <Text className="text-[14px] text-white/75">{label}</Text>
      </HStack>
    )
  }

  return (
    <HStack testId="nav-categories" className="items-center gap-3 px-3 py-[7px] rounded-lg text-[14px] text-white/75">
      <Text className="text-white/40">{glyph}</Text>
      <Text className="text-[14px] text-white/75">{label}</Text>
    </HStack>
  )
}

export function AppStoreSidebar() {
  return (
    <VStack testId="sidebar" className="w-[240px] min-w-[240px] h-full gap-0 bg-[#1a1a1c]">
      <VStack className="h-[52px] justify-end px-5 pb-2">
        <HStack className="items-center gap-1.5">
          <Text className="text-[15px] font-semibold text-white/90 tracking-tight">App Store</Text>
          <Text className="text-[13px] text-white/40 ml-0.5">for Mac</Text>
        </HStack>
      </VStack>

      <VStack testId="sidebar-search" className="px-4 mt-3 mb-3">
        <HStack className="items-center gap-2 bg-white/[0.04] rounded-lg px-2.5 py-[6px] text-white/25 text-[13px]">
          <Text className="text-[13px] text-white/25">Search</Text>
        </HStack>
      </VStack>

      <VStack className="flex-1 px-3 space-y-[1px]">
        <NavItem glyph="✦" label="Discover" route="discover" />
        <NavItem glyph="⚖" label="Arcade" route="arcade" />
        <NavItem glyph="✎" label="Create" route="create" />
        <NavItem glyph="➤" label="Work" route="work" />
        <NavItem glyph="▶" label="Play" route="play" />
        <NavItem glyph={'</>'} label="Develop" route="develop" />
        <NavItem glyph="☷" label="Categories" route="categories" />
      </VStack>
    </VStack>
  )
}
