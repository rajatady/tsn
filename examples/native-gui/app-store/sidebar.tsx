import { useRoute } from '../framework/react'

export function AppStoreSidebar() {
  const [route, navigate] = useRoute('arcade')
  const isArcade: boolean = route === 'arcade' || route.startsWith('game:')
  const isPlay: boolean = route === 'play'
  const isDevelop: boolean = route === 'develop'

  return (
    <Sidebar className="w-[220]">
      <SidebarSection title="DISCOVER">
        <SidebarItem icon="sparkles" onClick={() => navigate('arcade')}>Discover</SidebarItem>
      </SidebarSection>
      <SidebarSection title="ARCADE">
        <SidebarItem icon="gamecontroller.fill" onClick={() => navigate('arcade')}>
          {isArcade ? 'Arcade Selected' : 'Arcade'}
        </SidebarItem>
        <SidebarItem icon="play.rectangle.fill" onClick={() => navigate('play')}>
          {isPlay ? 'Play Selected' : 'Play'}
        </SidebarItem>
        <SidebarItem icon="hammer.fill" onClick={() => navigate('develop')}>
          {isDevelop ? 'Develop Selected' : 'Develop'}
        </SidebarItem>
      </SidebarSection>
      <SidebarSection title="ACCOUNT">
        <SidebarItem icon="person.crop.circle.fill">Kumar Divya Rajat</SidebarItem>
      </SidebarSection>
    </Sidebar>
  )
}
