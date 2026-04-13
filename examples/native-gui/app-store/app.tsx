import { useRoute } from '../../../packages/tsn-ui/src/react'
import { AppStoreSidebar } from './sidebar'
import { AppStoreContent } from './content'

export function App() {
  const [route, navigate] = useRoute('discover')

  return (
    <Window title="App Store" width={1400} height={900} dark subtitle="Apple Arcade">
      <HStack className="flex-1 gap-0 bg-black">
        <AppStoreSidebar />
        <VStack className="flex-1 gap-0 bg-[#161617]">
          <AppStoreContent route={route} />
        </VStack>
      </HStack>
    </Window>
  )
}
