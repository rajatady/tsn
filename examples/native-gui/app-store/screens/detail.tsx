import { useRoute, useStore } from '../../../../packages/tsn-ui/src/react'
import { AppRow, NativeHud } from '../components'
import { detailBaseFromAppId, fameGames, storeAppFromId, type GameDetail, type StoreApp } from '../data'
import { goBackToStorefront } from '../store'

function DetailHero() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const app: StoreApp = storeAppFromId(selectedAppId)
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <ZStack className="rounded-2xl overflow-hidden">
      <Image src={detail.hero} className="aspect-[22/8] object-cover" />
      <Gradient from="black/80" to="transparent" direction="to-top" />
      <HStack className="items-end p-8 gap-6">
        <Image src={app.icon} className="w-[128] h-[128] rounded-3xl object-cover" />
        <VStack className="flex-1 gap-1">
          <Text className="text-[28] font-bold tracking-tight truncate">{app.title}</Text>
          <Text className="text-[15] text-white/55 truncate">{detail.subtitle}</Text>
          <VStack className="h-[4]" />
          <Text className="text-[13] text-white/40 truncate">{app.action} · In-App Purchases</Text>
        </VStack>
        <VStack className="gap-3 items-end">
          <Button variant="get">Get</Button>
        </VStack>
      </HStack>
    </ZStack>
  )
}

function DetailMetricStrip() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <HStack className="items-center py-4">
      <VStack className="flex-1 items-center gap-1">
        <Text className="text-[11] font-bold text-white/40 uppercase tracking-wide">10 Ratings</Text>
        <Text className="text-[22] font-bold">{detail.rating}</Text>
        <Text className="text-[11] text-white/40">★★★★★</Text>
      </VStack>
      <Divider />
      <VStack className="flex-1 items-center gap-1">
        <Text className="text-[11] font-bold text-white/40 uppercase tracking-wide">Ages</Text>
        <Text className="text-[22] font-bold">4+</Text>
        <Text className="text-[11] text-white/40">Years</Text>
      </VStack>
      <Divider />
      <VStack className="flex-1 items-center gap-1">
        <Text className="text-[11] font-bold text-white/40 uppercase tracking-wide">Category</Text>
        <Text className="text-[16] text-white/50">{detail.genre}</Text>
        <Text className="text-[11] text-white/40">{detail.genre}</Text>
      </VStack>
      <Divider />
      <VStack className="flex-1 items-center gap-1">
        <Text className="text-[11] font-bold text-white/40 uppercase tracking-wide">Developer</Text>
        <Text className="text-[16] text-white/50">{detail.studio}</Text>
        <Text className="text-[11] text-white/40 truncate">{detail.studio}</Text>
      </VStack>
      <Divider />
      <VStack className="flex-1 items-center gap-1">
        <Text className="text-[11] font-bold text-white/40 uppercase tracking-wide">Language</Text>
        <Text className="text-[22] font-bold">EN</Text>
        <Text className="text-[11] text-white/40">+14 More</Text>
      </VStack>
      <Divider />
      <VStack className="flex-1 items-center gap-1">
        <Text className="text-[11] font-bold text-white/40 uppercase tracking-wide">Size</Text>
        <Text className="text-[22] font-bold">233.8</Text>
        <Text className="text-[11] text-white/40">MB</Text>
      </VStack>
    </HStack>
  )
}

function DetailScreenshots() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <Scroll className="overflow-x-auto rounded-2xl">
      <HStack className="gap-4">
        <Image src={detail.screenOne} className="w-[548] rounded-2xl aspect-[16/10] object-cover" />
        <Image src={detail.screenTwo} className="w-[548] rounded-2xl aspect-[16/10] object-cover" />
      </HStack>
    </Scroll>
  )
}

function DetailDescription() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <VStack className="gap-2">
      <Text className="text-[14] text-white/70">{detail.summary}</Text>
    </VStack>
  )
}

function DetailRatings() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <VStack className="gap-4">
      <Text className="text-[22] font-bold tracking-tight">Ratings & Reviews</Text>
      <HStack className="gap-6">
        <VStack className="items-center gap-1">
          <Text className="text-[48] font-bold tracking-tight">{detail.rating}</Text>
          <Text className="text-[13] text-white/40">out of 5</Text>
        </VStack>
        <VStack className="flex-1 gap-2">
          <HStack className="items-center gap-2">
            <Text className="text-[11] text-white/40">★★★★★</Text>
            <Progress value={80} className="flex-1" />
          </HStack>
          <HStack className="items-center gap-2">
            <Text className="text-[11] text-white/40">★★★★☆</Text>
            <Progress value={15} className="flex-1" />
          </HStack>
          <HStack className="items-center gap-2">
            <Text className="text-[11] text-white/40">★★★☆☆</Text>
            <Progress value={3} className="flex-1" />
          </HStack>
          <HStack className="items-center gap-2">
            <Text className="text-[11] text-white/40">★★☆☆☆</Text>
            <Progress value={1} className="flex-1" />
          </HStack>
          <HStack className="items-center gap-2">
            <Text className="text-[11] text-white/40">★☆☆☆☆</Text>
            <Progress value={1} className="flex-1" />
          </HStack>
        </VStack>
        <Text className="text-[13] text-white/40">10 Ratings</Text>
      </HStack>
      <HStack className="gap-4">
        <VStack className="flex-1 gap-2 rounded-xl bg-white/5 p-4">
          <Text className="text-[15] font-bold truncate">{detail.reviews[0].title}</Text>
          <Text className="text-[11] text-white/40">★★★★★</Text>
          <Text className="text-[13] text-white/50">{detail.reviews[0].body}</Text>
          <HStack className="items-center gap-2">
            <Text className="text-[11] text-white/30">{detail.reviews[0].author}</Text>
            <Spacer />
            <Text className="text-[11] text-white/30">{detail.reviews[0].age}</Text>
          </HStack>
        </VStack>
        <VStack className="flex-1 gap-2 rounded-xl bg-white/5 p-4">
          <Text className="text-[15] font-bold truncate">{detail.reviews[1].title}</Text>
          <Text className="text-[11] text-white/40">★★★★★</Text>
          <Text className="text-[13] text-white/50">{detail.reviews[1].body}</Text>
          <HStack className="items-center gap-2">
            <Text className="text-[11] text-white/30">{detail.reviews[1].author}</Text>
            <Spacer />
            <Text className="text-[11] text-white/30">{detail.reviews[1].age}</Text>
          </HStack>
        </VStack>
      </HStack>
    </VStack>
  )
}

function DetailWhatsNew() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <VStack className="gap-3">
      <HStack className="items-center">
        <Text className="text-[22] font-bold tracking-tight">What's New</Text>
        <Spacer />
        <VStack className="items-end gap-0">
          <Text className="text-[13] text-white/40">Version 119.0</Text>
        </VStack>
      </HStack>
      <Text className="text-[14] text-white/50">{detail.whatsNew}</Text>
    </VStack>
  )
}

function DetailInformation() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <VStack className="gap-3">
      <Text className="text-[22] font-bold tracking-tight">Information</Text>
      <HStack className="gap-8">
        <VStack className="flex-1 gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Provider</Text>
          <Text className="text-[14] text-white/70">{detail.studio}</Text>
        </VStack>
        <VStack className="flex-1 gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Category</Text>
          <Text className="text-[14] text-white/70">{detail.genre}</Text>
        </VStack>
        <VStack className="flex-1 gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Size</Text>
          <Text className="text-[14] text-white/70">{detail.info[0].value}</Text>
        </VStack>
        <VStack className="flex-1 gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Compatibility</Text>
          <Text className="text-[14] text-white/70">{detail.info[1].value}</Text>
        </VStack>
      </HStack>
      <HStack className="gap-8">
        <VStack className="flex-1 gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Language</Text>
          <Text className="text-[14] text-white/70">{detail.info[2].value}</Text>
        </VStack>
        <VStack className="flex-1 gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Age Rating</Text>
          <Text className="text-[14] text-white/70">{detail.info[3].value}</Text>
        </VStack>
        <VStack className="flex-1 gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Collection</Text>
          <Text className="text-[14] text-white/70">{detail.collection}</Text>
        </VStack>
        <VStack className="flex-1 gap-1">
          <Text className="text-[11] text-white/30 uppercase tracking-wide">Price</Text>
          <Text className="text-[14] text-white/70">Free</Text>
        </VStack>
      </HStack>
    </VStack>
  )
}

function DetailMoreApps() {
  const moreApps: StoreApp[] = fameGames()

  return (
    <VStack className="gap-3">
      <Text className="text-[22] font-bold tracking-tight">You Might Also Like</Text>
      <HStack className="gap-0">
        <VStack className="flex-1 gap-0">
          <AppRow app={moreApps[0]} testId="dm-0" />
          <Divider />
          <AppRow app={moreApps[3]} testId="dm-3" />
          <Divider />
          <AppRow app={moreApps[6]} testId="dm-6" />
        </VStack>
        <VStack className="flex-1 gap-0">
          <AppRow app={moreApps[1]} testId="dm-1" />
          <Divider />
          <AppRow app={moreApps[4]} testId="dm-4" />
          <Divider />
          <AppRow app={moreApps[7]} testId="dm-7" />
        </VStack>
        <VStack className="flex-1 gap-0">
          <AppRow app={moreApps[2]} testId="dm-2" />
          <Divider />
          <AppRow app={moreApps[5]} testId="dm-5" />
          <Divider />
          <AppRow app={moreApps[8]} testId="dm-8" />
        </VStack>
      </HStack>
    </VStack>
  )
}

export function DetailScreen() {
  return (
    <Scroll className="flex-1 overflow-y-auto">
      <VStack className="gap-0 px-8 py-5">
        <HStack className="items-center gap-3 pb-4">
          <Button variant="ghost" icon="chevron.left" onClick={goBackToStorefront}>Back</Button>
        </HStack>
        <DetailHero />
        <VStack className="h-[4]" />
        <DetailMetricStrip />
        <VStack className="h-[4]" />
        <DetailScreenshots />
        <VStack className="h-[32]" />
        <DetailDescription />
        <VStack className="h-[32]" />
        <Divider />
        <VStack className="h-[32]" />
        <DetailRatings />
        <VStack className="h-[32]" />
        <Divider />
        <VStack className="h-[32]" />
        <DetailWhatsNew />
        <VStack className="h-[32]" />
        <Divider />
        <VStack className="h-[32]" />
        <DetailInformation />
        <VStack className="h-[32]" />
        <Divider />
        <VStack className="h-[32]" />
        <DetailMoreApps />
        <VStack className="h-[40]" />
        <NativeHud />
      </VStack>
    </Scroll>
  )
}
