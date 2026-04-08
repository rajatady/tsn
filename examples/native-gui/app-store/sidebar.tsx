import { useRoute, useStore } from '../../../packages/tsn-ui/src/react'
import { activeStorefrontRoute } from './navigation'

function handleSidebarSearch(text: string) {
}

interface NavItemProps {
  icon: string
  label: string
  route: string
}

function NavItem({ icon, label, route }: NavItemProps) {
  const [currentRoute, navigate] = useRoute('discover')
  const [returnRoute, setReturnRoute] = useStore<string>('app-store:return-route', 'discover')
  const activeRoute: string = activeStorefrontRoute(currentRoute, returnRoute)
  const active: boolean = activeRoute === route

  const iconColor: string = active ? 'blue' : 'secondary'
  const rowClass: string = active
    ? 'items-center gap-3 h-[32] rounded-lg px-3 bg-white/8'
    : 'items-center gap-3 h-[32] rounded-lg px-3'
  const labelClass: string = active
    ? 'text-[14] font-medium text-white truncate'
    : 'text-[14] text-white/75 truncate'

  if (route === 'discover') {
    return (
      <HStack testId="nav-discover" className={rowClass} onClick={() => { setReturnRoute('discover'); navigate('discover') }}>
        <Symbol name={icon} size={14} color={iconColor} />
        <Text className={labelClass}>{label}</Text>
      </HStack>
    )
  }

  if (route === 'arcade') {
    return (
      <HStack testId="nav-arcade" className={rowClass} onClick={() => { setReturnRoute('arcade'); navigate('arcade') }}>
        <Symbol name={icon} size={14} color={iconColor} />
        <Text className={labelClass}>{label}</Text>
      </HStack>
    )
  }

  if (route === 'play') {
    return (
      <HStack testId="nav-play" className={rowClass} onClick={() => { setReturnRoute('play'); navigate('play') }}>
        <Symbol name={icon} size={14} color={iconColor} />
        <Text className={labelClass}>{label}</Text>
      </HStack>
    )
  }

  if (route === 'develop') {
    return (
      <HStack testId="nav-develop" className={rowClass} onClick={() => { setReturnRoute('develop'); navigate('develop') }}>
        <Symbol name={icon} size={14} color={iconColor} />
        <Text className={labelClass}>{label}</Text>
      </HStack>
    )
  }

  if (route === 'create') {
    return (
      <HStack testId="nav-create" className={rowClass}>
        <Symbol name={icon} size={14} color={iconColor} />
        <Text className={labelClass}>{label}</Text>
      </HStack>
    )
  }

  if (route === 'work') {
    return (
      <HStack testId="nav-work" className={rowClass}>
        <Symbol name={icon} size={14} color={iconColor} />
        <Text className={labelClass}>{label}</Text>
      </HStack>
    )
  }

  return (
    <HStack testId="nav-categories" className={rowClass}>
      <Symbol name={icon} size={14} color={iconColor} />
      <Text className={labelClass}>{label}</Text>
    </HStack>
  )
}

export function AppStoreSidebar() {
  return (
    <VStack testId="sidebar" className="w-[240] gap-0 bg-[#1a1a1c]">
      <VStack className="h-[52] justify-end px-5 pb-2">
        <HStack className="items-center gap-1">
          <Text className="text-[15] font-semibold text-white/90 tracking-tight truncate">App Store</Text>
          <Text className="text-[13] text-white/40 truncate">for Mac</Text>
        </HStack>
      </VStack>

      <HStack testId="sidebar-search" className="items-center gap-2 h-[28] rounded-lg bg-white/5 mx-4 mt-3 mb-3 px-3">
        <Symbol name="magnifyingglass" size={12} color="zinc-400" />
        <Text className="text-[13] text-white/25">Search</Text>
      </HStack>

      <VStack className="flex-1 px-3 gap-0">
        <NavItem icon="sparkle.magnifyingglass" label="Discover" route="discover" />
        <NavItem icon="gamecontroller.fill" label="Arcade" route="arcade" />
        <NavItem icon="paintbrush.pointed.fill" label="Create" route="create" />
        <NavItem icon="paperplane.fill" label="Work" route="work" />
        <NavItem icon="play.fill" label="Play" route="play" />
        <NavItem icon="hammer.fill" label="Develop" route="develop" />
        <NavItem icon="square.grid.2x2" label="Categories" route="categories" />
      </VStack>
    </VStack>
  )
}
