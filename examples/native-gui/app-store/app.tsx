import { useRoute } from '../framework/react'
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
  if (route.startsWith('game:')) content = <DetailScreen />

  return (
    <Window title="App Store" width={1400} height={900} dark subtitle="Apple Arcade">
      <HStack className="flex-1 gap-3 bg-black p-2">
        <AppStoreSidebar />
        <VStack className="flex-1 gap-0 bg-zinc-900 rounded-xl">
          {content}
        </VStack>
      </HStack>
    </Window>
  )
}
