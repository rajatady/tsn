import { useRoute, useState, useStore } from '../../../../packages/tsn-ui/src/react'
import {
  AppRow,
  InfoPairView,
  MetricStat,
  NativeHud,
  ReviewCardView,
  SectionHeader,
} from '../components'
import { detailBaseFromAppId, fameGames, storeAppFromId, type GameDetail, type StoreApp } from '../data'
import { goBackToStorefront } from '../store'

function DetailTopBar() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const app: StoreApp = storeAppFromId(selectedAppId)

  return (
    <HStack className="items-center gap-3">
      <Button variant="ghost" icon="chevron.left" onClick={goBackToStorefront}>Back</Button>
      <Spacer />
      <HStack className="items-center gap-2">
        <Image src={app.icon} className="w-[22] h-[22] rounded-lg object-cover" />
        <Text className="text-base font-bold">{app.title}</Text>
      </HStack>
      <Spacer />
      <Button variant="get">Get</Button>
      <Button variant="ghost" icon="square.and.arrow.up">Share</Button>
    </HStack>
  )
}

function DetailSummary() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const app: StoreApp = storeAppFromId(selectedAppId)
  const detail: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <Card className="rounded-xl shadow-lg">
      <HStack className="items-center gap-5">
        <Image src={app.icon} className="w-[104] h-[104] rounded-2xl object-cover" />
        <VStack className="flex-1 gap-1">
          <Text className="text-xs text-zinc-400">{app.subtitle}</Text>
          <Text className="text-4xl font-bold tracking-tight">{app.title}</Text>
          <Text className="text-lg text-zinc-400">{app.caption}</Text>
        </VStack>
        <VStack className="gap-3">
          <Button variant="get">Get</Button>
          <Text className="text-sm text-zinc-400">{detail.genre}</Text>
        </VStack>
      </HStack>
    </Card>
  )
}

function MetricStrip() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const game: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <Card className="rounded-xl shadow-lg">
      <HStack className="items-center gap-8">
        <MetricStat eyebrow="10 RATINGS" value={game.rating} subtitle="out of 5" />
        <MetricStat eyebrow="AGES" value="4+" subtitle="Years" />
        <MetricStat eyebrow="CATEGORY" value={game.genre} subtitle="Arcade" />
        <MetricStat eyebrow="PLAYERS" value="1" subtitle="Single" />
        <MetricStat eyebrow="DEVELOPER" value={game.studio} subtitle="Verified" />
        <MetricStat eyebrow="LANGUAGE" value="EN" subtitle="+14 More" />
        <MetricStat eyebrow="SIZE" value="233.8" subtitle="MB" />
      </HStack>
    </Card>
  )
}

function PlatformRow() {
  return (
    <HStack className="items-center gap-3">
      <Symbol name="desktopcomputer" size={14} color="secondary" />
      <Symbol name="ipad" size={14} color="secondary" />
      <Symbol name="iphone" size={14} color="secondary" />
      <Symbol name="tv" size={14} color="secondary" />
      <Text className="text-sm text-zinc-400">Mac, iPad, iPhone, Apple TV</Text>
    </HStack>
  )
}

function AboutBlock() {
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const game: GameDetail = detailBaseFromAppId(selectedAppId)

  return (
    <HStack className="gap-8">
      <VStack className="flex-1 gap-1">
        <Text className="text-base font-bold">{game.tagline}</Text>
        <Text className="text-sm text-zinc-400">{game.summary}</Text>
      </VStack>
      <VStack className="gap-1">
        <Text className="text-sm text-zinc-400">DEVELOPER</Text>
        <Text className="text-base font-bold">{game.studio}</Text>
        <Button variant="link">Support</Button>
      </VStack>
    </HStack>
  )
}

export function DetailScreen() {
  const [route, navigate] = useRoute('discover')
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const game: GameDetail = detailBaseFromAppId(selectedAppId)
  const [section, setSection] = useState('reviews')
  const moreGames: StoreApp[] = fameGames()

  let sectionBody: JSX.Element = (
    <VStack className="gap-4">
      <SectionHeader title="Ratings & Reviews" action="See All" route="arcade" />
      <HStack className="gap-4">
        <Card className="rounded-xl">
          <VStack className="gap-2">
            <Text className="text-6xl font-bold">{game.rating}</Text>
            <Text className="text-base text-zinc-400">out of 5</Text>
            <Text className="text-sm text-zinc-400">10 Ratings</Text>
          </VStack>
        </Card>
        <VStack className="flex-1 gap-3">
          <HStack className="gap-2">
            <Text className="text-sm text-zinc-400">★★★★★</Text>
            <Divider />
          </HStack>
          <HStack className="gap-2">
            <Text className="text-sm text-zinc-400">★★★★☆</Text>
            <Divider />
          </HStack>
          <HStack className="gap-2">
            <Text className="text-sm text-zinc-400">★★★☆☆</Text>
            <Divider />
          </HStack>
        </VStack>
      </HStack>
      <HStack className="gap-4">
        <ReviewCardView review={game.reviews[0]} />
        <ReviewCardView review={game.reviews[1]} />
      </HStack>
    </VStack>
  )

  if (section === 'privacy') {
    sectionBody = (
      <VStack className="gap-4">
        <SectionHeader title="App Privacy" action="See Details" route="arcade" />
        <Card className="rounded-xl">
          <VStack className="gap-2">
            <Symbol name="hand.raised.slash" size={34} color="blue" />
            <Text className="text-2xl font-bold">Data Not Linked to You</Text>
            <Text className="text-sm text-zinc-400">The following data may be collected but it is not linked to your identity.</Text>
            <Text className="text-sm text-zinc-400">Usage Data</Text>
          </VStack>
        </Card>
      </VStack>
    )
  }

  return (
    <Scroll className="flex-1">
      <VStack className="gap-8 p-4">
        <DetailTopBar />
        <DetailSummary />
        <Image src={game.hero} className="w-[1110] h-[400] rounded-xl object-cover" />
        <MetricStrip />
        <HStack className="gap-4">
          <Image src={game.screenOne} className="w-[548] h-[300] rounded-xl object-cover" />
          <Image src={game.screenTwo} className="w-[548] h-[300] rounded-xl object-cover" />
        </HStack>
        <PlatformRow />
        <AboutBlock />

        <Card className="rounded-xl">
          <HStack className="gap-2">
            <Button variant="chip" onClick={() => setSection('reviews')}>Ratings & Reviews</Button>
            <Button variant="chip" onClick={() => setSection('privacy')}>App Privacy</Button>
          </HStack>
        </Card>

        {sectionBody}

        <VStack className="gap-2">
          <SectionHeader title="What's New" action="Version History" route="arcade" />
          <Text className="text-base font-bold">{game.whatsNew}</Text>
          <Text className="text-sm text-zinc-400">Version 119.0</Text>
        </VStack>

        <VStack className="gap-4">
          <SectionHeader title="Information" action="" route="arcade" />
          <Card className="rounded-xl">
            <HStack className="gap-8">
              <InfoPairView item={game.info[0]} />
              <InfoPairView item={game.info[1]} />
              <InfoPairView item={game.info[2]} />
              <InfoPairView item={game.info[3]} />
            </HStack>
          </Card>
        </VStack>

        <VStack className="gap-4">
          <SectionHeader title="More From Apple Arcade" action="See All" route="arcade" />
          <HStack className="gap-8">
            <VStack className="flex-1 gap-4">
              <AppRow app={moreGames[0]} />
              <AppRow app={moreGames[3]} />
            </VStack>
            <VStack className="flex-1 gap-4">
              <AppRow app={moreGames[1]} />
              <AppRow app={moreGames[4]} />
            </VStack>
            <VStack className="flex-1 gap-4">
              <AppRow app={moreGames[2]} />
              <AppRow app={moreGames[5]} />
            </VStack>
          </HStack>
        </VStack>

        <NativeHud />
      </VStack>
    </Scroll>
  )
}
