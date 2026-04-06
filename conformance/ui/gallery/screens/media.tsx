import {
  arcadeHeroImage,
  iconDredge,
  iconHelloKitty,
  iconRuralLife,
  ruralScreenOneImage,
  ruralScreenTwoImage,
} from '../../../../examples/native-gui/app-store/assets'

export function MediaConformanceScreen() {
  return (
    <VStack className="gap-6">
      <Text className="text-2xl font-bold">Media Primitives</Text>

      <Image testId="media.hero" src={arcadeHeroImage} className="w-[1080] h-[420] rounded-2xl" />

      <HStack testId="media.icon.row" className="gap-4">
        <Image testId="media.icon.1" src={iconDredge} className="w-[64] h-[64] rounded-xl" />
        <Image testId="media.icon.2" src={iconHelloKitty} className="w-[64] h-[64] rounded-xl" />
        <Image testId="media.icon.3" src={iconRuralLife} className="w-[64] h-[64] rounded-xl" />
      </HStack>

      <HStack testId="media.screens.row" className="gap-4">
        <Image testId="media.screen.1" src={ruralScreenOneImage} className="w-[530] h-[300] rounded-2xl" />
        <Image testId="media.screen.2" src={ruralScreenTwoImage} className="w-[530] h-[300] rounded-2xl" />
      </HStack>
    </VStack>
  )
}
