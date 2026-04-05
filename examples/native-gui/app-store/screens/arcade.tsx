import { useRoute, useState } from '../../framework/react'

function ShelfTabs() {
  const [shelf, setShelf] = useState('featured')

  let heading: string = 'Top Arcade Games'
  let subheading: string = 'Fast native state updates with no JavaScript runtime.'
  if (shelf === 'relax') {
    heading = 'Cozy Picks'
    subheading = 'A quieter shelf tuned for comfort and slower pacing.'
  }
  if (shelf === 'strategy') {
    heading = 'Strategy Shelf'
    subheading = 'Long-session games with deeper systems and sharper planning.'
  }

  return (
    <Card className="rounded-xl">
      <VStack className="gap-3">
        <HStack className="gap-2">
          <Button variant="ghost" onClick={() => setShelf('featured')}>All Games</Button>
          <Button variant="ghost" onClick={() => setShelf('relax')}>Casual</Button>
          <Button variant="ghost" onClick={() => setShelf('strategy')}>Strategy</Button>
        </HStack>
        <Text className="text-2xl font-bold">{heading}</Text>
        <Text className="text-sm text-zinc-400">{subheading}</Text>
      </VStack>
    </Card>
  )
}

function SearchBanner() {
  const [query, setQuery] = useState('')

  let title: string = 'No In-App Purchases. No Ads. Just Fun.'
  let subtitle: string = 'A native App Store-style screen powered by useState and useRoute.'
  if (query.trim().length > 0) {
    title = 'Search: ' + query.trim()
    subtitle = 'The input callback is updating native UI state directly.'
  }

  return (
    <Card className="rounded-xl">
      <VStack className="gap-4">
        <Text className="text-sm text-zinc-400">Apple Arcade</Text>
        <Text className="text-3xl font-bold">{title}</Text>
        <Text className="text-sm text-zinc-400">{subtitle}</Text>
        <HStack className="gap-3">
          <Search placeholder="Search Arcade" onChange={text => setQuery(text)} className="w-[280]" />
          <Button variant="primary" onClick={() => setQuery('')}>Clear</Button>
        </HStack>
      </VStack>
    </Card>
  )
}

export function ArcadeScreen() {
  const [route, navigate] = useRoute('arcade')

  return (
    <VStack className="flex-1 gap-4 p-5">
      <HStack className="gap-3">
        <VStack className="flex-1 gap-1">
          <Text className="text-3xl font-bold">Arcade</Text>
          <Text className="text-sm text-zinc-400">The first routed StrictTS native storefront. Active route: {route}</Text>
        </VStack>
        <Button variant="primary" onClick={() => navigate('game:rural-life')}>Accept Offer</Button>
      </HStack>

      <SearchBanner />
      <ShelfTabs />

      <Text className="text-2xl font-bold">Featured</Text>

      <Card className="rounded-xl">
        <VStack className="gap-4">
          <HStack className="gap-3">
            <VStack className="flex-1 gap-1">
              <Text className="text-xl font-bold">Japanese Rural Life Adventure</Text>
              <Text className="text-sm text-zinc-400">Country experience simulation</Text>
            </VStack>
            <Button variant="ghost" onClick={() => navigate('game:rural-life')}>View</Button>
            <Button variant="primary" onClick={() => navigate('game:rural-life')}>Get</Button>
          </HStack>
          <Divider />
          <HStack className="gap-3">
            <VStack className="flex-1 gap-1">
              <Text className="text-xl font-bold">DREDGE+</Text>
              <Text className="text-sm text-zinc-400">A sinister fishing adventure</Text>
            </VStack>
            <Button variant="ghost" onClick={() => navigate('game:dredge')}>View</Button>
            <Button variant="primary" onClick={() => navigate('game:dredge')}>Get</Button>
          </HStack>
          <Divider />
          <HStack className="gap-3">
            <VStack className="flex-1 gap-1">
              <Text className="text-xl font-bold">Hello Kitty Island Adventure</Text>
              <Text className="text-sm text-zinc-400">Island adventures await</Text>
            </VStack>
            <Button variant="ghost" onClick={() => navigate('game:hello-kitty')}>View</Button>
            <Button variant="primary" onClick={() => navigate('game:hello-kitty')}>Get</Button>
          </HStack>
        </VStack>
      </Card>
    </VStack>
  )
}
