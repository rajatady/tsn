import {
  HeroSection,
  ContinuitySection,
  IntelligenceSection,
  FeaturesCarousel,
  FooterSection,
} from './components'

export function App() {
  return (
    <Window title="macOS" width={1280} height={800} dark subtitle="macOS landing page">
      <Scroll className="flex-1 overflow-y-auto">
        <VStack className="gap-0 bg-black">
          <HeroSection />
          <ContinuitySection />
          <IntelligenceSection />
          <FeaturesCarousel />
          <FooterSection />
        </VStack>
      </Scroll>
    </Window>
  )
}
