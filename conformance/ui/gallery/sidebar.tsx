import { useStore } from '../../../packages/tsn-ui/src/react'
import { onConformanceAction, onConformanceSearch, onSuiteNavClick } from './state'

function SuiteNavButton(suiteId: string, navLabel: string, navTestId: string, navTag: number) {
  const [activeSuite, _setActiveSuite] = useStore<string>('ui-conformance:suite', 'layout')

  if (activeSuite === suiteId) {
    return <Button testId={navTestId} variant="sidebar-active" icon="square.stack.3d.up.fill" onClick={onSuiteNavClick} tag={navTag}>{navLabel}</Button>
  }
  return <Button testId={navTestId} variant="sidebar" icon="square.stack.3d.up" onClick={onSuiteNavClick} tag={navTag}>{navLabel}</Button>
}

export function ConformanceSidebar() {
  const [query, _setQuery] = useStore<string>('ui-conformance:query', '')

  return (
    <Sidebar className="w-[236]" testId="shell.sidebar">
      <Search testId="shell.search" value={query} placeholder="Search conformance state" onChange={onConformanceSearch} className="w-[204]" />

      <SidebarSection title="SUITES">
        {SuiteNavButton('layout', 'Layout Suite', 'suite.layout', 1)}
        {SuiteNavButton('content', 'Content Suite', 'suite.content', 2)}
        {SuiteNavButton('inputs', 'Inputs Suite', 'suite.inputs', 3)}
        {SuiteNavButton('media', 'Media Suite', 'suite.media', 4)}
        {SuiteNavButton('data', 'Data Suite', 'suite.data', 5)}
      </SidebarSection>

      <SidebarSection title="PRIMITIVES">
        <SidebarItem testId="shell.sidebar.item.1" icon="square.grid.2x2" onClick={onConformanceAction} tag={1}>Sidebar Item One</SidebarItem>
        <SidebarItem testId="shell.sidebar.item.2" icon="slider.horizontal.3" onClick={onConformanceAction} tag={2}>Sidebar Item Two</SidebarItem>
      </SidebarSection>

      <Spacer testId="shell.sidebar.spacer" />

      <Card testId="shell.sidebar.footer" className="rounded-xl bg-zinc-800">
        <VStack className="gap-1">
          <Text className="text-xs text-zinc-500">TSN CONFORMANCE</Text>
          <Text className="text-sm font-bold">Every primitive should land here first.</Text>
        </VStack>
      </Card>
    </Sidebar>
  )
}
