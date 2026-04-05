import { useRoute } from '../framework/react'
import type {
  CategoryCard,
  EditorialCard,
  InfoPair,
  Perk,
  Review,
  RankedApp,
  StoreApp,
} from './data'

interface SectionHeaderProps {
  title: string
  action: string
  route: string
}

export function SectionHeader({ title, action, route }: SectionHeaderProps) {
  const [currentRoute, navigate] = useRoute('discover')

  if (action.length === 0) {
    return (
      <Text className="text-2xl font-bold">{title}</Text>
    )
  }

  if (route === 'develop') {
    return (
      <HStack className="gap-3">
        <Text className="text-2xl font-bold">{title}</Text>
        <Spacer />
        <Button variant="link" onClick={() => navigate('develop')}>{action}</Button>
      </HStack>
    )
  }

  if (route === 'play') {
    return (
      <HStack className="gap-3">
        <Text className="text-2xl font-bold">{title}</Text>
        <Spacer />
        <Button variant="link" onClick={() => navigate('play')}>{action}</Button>
      </HStack>
    )
  }

  if (route === 'discover') {
    return (
      <HStack className="gap-3">
        <Text className="text-2xl font-bold">{title}</Text>
        <Spacer />
        <Button variant="link" onClick={() => navigate('discover')}>{action}</Button>
      </HStack>
    )
  }

  return (
    <HStack className="gap-3">
      <Text className="text-2xl font-bold">{title}</Text>
      <Spacer />
      <Button variant="link" onClick={() => navigate('arcade')}>{action}</Button>
    </HStack>
  )
}

interface AppActionButtonProps {
  label: string
  route: string
}

function AppActionButton({ label, route }: AppActionButtonProps) {
  const [currentRoute, navigate] = useRoute('discover')

  if (route === 'game:dredge') {
    if (label === 'Get') return <Button variant="get" onClick={() => navigate('game:dredge')}>Get</Button>
    return <Button variant="ghost" onClick={() => navigate('game:dredge')}>{label}</Button>
  }

  if (route === 'game:hello-kitty') {
    if (label === 'Get') return <Button variant="get" onClick={() => navigate('game:hello-kitty')}>Get</Button>
    return <Button variant="ghost" onClick={() => navigate('game:hello-kitty')}>{label}</Button>
  }

  if (route === 'develop') {
    if (label === 'Get') return <Button variant="get" onClick={() => navigate('develop')}>Get</Button>
    return <Button variant="ghost" onClick={() => navigate('develop')}>{label}</Button>
  }

  if (route === 'play') {
    if (label === 'Get') return <Button variant="get" onClick={() => navigate('play')}>Get</Button>
    return <Button variant="ghost" onClick={() => navigate('play')}>{label}</Button>
  }

  if (route === 'discover') {
    if (label === 'Get') return <Button variant="get" onClick={() => navigate('discover')}>Get</Button>
    return <Button variant="ghost" onClick={() => navigate('discover')}>{label}</Button>
  }

  if (label === 'Get') {
    return <Button variant="get" onClick={() => navigate('game:rural-life')}>Get</Button>
  }

  return <Button variant="ghost" onClick={() => navigate('game:rural-life')}>{label}</Button>
}

interface AppRowProps {
  app: StoreApp
}

export function AppRow({ app }: AppRowProps) {
  return (
    <HStack className="gap-3">
      <Image src={app.icon} className="w-[52] h-[52] rounded-xl" />
      <VStack className="flex-1 gap-0">
        <Text className="text-xs text-zinc-400">{app.subtitle}</Text>
        <Text className="text-lg font-bold">{app.title}</Text>
        <Text className="text-sm text-zinc-400">{app.caption}</Text>
      </VStack>
      <AppActionButton label={app.action} route={app.route} />
    </HStack>
  )
}

interface RankedAppRowProps {
  item: RankedApp
}

export function RankedAppRow({ item }: RankedAppRowProps) {
  return (
    <HStack className="gap-4">
      <Image src={item.app.icon} className="w-[54] h-[54] rounded-xl" />
      <Text className="text-2xl font-bold">{item.rank}</Text>
      <VStack className="flex-1 gap-0">
        <Text className="text-xs text-zinc-400">{item.app.subtitle}</Text>
        <Text className="text-lg font-bold">{item.app.title}</Text>
        <Text className="text-sm text-zinc-400">{item.app.caption}</Text>
      </VStack>
      <AppActionButton label={item.app.action} route={item.app.route} />
    </HStack>
  )
}

interface PerkCardProps {
  perk: Perk
}

export function PerkCardView({ perk }: PerkCardProps) {
  return (
    <VStack className="gap-2">
      <Image src={perk.image} className="w-[240] h-[145] rounded-xl" />
      <Text className="text-base font-bold">{perk.title}</Text>
      <Text className="text-sm text-zinc-400">{perk.subtitle}</Text>
    </VStack>
  )
}

interface CategoryTileProps {
  card: CategoryCard
}

export function CategoryTile({ card }: CategoryTileProps) {
  return (
    <VStack className="gap-2">
      <Image src={card.image} className="w-[250] h-[138] rounded-xl" />
      <Text className="text-lg font-bold">{card.title}</Text>
    </VStack>
  )
}

interface EditorialCardProps {
  card: EditorialCard
  large: boolean
}

export function EditorialCardView({ card, large }: EditorialCardProps) {
  const [currentRoute, navigate] = useRoute('discover')
  let openStory: JSX.Element = <Button variant="ghost" onClick={() => navigate('discover')}>Open Story</Button>

  if (card.route === 'develop') openStory = <Button variant="ghost" onClick={() => navigate('develop')}>Open Story</Button>
  if (card.route === 'play') openStory = <Button variant="ghost" onClick={() => navigate('play')}>Open Story</Button>

  if (large) {
    return (
      <VStack className="gap-3">
        <Image src={card.image} className="w-[520] h-[320] rounded-xl" />
        <VStack className="gap-0">
          <Text className="text-xs text-zinc-400">{card.eyebrow}</Text>
          <Text className="text-xl font-bold">{card.title}</Text>
          <Text className="text-sm text-zinc-400">{card.subtitle}</Text>
        </VStack>
        {openStory}
      </VStack>
    )
  }

  return (
    <VStack className="gap-3">
      <Image src={card.image} className="w-[348] h-[220] rounded-xl" />
      <VStack className="gap-0">
        <Text className="text-xs text-zinc-400">{card.eyebrow}</Text>
        <Text className="text-xl font-bold">{card.title}</Text>
        <Text className="text-sm text-zinc-400">{card.subtitle}</Text>
      </VStack>
      {openStory}
    </VStack>
  )
}

interface MetricProps {
  eyebrow: string
  value: string
  subtitle: string
}

export function MetricStat({ eyebrow, value, subtitle }: MetricProps) {
  return (
    <VStack className="gap-1">
      <Text className="text-xs text-zinc-400">{eyebrow}</Text>
      <Text className="text-2xl font-bold">{value}</Text>
      <Text className="text-sm text-zinc-400">{subtitle}</Text>
    </VStack>
  )
}

interface ReviewCardProps {
  review: Review
}

export function ReviewCardView({ review }: ReviewCardProps) {
  return (
    <Card className="rounded-xl">
      <VStack className="gap-2">
        <HStack className="gap-3">
          <VStack className="flex-1 gap-0">
            <Text className="text-lg font-bold">{review.title}</Text>
            <Text className="text-sm text-zinc-400">{review.age}</Text>
          </VStack>
          <Text className="text-sm text-zinc-400">{review.author}</Text>
        </HStack>
        <Text className="text-sm text-zinc-400">★★★★★</Text>
        <Text className="text-sm text-zinc-400">{review.body}</Text>
      </VStack>
    </Card>
  )
}

interface InfoPairProps {
  item: InfoPair
}

export function InfoPairView({ item }: InfoPairProps) {
  return (
    <VStack className="gap-1">
      <Text className="text-xs text-zinc-400">{item.label}</Text>
      <Text className="text-lg font-bold">{item.value}</Text>
    </VStack>
  )
}

export function NativeHud() {
  return (
    <Card className="rounded-xl">
      <VStack className="gap-2">
        <Text className="text-xs text-zinc-400">STRICTTS NATIVE</Text>
        <Text className="text-sm font-bold">Hooks, router, images</Text>
        <HStack className="gap-2">
          <Button variant="chip">C runtime</Button>
          <Button variant="chip">AppKit</Button>
          <Button variant="chip">TSX</Button>
        </HStack>
      </VStack>
    </Card>
  )
}
