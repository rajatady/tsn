import { onStatusClick } from './state'

export function IncidentSidebar() {
  return (
    <Sidebar className="w-[220]">
      <SidebarSection title="QUEUE">
        <SidebarItem icon="tray.full.fill" onClick={onStatusClick}>All Incidents</SidebarItem>
      </SidebarSection>
      <SidebarSection title="STATUS">
        <SidebarItem icon="bolt.horizontal.fill" onClick={onStatusClick}>Investigating</SidebarItem>
        <SidebarItem icon="bandage.fill" onClick={onStatusClick}>Mitigated</SidebarItem>
        <SidebarItem icon="hammer.fill" onClick={onStatusClick}>In Progress</SidebarItem>
        <SidebarItem icon="checkmark.seal.fill" onClick={onStatusClick}>Review</SidebarItem>
        <SidebarItem icon="clock.fill" onClick={onStatusClick}>Backlog</SidebarItem>
        <SidebarItem icon="checkmark.circle.fill" onClick={onStatusClick}>Done</SidebarItem>
      </SidebarSection>
    </Sidebar>
  )
}
