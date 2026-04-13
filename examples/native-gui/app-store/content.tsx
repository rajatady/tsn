import { DiscoverScreen } from './screens/discover'
import { ArcadeScreen } from './screens/arcade'
import { DetailScreen } from './screens/detail'
import { DevelopScreen } from './screens/develop'
import { PlayScreen } from './screens/play'

interface AppStoreContentProps {
  route: string
}

export function AppStoreContent({ route }: AppStoreContentProps) {
  if (route === 'arcade') {
    return <ArcadeScreen />
  }

  if (route === 'play') {
    return <PlayScreen />
  }

  if (route === 'develop') {
    return <DevelopScreen />
  }

  if (route === 'detail') {
    return <DetailScreen />
  }

  return <DiscoverScreen />
}
