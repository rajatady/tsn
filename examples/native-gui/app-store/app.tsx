import { useRoute } from '../framework/react'
import { gameFromRoute } from './data'
import { AppStoreSidebar } from './sidebar'
import { ArcadeScreen } from './screens/arcade'
import { DetailScreen } from './screens/detail'
import { DevelopScreen } from './screens/develop'
import { PlayScreen } from './screens/play'

export function App() {
  const [route, navigate] = useRoute('arcade')

  let content: JSX.Element = <ArcadeScreen />
  if (route === 'play') content = <PlayScreen />
  if (route === 'develop') content = <DevelopScreen />
  if (route.startsWith('game:')) content = <DetailScreen game={gameFromRoute(route)} />

  return (
    <Window title="App Store" width={1340} height={860} dark subtitle="StrictTS Native Storefront">
      <HStack className="flex-1 gap-0 bg-zinc-900">
        <AppStoreSidebar />
        <VStack className="flex-1 gap-0 bg-zinc-900">
          {content}
        </VStack>
      </HStack>
    </Window>
  )
}
