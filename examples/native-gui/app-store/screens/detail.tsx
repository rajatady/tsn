import { useStore } from '../../../../packages/tsn-ui/src/react'
import { AppRow, NativeHud } from '../components'
import { detailBaseFromAppId, fameGames, storeAppFromId, type GameDetail, type StoreApp } from '../data'
import { goBackToStorefront } from '../store'

function DetailHero() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const app: StoreApp = storeAppFromId(selectedAppId)
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <ZStack className="rounded-[24px] overflow-hidden">
      <Image src={detail.hero} className="aspect-[4/5] md:aspect-[22/8] object-cover" />
      <Gradient from="black/80" to="transparent" direction="to-top" />
      <VStack className="justify-end p-5 md:p-8 gap-4">
        <Image src={app.icon} className="w-[88] h-[88] md:w-[128] md:h-[128] rounded-[22px] object-cover" />
        <VStack className="gap-1">
          <Text className="text-[24] font-bold tracking-tight truncate">{app.title}</Text>
          <Text className="text-[14] text-white/55">{detail.subtitle}</Text>
          <Text className="text-[12] text-white/40">{app.action} · In-App Purchases</Text>
        </VStack>
        <HStack className="gap-3">
          <Button variant="ghost" icon="chevron.left" onClick={goBackToStorefront}>Back</Button>
          <Button variant="get">Get</Button>
        </HStack>
      </VStack>
    </ZStack>
  )
}

function DetailMetrics() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <Scroll className="overflow-x-auto">
      <HStack className="gap-3">
        <VStack className="w-[112] min-w-[112] rounded-xl bg-white/5 p-3 items-center gap-1">
          <Text className="text-[10] font-bold text-white/40 uppercase tracking-wide">Rating</Text>
          <Text className="text-[20] font-bold">{detail.rating}</Text>
          <Text className="text-[11] text-white/40">★★★★★</Text>
        </VStack>
        <VStack className="w-[112] min-w-[112] rounded-xl bg-white/5 p-3 items-center gap-1">
          <Text className="text-[10] font-bold text-white/40 uppercase tracking-wide">Age</Text>
          <Text className="text-[20] font-bold">4+</Text>
          <Text className="text-[11] text-white/40">Years</Text>
        </VStack>
        <VStack className="w-[132] min-w-[132] rounded-xl bg-white/5 p-3 items-center gap-1">
          <Text className="text-[10] font-bold text-white/40 uppercase tracking-wide">Category</Text>
          <Text className="text-[14] text-white/65">{detail.genre}</Text>
        </VStack>
        <VStack className="w-[132] min-w-[132] rounded-xl bg-white/5 p-3 items-center gap-1">
          <Text className="text-[10] font-bold text-white/40 uppercase tracking-wide">Developer</Text>
          <Text className="text-[14] text-white/65">{detail.studio}</Text>
        </VStack>
      </HStack>
    </Scroll>
  )
}

function DetailScreenshots() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <Scroll className="overflow-x-auto rounded-2xl">
      <HStack className="gap-4">
        <Image src={detail.screenOne} className="w-[260] md:w-[548] rounded-2xl aspect-[16/10] object-cover" />
        <Image src={detail.screenTwo} className="w-[260] md:w-[548] rounded-2xl aspect-[16/10] object-cover" />
      </HStack>
    </Scroll>
  )
}

function DetailReviews() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <VStack className="gap-3">
      <Text className="text-[18] font-bold tracking-tight">Ratings & Reviews</Text>
      <VStack className="gap-3">
        <VStack className="gap-2 rounded-xl bg-white/5 p-4">
          <Text className="text-[15] font-bold truncate">{detail.reviews[0].title}</Text>
          <Text className="text-[11] text-white/40">★★★★★</Text>
          <Text className="text-[13] text-white/50">{detail.reviews[0].body}</Text>
          <HStack className="items-center gap-2">
            <Text className="text-[11] text-white/30">{detail.reviews[0].author}</Text>
            <Spacer />
            <Text className="text-[11] text-white/30">{detail.reviews[0].age}</Text>
          </HStack>
        </VStack>
        <VStack className="gap-2 rounded-xl bg-white/5 p-4">
          <Text className="text-[15] font-bold truncate">{detail.reviews[1].title}</Text>
          <Text className="text-[11] text-white/40">★★★★★</Text>
          <Text className="text-[13] text-white/50">{detail.reviews[1].body}</Text>
          <HStack className="items-center gap-2">
            <Text className="text-[11] text-white/30">{detail.reviews[1].author}</Text>
            <Spacer />
            <Text className="text-[11] text-white/30">{detail.reviews[1].age}</Text>
          </HStack>
        </VStack>
      </VStack>
    </VStack>
  )
}

function DetailInformation() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <VStack className="gap-3">
      <Text className="text-[18] font-bold tracking-tight">Information</Text>
      <VStack className="gap-3">
        <VStack className="gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Provider</Text>
          <Text className="text-[14] text-white/70">{detail.studio}</Text>
        </VStack>
        <VStack className="gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Category</Text>
          <Text className="text-[14] text-white/70">{detail.genre}</Text>
        </VStack>
        <VStack className="gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Size</Text>
          <Text className="text-[14] text-white/70">{detail.info[0].value}</Text>
        </VStack>
        <VStack className="gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Compatibility</Text>
          <Text className="text-[14] text-white/70">{detail.info[1].value}</Text>
        </VStack>
      </VStack>
    </VStack>
  )
}

function DetailMoreApps() {
  const moreApps: StoreApp[] = fameGames()

  return (
    <VStack className="gap-3">
      <Text className="text-[18] font-bold tracking-tight">You Might Also Like</Text>
      <VStack className="gap-0">
        <AppRow app={moreApps[0]} testId="dm-0" />
        <Divider />
        <AppRow app={moreApps[1]} testId="dm-1" />
        <Divider />
        <AppRow app={moreApps[2]} testId="dm-2" />
        <Divider />
        <AppRow app={moreApps[3]} testId="dm-3" />
      </VStack>
    </VStack>
  )
}

export function DetailScreen() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <Scroll className="flex-1 overflow-y-auto">
      <VStack className="gap-0 px-5 md:px-8 pt-5 pb-10 md:pb-12">
        <DetailHero />
        <VStack className="h-[20]" />
        <DetailMetrics />
        <VStack className="h-[20]" />
        <DetailScreenshots />
        <VStack className="h-[24]" />
        <Text className="text-[14] text-white/70">{detail.summary}</Text>
        <VStack className="h-[24]" />
        <DetailReviews />
        <VStack className="h-[24]" />
        <DetailInformation />
        <VStack className="h-[24]" />
        <DetailMoreApps />
        <VStack className="h-[24]" />
        <NativeHud />
      </VStack>
    </Scroll>
  )
}
