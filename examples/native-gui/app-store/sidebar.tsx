import { useRoute, useStore } from '../../../packages/tsn-ui/src/react'
import { activeStorefrontRoute } from './navigation'

function handleSidebarSearch(text: string) {
}

interface NavItemProps {
  glyph: string
  label: string
  route: string
}

interface NavItemContentProps {
  glyph: string
  label: string
  active: boolean
}

function NavItemContent({ glyph, label, active }: NavItemContentProps) {
  const rowClass: string = active
    ? 'items-center gap-3 px-3 py-[7] rounded-lg text-[14] font-medium text-white bg-white/8'
    : 'items-center gap-3 px-3 py-[7] rounded-lg text-[14] text-white/75'
  const iconClass: string = active ? 'text-[#3b9aff]' : 'text-white/40'
  const labelClass: string = active
    ? 'text-[14] font-medium text-white truncate'
    : 'text-[14] text-white/75 truncate'

  return (
    <HStack className={rowClass}>
      <Text className={iconClass}>{glyph}</Text>
      <Text className={labelClass}>{label}</Text>
    </HStack>
  )
}

function NavItem({ glyph, label, route }: NavItemProps) {
  const [currentRoute, navigate] = useRoute('discover')
  const [returnRoute, setReturnRoute] = useStore<string>('app-store:return-route', 'discover')
  const activeRoute: string = activeStorefrontRoute(currentRoute, returnRoute)
  const active: boolean = activeRoute === route

  if (route === 'discover') {
    return (
      <HStack testId="nav-discover" onClick={() => { setReturnRoute('discover'); navigate('discover') }}>
        <NavItemContent glyph={glyph} label={label} active={active} />
      </HStack>
    )
  }

  if (route === 'arcade') {
    return (
      <HStack testId="nav-arcade" onClick={() => { setReturnRoute('arcade'); navigate('arcade') }}>
        <NavItemContent glyph={glyph} label={label} active={active} />
      </HStack>
    )
  }

  if (route === 'play') {
    return (
      <HStack testId="nav-play" onClick={() => { setReturnRoute('play'); navigate('play') }}>
        <NavItemContent glyph={glyph} label={label} active={active} />
      </HStack>
    )
  }

  if (route === 'develop') {
    return (
      <HStack testId="nav-develop" onClick={() => { setReturnRoute('develop'); navigate('develop') }}>
        <NavItemContent glyph={glyph} label={label} active={active} />
      </HStack>
    )
  }

  if (route === 'create') {
    return (
      <HStack testId="nav-create">
        <NavItemContent glyph={glyph} label={label} active={active} />
      </HStack>
    )
  }

  if (route === 'work') {
    return (
      <HStack testId="nav-work">
        <NavItemContent glyph={glyph} label={label} active={active} />
      </HStack>
    )
  }

  return (
    <HStack testId="nav-categories">
      <NavItemContent glyph={glyph} label={label} active={active} />
    </HStack>
  )
}

export function AppStoreSidebar() {
  return (
    <VStack testId="sidebar" className="w-[240] gap-0 bg-[#1a1a1c]">
      <VStack className="h-[52] justify-end px-5 pb-2">
        <HStack className="items-center gap-[6]">
          <Text className="text-[15] font-semibold text-white/90 tracking-tight truncate">App Store</Text>
          <Text className="text-[13] text-white/40 truncate">for Mac</Text>
        </HStack>
      </VStack>

      <VStack testId="sidebar-search" className="px-4 mt-3 mb-3">
        <HStack className="items-center gap-2 rounded-lg bg-white/4 px-[10] py-[6]">
          <Text className="text-[13] text-white/25">Search</Text>
        </HStack>
      </VStack>

      <VStack className="flex-1 px-3 gap-[1]">
        <NavItem glyph="✦" label="Discover" route="discover" />
        <NavItem glyph="♞" label="Arcade" route="arcade" />
        <NavItem glyph="✎" label="Create" route="create" />
        <NavItem glyph="➜" label="Work" route="work" />
        <NavItem glyph="▶" label="Play" route="play" />
        <NavItem glyph={'</>'} label="Develop" route="develop" />
        <NavItem glyph="☷" label="Categories" route="categories" />
      </VStack>
    </VStack>
  )
}
