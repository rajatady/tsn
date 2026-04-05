import { onDeptClick } from './state'

export function DashboardSidebar() {
  return (
    <Sidebar className="w-[200]">
      <SidebarSection title="NAVIGATION">
        <SidebarItem icon="chart.bar.fill" onClick={onDeptClick}>Overview</SidebarItem>
        <SidebarItem icon="person.3.fill" onClick={onDeptClick}>All Employees</SidebarItem>
      </SidebarSection>
      <SidebarSection title="DEPARTMENTS">
        <SidebarItem icon="gearshape.fill" onClick={onDeptClick}>Engineering</SidebarItem>
        <SidebarItem icon="paintbrush.fill" onClick={onDeptClick}>Design</SidebarItem>
        <SidebarItem icon="megaphone.fill" onClick={onDeptClick}>Marketing</SidebarItem>
        <SidebarItem icon="dollarsign.circle.fill" onClick={onDeptClick}>Sales</SidebarItem>
        <SidebarItem icon="banknote.fill" onClick={onDeptClick}>Finance</SidebarItem>
        <SidebarItem icon="person.crop.circle.fill" onClick={onDeptClick}>HR</SidebarItem>
        <SidebarItem icon="shippingbox.fill" onClick={onDeptClick}>Product</SidebarItem>
        <SidebarItem icon="wrench.and.screwdriver.fill" onClick={onDeptClick}>Operations</SidebarItem>
      </SidebarSection>
      <SidebarSection title="TOOLS">
        <SidebarItem icon="square.and.arrow.up">Export CSV</SidebarItem>
        <SidebarItem icon="gearshape">Settings</SidebarItem>
      </SidebarSection>
    </Sidebar>
  )
}
