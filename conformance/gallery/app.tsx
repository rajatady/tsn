import { useStore } from '../../packages/tsn-ui/src/react'

// Import all cases
import { HstackBasicCase } from '../cases/hstack-basic'
import { AlignCenterCase } from '../cases/align-center'
import { JustifyBetweenCase } from '../cases/justify-between'
import { PaddingGapCase } from '../cases/padding-gap'
import { FlexGrowCase } from '../cases/flex-grow'
import { SpacerCase } from '../cases/spacer'
import { FixedSizesCase } from '../cases/fixed-sizes'
import { NestedStacksCase } from '../cases/nested-stacks'
import { MaxWidthCase } from '../cases/max-width'
import { MarginsCase } from '../cases/margins'
import { AppRowCase } from '../cases/app-row'
import { StatRowCase } from '../cases/stat-row'
import { SidebarShellCase } from '../cases/sidebar-shell'
import { TextSizesCase } from '../cases/text-sizes'
import { TextWeightsCase } from '../cases/text-weights'
import { TextLineheightCase } from '../cases/text-lineheight'
import { TextAlignTransformCase } from '../cases/text-align-transform'
import { TextInCardCase } from '../cases/text-in-card'
import { ButtonVariantsCase } from '../cases/button-variants'
import { CardDeepCase } from '../cases/card-deep'
import { ImageDeepCase } from '../cases/image-deep'
import { InputDeepCase } from '../cases/input-deep'
import { BadgeDeepCase } from '../cases/badge-deep'
import { StatDeepCase } from '../cases/stat-deep'
import { ProgressDeepCase } from '../cases/progress-deep'
import { DividerDeepCase } from '../cases/divider-deep'
import { FlexBasisCase } from '../cases/flex-basis'
import { JustifyEndCase } from '../cases/justify-end'
import { ItemsEndCase } from '../cases/items-end'
import { EmptySpacerCase } from '../cases/empty-spacer'
import { ZstackOverlayCase } from '../cases/zstack-overlay'
import { HorizontalScrollCase } from '../cases/horizontal-scroll'
import { MultiColGridCase } from '../cases/multi-col-grid'
import { MetricStripCase } from '../cases/metric-strip'
import { EditorialCardCase } from '../cases/editorial-card'
import { CardNoPaddingCase } from '../cases/card-no-padding'

function onCaseClick(tag: number): void {
  const cases: string[] = [
    'hstack-basic', 'align-center', 'justify-between', 'padding-gap',
    'flex-grow', 'spacer', 'fixed-sizes', 'nested-stacks', 'max-width', 'margins',
    'app-row', 'stat-row', 'sidebar-shell',
    'text-sizes', 'text-weights', 'text-lineheight', 'text-align-transform', 'text-in-card',
    'button-variants', 'card-deep', 'image-deep', 'input-deep',
    'badge-deep', 'stat-deep', 'progress-deep', 'divider-deep',
    'flex-basis', 'justify-end', 'items-end', 'empty-spacer',
    'zstack-overlay', 'horizontal-scroll', 'multi-col-grid',
    'metric-strip', 'editorial-card', 'card-no-padding',
  ]
  const [_current, setCurrent] = useStore<string>('gallery:case', 'hstack-basic')
  if (tag >= 0 && tag < cases.length) {
    setCurrent(cases[tag])
  }
}

function CaseContent() {
  const [current, _set] = useStore<string>('gallery:case', 'hstack-basic')
  if (current === 'align-center') return <AlignCenterCase />
  if (current === 'justify-between') return <JustifyBetweenCase />
  if (current === 'padding-gap') return <PaddingGapCase />
  if (current === 'flex-grow') return <FlexGrowCase />
  if (current === 'spacer') return <SpacerCase />
  if (current === 'fixed-sizes') return <FixedSizesCase />
  if (current === 'nested-stacks') return <NestedStacksCase />
  if (current === 'max-width') return <MaxWidthCase />
  if (current === 'margins') return <MarginsCase />
  if (current === 'app-row') return <AppRowCase />
  if (current === 'stat-row') return <StatRowCase />
  if (current === 'sidebar-shell') return <SidebarShellCase />
  if (current === 'text-sizes') return <TextSizesCase />
  if (current === 'text-weights') return <TextWeightsCase />
  if (current === 'text-lineheight') return <TextLineheightCase />
  if (current === 'text-align-transform') return <TextAlignTransformCase />
  if (current === 'text-in-card') return <TextInCardCase />
  if (current === 'button-variants') return <ButtonVariantsCase />
  if (current === 'card-deep') return <CardDeepCase />
  if (current === 'image-deep') return <ImageDeepCase />
  if (current === 'input-deep') return <InputDeepCase />
  if (current === 'badge-deep') return <BadgeDeepCase />
  if (current === 'stat-deep') return <StatDeepCase />
  if (current === 'progress-deep') return <ProgressDeepCase />
  if (current === 'divider-deep') return <DividerDeepCase />
  if (current === 'flex-basis') return <FlexBasisCase />
  if (current === 'justify-end') return <JustifyEndCase />
  if (current === 'items-end') return <ItemsEndCase />
  if (current === 'empty-spacer') return <EmptySpacerCase />
  if (current === 'zstack-overlay') return <ZstackOverlayCase />
  if (current === 'horizontal-scroll') return <HorizontalScrollCase />
  if (current === 'multi-col-grid') return <MultiColGridCase />
  if (current === 'metric-strip') return <MetricStripCase />
  if (current === 'editorial-card') return <EditorialCardCase />
  if (current === 'card-no-padding') return <CardNoPaddingCase />
  return <HstackBasicCase />
}

interface NavButtonProps {
  label: string
  tag: number
  caseId: string
}

function NavButton({ label, tag, caseId }: NavButtonProps) {
  const [current, _set] = useStore<string>('gallery:case', 'hstack-basic')
  if (current === caseId) {
    return <Button testId={caseId} variant="sidebar-active" onClick={onCaseClick} tag={tag}>{label}</Button>
  }
  return <Button testId={caseId} variant="sidebar" onClick={onCaseClick} tag={tag}>{label}</Button>
}

function GallerySidebar() {
  return (
    <VStack testId="nav.sidebar" className="w-[200] gap-2 bg-zinc-900 p-3 rounded-xl">
      <Text className="text-xs text-zinc-500 uppercase">Layout</Text>
      <NavButton label="HStack Basic" tag={0} caseId="hstack-basic" />
      <NavButton label="Align Center" tag={1} caseId="align-center" />
      <NavButton label="Justify Between" tag={2} caseId="justify-between" />
      <NavButton label="Padding + Gap" tag={3} caseId="padding-gap" />
      <NavButton label="Flex Grow" tag={4} caseId="flex-grow" />
      <NavButton label="Spacer" tag={5} caseId="spacer" />
      <NavButton label="Fixed Sizes" tag={6} caseId="fixed-sizes" />
      <NavButton label="Nested Stacks" tag={7} caseId="nested-stacks" />
      <NavButton label="Max Width" tag={8} caseId="max-width" />
      <NavButton label="Margins" tag={9} caseId="margins" />

      <Divider />
      <Text className="text-xs text-zinc-500 uppercase">Composite</Text>
      <NavButton label="App Row" tag={10} caseId="app-row" />
      <NavButton label="Stat Row" tag={11} caseId="stat-row" />
      <NavButton label="Sidebar Shell" tag={12} caseId="sidebar-shell" />

      <Divider />
      <Text className="text-xs text-zinc-500 uppercase">Text Deep</Text>
      <NavButton label="Text Sizes" tag={13} caseId="text-sizes" />
      <NavButton label="Text Weights" tag={14} caseId="text-weights" />
      <NavButton label="Line Height" tag={15} caseId="text-lineheight" />
      <NavButton label="Align + Transform" tag={16} caseId="text-align-transform" />
      <NavButton label="Text in Card" tag={17} caseId="text-in-card" />

      <Divider />
      <Text className="text-xs text-zinc-500 uppercase">Button Deep</Text>
      <NavButton label="All Variants" tag={18} caseId="button-variants" />

      <Divider />
      <Text className="text-xs text-zinc-500 uppercase">Card Deep</Text>
      <NavButton label="Card Deep" tag={19} caseId="card-deep" />

      <Divider />
      <Text className="text-xs text-zinc-500 uppercase">Image Deep</Text>
      <NavButton label="Image Deep" tag={20} caseId="image-deep" />

      <Divider />
      <Text className="text-xs text-zinc-500 uppercase">Input Deep</Text>
      <NavButton label="Search + Input" tag={21} caseId="input-deep" />

      <Divider />
      <Text className="text-xs text-zinc-500 uppercase">Badge Deep</Text>
      <NavButton label="All Variants" tag={22} caseId="badge-deep" />

      <Divider />
      <Text className="text-xs text-zinc-500 uppercase">Stat Deep</Text>
      <NavButton label="All Variants" tag={23} caseId="stat-deep" />

      <Divider />
      <Text className="text-xs text-zinc-500 uppercase">Progress Deep</Text>
      <NavButton label="Bar Variants" tag={24} caseId="progress-deep" />

      <Divider />
      <Text className="text-xs text-zinc-500 uppercase">Divider Deep</Text>
      <NavButton label="Separators" tag={25} caseId="divider-deep" />

      <Divider />
      <Text className="text-xs text-zinc-500 uppercase">App Store Patterns</Text>
      <NavButton label="Flex Basis" tag={26} caseId="flex-basis" />
      <NavButton label="Justify End" tag={27} caseId="justify-end" />
      <NavButton label="Items End" tag={28} caseId="items-end" />
      <NavButton label="Empty Spacer" tag={29} caseId="empty-spacer" />
      <NavButton label="ZStack Overlay" tag={30} caseId="zstack-overlay" />
      <NavButton label="H-Scroll" tag={31} caseId="horizontal-scroll" />
      <NavButton label="Multi-Col Grid" tag={32} caseId="multi-col-grid" />
      <NavButton label="Metric Strip" tag={33} caseId="metric-strip" />
      <NavButton label="Editorial Card" tag={34} caseId="editorial-card" />
      <NavButton label="Card No Padding" tag={35} caseId="card-no-padding" />
    </VStack>
  )
}

export function initGallery(): void {
}

export function App() {
  const [current, _set] = useStore<string>('gallery:case', 'hstack-basic')

  return (
    <Window title="Geometry Conformance" width={1200} height={700} dark subtitle="TSN Visual Oracle">
      <HStack className="flex-1 gap-3 bg-black p-2">
        <Scroll className="w-[220] overflow-y-auto">
          <GallerySidebar />
        </Scroll>
        <VStack className="flex-1 gap-0 bg-zinc-950 rounded-xl p-6">
          <Text testId="case.label" className="text-sm text-zinc-400 uppercase">{current}</Text>
          <Divider />
          <VStack testId="case.viewport" className="gap-0 py-4">
            <CaseContent />
          </VStack>
        </VStack>
      </HStack>
    </Window>
  )
}
