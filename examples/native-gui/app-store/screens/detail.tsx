import { useRoute, useState } from '../../framework/react'
import type { GameDetail } from '../data'

interface DetailScreenProps {
  game: GameDetail
}

export function DetailScreen({ game }: DetailScreenProps) {
  const [route, navigate] = useRoute('arcade')
  const [section, setSection] = useState('reviews')

  let bodyTitle: string = 'Ratings & Reviews'
  let bodyText: string = game.rating + ' out of 5. Loved for its atmosphere, pacing, and handcrafted feel.'
  if (section === 'whats-new') {
    bodyTitle = 'What’s New'
    bodyText = game.whatsNew
  }
  if (section === 'privacy') {
    bodyTitle = 'App Privacy'
    bodyText = 'Data is not linked to you. This native demo keeps its routing and local state entirely inside compiled code.'
  }

  return (
    <VStack className="flex-1 gap-4 p-5">
      <HStack className="gap-3">
        <Button variant="ghost" onClick={() => navigate('arcade')}>Back</Button>
        <VStack className="flex-1 gap-1">
          <Text className="text-3xl font-bold">{game.title}</Text>
          <Text className="text-sm text-zinc-400">{game.subtitle}</Text>
        </VStack>
        <Button variant="primary" onClick={() => navigate('arcade')}>Get</Button>
      </HStack>

      <Card className="rounded-xl">
        <VStack className="gap-2">
          <Text className="text-sm text-zinc-400">Apple Arcade</Text>
          <Text className="text-2xl font-bold">{game.tagline}</Text>
          <Text className="text-sm text-zinc-400">{game.summary} Route: {route}</Text>
        </VStack>
      </Card>

      <Card className="rounded-xl">
        <HStack className="gap-2">
          <Button variant="ghost" onClick={() => setSection('reviews')}>Reviews</Button>
          <Button variant="ghost" onClick={() => setSection('whats-new')}>What’s New</Button>
          <Button variant="ghost" onClick={() => setSection('privacy')}>Privacy</Button>
        </HStack>
      </Card>

      <Card className="rounded-xl">
        <VStack className="gap-2">
          <Text className="text-2xl font-bold">{bodyTitle}</Text>
          <Text className="text-sm text-zinc-400">{bodyText}</Text>
          <Divider />
          <HStack className="gap-4">
            <VStack className="gap-1">
              <Text className="text-sm text-zinc-400">Developer</Text>
              <Text className="text-lg font-bold">{game.studio}</Text>
            </VStack>
            <VStack className="gap-1">
              <Text className="text-sm text-zinc-400">Genre</Text>
              <Text className="text-lg font-bold">{game.genre}</Text>
            </VStack>
            <VStack className="gap-1">
              <Text className="text-sm text-zinc-400">Rating</Text>
              <Text className="text-lg font-bold">{game.rating}</Text>
            </VStack>
          </HStack>
        </VStack>
      </Card>
    </VStack>
  )
}
