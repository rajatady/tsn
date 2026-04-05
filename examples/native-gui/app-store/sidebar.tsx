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
    <VStack className="w-[184] gap-4 bg-zinc-900 p-3 rounded-xl">
      <Search placeholder="Search" onChange={handleSidebarSearch} className="w-[156]" />

      <VStack className="gap-1">
        <NavItem icon="sparkle.magnifyingglass" label="Discover" route="discover" />
        <NavItem icon="gamecontroller.fill" label="Arcade" route="arcade" />
        <NavItem icon="paintbrush.pointed.fill" label="Create" route="discover" />
        <NavItem icon="paperplane.fill" label="Work" route="discover" />
        <NavItem icon="play.fill" label="Play" route="play" />
        <NavItem icon="hammer.fill" label="Develop" route="develop" />
      </VStack>

      <VStack className="gap-1">
        <Button variant="sidebar" icon="square.grid.2x2">Categories</Button>
        <Button variant="sidebar" icon="arrow.down.circle">Updates</Button>
      </VStack>

      <Spacer />

      <Card className="rounded-xl">
        <HStack className="gap-3">
          <Card className="rounded-full bg-zinc-700">
            <Text className="text-sm font-bold">KR</Text>
          </Card>
          <Text className="text-sm font-bold">Kumar Divya Rajat</Text>
        </HStack>
      </Card>
    </VStack>
  )
}
