import { useStore } from '../../../packages/tsn-ui/src/react'
import type { GallerySuite } from '../../../packages/tsn-testing/src/gallery'
import {
  arcadeHeroImage,
  categoryFamilyImage,
  categoryPuzzleImage,
  developHeroImage,
  developSpotlightImage,
  iconDredge,
  iconHelloKitty,
  iconRuralLife,
  playCardOneImage,
  playCardTwoImage,
  ruralScreenOneImage,
  ruralScreenTwoImage,
} from '../app-store/assets'
import { gallerySuiteById, gallerySuites } from './registry'
import {
  decrementCounter,
  incrementCounter,
  onGallerySearch,
  onSuiteClick,
  resetDemo,
  setActiveSuite,
} from './state'

interface SuiteNavItemProps {
  suite: GallerySuite
}

function SuiteNavItem({ suite }: SuiteNavItemProps) {
  const [activeSuite, _setActiveSuite] = useStore<string>('ui-gallery:suite', 'layout')
  if (activeSuite === suite.id) {
    return <Button variant="sidebar-active" icon="square.stack.3d.up.fill" onClick={onSuiteClick} tag={suite.tag}>{suite.label}</Button>
  }
  return <Button variant="sidebar" icon="square.stack.3d.up" onClick={onSuiteClick} tag={suite.tag}>{suite.label}</Button>
}

function GallerySidebar() {
  const suites: GallerySuite[] = gallerySuites()
  const [query, _setQuery] = useStore<string>('ui-gallery:query', '')

  return (
    <VStack className="w-[228] gap-4 bg-zinc-900 p-3 rounded-xl">
      <Search value={query} placeholder="Find demo or interaction" onChange={onGallerySearch} className="w-[196]" />

      <VStack className="gap-1">
        <Text className="text-xs text-zinc-500">TSN UI GALLERY</Text>
        {suites.map(suite => <SuiteNavItem suite={suite} />)}
      </VStack>

      <Spacer />

      <Card className="rounded-xl">
        <VStack className="gap-1">
          <Text className="text-xs text-zinc-500">CONFORMANCE</Text>
          <Text className="text-sm font-bold">Provider-backed visual registry</Text>
          <Text className="text-xs text-zinc-500">Every new visual capability should land here first.</Text>
        </VStack>
      </Card>
    </VStack>
  )
}

function GalleryHeader() {
  const [suiteId, _setSuiteId] = useStore<string>('ui-gallery:suite', 'layout')
  const [query, _setQuery] = useStore<string>('ui-gallery:query', '')
  const [counter, _setCounter] = useStore<number>('ui-gallery:counter', 0)
  const suite: GallerySuite = gallerySuiteById(suiteId)

  let queryText: string = 'Query: empty'
  if (query.length > 0) queryText = 'Query: ' + query
  const counterText: string = 'Counter ' + counter

  return (
    <VStack className="gap-2">
      <HStack className="gap-3">
        <VStack className="gap-0">
          <Text className="text-4xl font-bold">{suite.label}</Text>
          <Text className="text-sm text-zinc-400">{suite.description}</Text>
        </VStack>
        <Spacer />
        <Card className="rounded-xl bg-zinc-800">
          <VStack className="gap-2">
            <Text className="text-xs text-zinc-500">LIVE STATE</Text>
            <Text className="text-sm font-bold">{queryText}</Text>
            <Text className="text-sm font-bold">{counterText}</Text>
            <HStack className="gap-2">
              <Button variant="primary" onClick={incrementCounter}>Increment Counter</Button>
              <Button variant="link" onClick={resetDemo}>Reset Demo</Button>
            </HStack>
          </VStack>
        </Card>
      </HStack>
      <Divider />
    </VStack>
  )
}

function LayoutSuite() {
  return (
    <VStack className="gap-6">
      <Text className="text-2xl font-bold">Shell and Constraint Cases</Text>

      <Card className="rounded-2xl bg-zinc-800">
        <HStack className="gap-6 p-6">
          <VStack className="max-w-[280] gap-2">
            <Text className="text-xs text-zinc-400">CENTERED CONTENT RAIL</Text>
            <Text className="text-4xl font-bold">Constrained hero content stays readable</Text>
            <Text className="text-base text-zinc-400">This mirrors the shell width problem from the App Store examples without burying it inside app code.</Text>
          </VStack>
          <Spacer />
          <Image src={developSpotlightImage} className="w-[560] h-[260] rounded-2xl" />
        </HStack>
      </Card>

      <Scroll className="h-[244] overflow-x-auto">
        <HStack className="gap-4">
          <Card className="w-[360] rounded-2xl bg-zinc-800">
            <VStack className="gap-3 p-5">
              <Text className="text-xs text-zinc-400">HORIZONTAL SHELF</Text>
              <Image src={categoryPuzzleImage} className="w-[320] h-[180] rounded-xl" />
              <Text className="text-xl font-bold">Overflowing rails should still compose cleanly.</Text>
            </VStack>
          </Card>
          <Card className="w-[360] rounded-2xl bg-zinc-800">
            <VStack className="gap-3 p-5">
              <Text className="text-xs text-zinc-400">CARD WIDTH</Text>
              <Image src={categoryFamilyImage} className="w-[320] h-[180] rounded-xl" />
              <Text className="text-xl font-bold">Fixed media inside a scrolling rail stays predictable.</Text>
            </VStack>
          </Card>
          <Card className="w-[360] rounded-2xl bg-zinc-800">
            <VStack className="gap-3 p-5">
              <Text className="text-xs text-zinc-400">SPACER ALIGNMENT</Text>
              <Image src={playCardTwoImage} className="w-[320] h-[180] rounded-xl" />
              <Text className="text-xl font-bold">Footer and accessory content should pin without collapsing.</Text>
            </VStack>
          </Card>
        </HStack>
      </Scroll>

      <HStack className="gap-4">
        <Card className="flex-1 rounded-2xl bg-zinc-800">
          <VStack className="gap-2 p-5">
            <Text className="text-xs text-zinc-400">SIDEBAR FOOTER</Text>
            <Text className="text-2xl font-bold">Bottom-pinned account area</Text>
            <Text className="text-sm text-zinc-400">This is the exact kind of spacer behavior we broke earlier and now want protected.</Text>
          </VStack>
        </Card>
        <Card className="flex-1 rounded-2xl bg-zinc-800">
          <VStack className="gap-2 p-5">
            <Text className="text-xs text-zinc-400">STACK STRETCH</Text>
            <Text className="text-2xl font-bold">Cross-axis fill</Text>
            <Text className="text-sm text-zinc-400">Sibling panels should share width without drifting or leaving dead space.</Text>
          </VStack>
        </Card>
      </HStack>
    </VStack>
  )
}

function ComponentSuite() {
  return (
    <VStack className="gap-6">
      <Text className="text-2xl font-bold">Core Primitive Cases</Text>

      <Card className="rounded-2xl bg-zinc-800">
        <VStack className="gap-4 p-5">
          <Text className="text-xs text-zinc-400">BUTTON VARIANTS</Text>
          <HStack className="gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="get">Get</Button>
            <Button variant="chip">Chip</Button>
            <Button variant="link">Link</Button>
            <Button variant="sidebar">Sidebar</Button>
            <Button variant="sidebar-active">Sidebar Active</Button>
          </HStack>
        </VStack>
      </Card>

      <HStack className="gap-4">
        <Card className="flex-1 rounded-2xl bg-zinc-800">
          <VStack className="gap-3 p-5">
            <Text className="text-xs text-zinc-400">SEARCH</Text>
            <Search value="" placeholder="Visual verification search field" onChange={onGallerySearch} className="w-[320]" />
            <Text className="text-sm text-zinc-400">Search should remain measurable and interactive inside cards and toolbars.</Text>
          </VStack>
        </Card>
        <Card className="flex-1 rounded-2xl bg-zinc-800">
          <VStack className="gap-3 p-5">
            <Text className="text-xs text-zinc-400">METRICS</Text>
            <HStack className="gap-4">
              <Stat value="120fps" label="Render budget" color="green" />
              <Stat value="28ms" label="Transition" color="blue" />
              <Stat value="64MB" label="Memory" color="purple" />
            </HStack>
          </VStack>
        </Card>
      </HStack>

      <HStack className="gap-4">
        <Card className="flex-1 rounded-2xl bg-zinc-800">
          <VStack className="gap-2 p-5">
            <Text className="text-xs text-zinc-400">TEXT SCALE</Text>
            <Text className="text-4xl font-bold">Display headline</Text>
            <Text className="text-2xl font-bold">Section heading</Text>
            <Text className="text-base text-zinc-400">Supporting copy should stay readable without clipping.</Text>
          </VStack>
        </Card>
        <Card className="flex-1 rounded-2xl bg-zinc-800">
          <VStack className="gap-2 p-5">
            <Text className="text-xs text-zinc-400">ACCESSORY LAYOUT</Text>
            <HStack className="gap-3">
              <Text className="text-lg font-bold">Toolbar content</Text>
              <Spacer />
              <Badge text="Stable" color="green" />
              <Badge text="Native" color="blue" />
            </HStack>
          </VStack>
        </Card>
      </HStack>
    </VStack>
  )
}

function MediaSuite() {
  return (
    <VStack className="gap-6">
      <Text className="text-2xl font-bold">Media and Cropping Cases</Text>

      <Card className="rounded-2xl bg-zinc-800">
        <VStack className="gap-4 p-5">
          <Text className="text-xs text-zinc-400">HERO ART</Text>
          <Image src={arcadeHeroImage} className="w-[1080] h-[420] rounded-2xl" />
        </VStack>
      </Card>

      <HStack className="gap-4">
        <Card className="flex-1 rounded-2xl bg-zinc-800">
          <VStack className="gap-3 p-5">
            <Text className="text-xs text-zinc-400">ICON GRID</Text>
            <HStack className="gap-4">
              <Image src={iconDredge} className="w-[64] h-[64] rounded-xl" />
              <Image src={iconHelloKitty} className="w-[64] h-[64] rounded-xl" />
              <Image src={iconRuralLife} className="w-[64] h-[64] rounded-xl" />
            </HStack>
          </VStack>
        </Card>
        <Card className="flex-1 rounded-2xl bg-zinc-800">
          <VStack className="gap-3 p-5">
            <Text className="text-xs text-zinc-400">ROUND CROPS</Text>
            <HStack className="gap-4">
              <Image src={developHeroImage} className="w-[120] h-[120] rounded-full" />
              <Image src={playCardOneImage} className="w-[120] h-[120] rounded-full" />
            </HStack>
          </VStack>
        </Card>
      </HStack>

      <HStack className="gap-4">
        <Image src={ruralScreenOneImage} className="w-[530] h-[300] rounded-2xl" />
        <Image src={ruralScreenTwoImage} className="w-[530] h-[300] rounded-2xl" />
      </HStack>
    </VStack>
  )
}

function InteractionSuite() {
  const [query, _setQuery] = useStore<string>('ui-gallery:query', '')
  const [counter, _setCounter] = useStore<number>('ui-gallery:counter', 0)

  let queryText: string = 'Query: empty'
  if (query.length > 0) queryText = 'Query: ' + query
  const counterText: string = 'Counter ' + counter

  return (
    <VStack className="gap-6">
      <Text className="text-2xl font-bold">Interactive Verification Cases</Text>

      <Card className="rounded-2xl bg-zinc-800">
        <VStack className="gap-4 p-5">
          <Text className="text-xs text-zinc-400">SHARED STORE STATE</Text>
          <Text className="text-3xl font-bold">{queryText}</Text>
          <Text className="text-base text-zinc-400">Typing into the gallery search field should update this text through the shared store.</Text>
        </VStack>
      </Card>

      <Card className="rounded-2xl bg-zinc-800">
        <VStack className="gap-4 p-5">
          <Text className="text-xs text-zinc-400">COUNTER INTERACTION</Text>
          <Text className="text-4xl font-bold">{counterText}</Text>
          <Text className="text-base text-zinc-400">Use the shell controls above to mutate this state and verify rerenders through the inspector.</Text>
        </VStack>
      </Card>
    </VStack>
  )
}

function GalleryContent() {
  const [suiteId, _setSuiteId] = useStore<string>('ui-gallery:suite', 'layout')

  if (suiteId === 'components') return <ComponentSuite />
  if (suiteId === 'media') return <MediaSuite />
  if (suiteId === 'interactions') return <InteractionSuite />
  return <LayoutSuite />
}

export function App() {
  return (
    <Window title="UI Gallery" width={1440} height={960} dark subtitle="TSN visual verification">
      <HStack className="flex-1 gap-3 bg-black p-2">
        <GallerySidebar />
        <VStack className="flex-1 gap-0 bg-zinc-950 rounded-xl">
          <Scroll className="flex-1 overflow-y-auto">
            <VStack className="max-w-[1180] mx-auto gap-7 px-8 py-7">
              <GalleryHeader />
              <GalleryContent />
            </VStack>
          </Scroll>
        </VStack>
      </HStack>
    </Window>
  )
}
