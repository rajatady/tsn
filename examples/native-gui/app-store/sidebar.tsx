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

  if (route === 'discover') {
    if (activeRoute === route) return <Button variant="sidebar-active" icon={icon} onClick={() => { setReturnRoute('discover'); navigate('discover') }}>{label}</Button>
    return <Button variant="sidebar" icon={icon} onClick={() => { setReturnRoute('discover'); navigate('discover') }}>{label}</Button>
  }

  if (route === 'arcade') {
    if (activeRoute === route) return <Button variant="sidebar-active" icon={icon} onClick={() => { setReturnRoute('arcade'); navigate('arcade') }}>{label}</Button>
    return <Button variant="sidebar" icon={icon} onClick={() => { setReturnRoute('arcade'); navigate('arcade') }}>{label}</Button>
  }

  if (route === 'play') {
    if (activeRoute === route) return <Button variant="sidebar-active" icon={icon} onClick={() => { setReturnRoute('play'); navigate('play') }}>{label}</Button>
    return <Button variant="sidebar" icon={icon} onClick={() => { setReturnRoute('play'); navigate('play') }}>{label}</Button>
  }

  if (route === 'develop') {
    if (activeRoute === route) return <Button variant="sidebar-active" icon={icon} onClick={() => { setReturnRoute('develop'); navigate('develop') }}>{label}</Button>
    return <Button variant="sidebar" icon={icon} onClick={() => { setReturnRoute('develop'); navigate('develop') }}>{label}</Button>
  }

  if (activeRoute === route) return <Button variant="sidebar-active" icon={icon}>{label}</Button>
  return <Button variant="sidebar" icon={icon}>{label}</Button>
}

export function AppStoreSidebar() {
  return (
    <VStack testId="sidebar" className="w-[240] gap-0 bg-[#1a1a1c]">
      <VStack className="h-[52] justify-end px-5 pb-2">
        <HStack className="items-center gap-1">
          <Text className="text-[15] font-semibold text-white/90 tracking-tight">App Store</Text>
          <Text className="text-[13] text-white/40">for Mac</Text>
        </HStack>
      </VStack>

      <VStack className="px-4 py-3">
        <Search testId="sidebar-search" placeholder="Search" onChange={handleSidebarSearch} />
      </VStack>

      <VStack className="flex-1 px-3 gap-1">
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
