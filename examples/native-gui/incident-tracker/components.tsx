import {
  heroData,
  spotlightOne,
  spotlightTwo,
  featureCards,
  type Spotlight,
  type FeatureCard,
} from './data'

export function HeroSection() {
  const hero: Spotlight = heroData()

  return (
    <ZStack className="overflow-hidden">
      <Image src={hero.image} className="aspect-[16/8] object-cover" />
      <Gradient from="black/80" to="black/20" direction="to-top" />
      <Gradient from="black/60" to="transparent" direction="to-bottom" />
      <VStack className="items-center justify-end p-8 gap-0">
        <Text className="text-[15] font-semibold text-white/40 uppercase tracking-wider">{hero.eyebrow}</Text>
        <VStack className="h-[12]" />
        <Text className="text-[56] font-bold tracking-tight">{hero.title}</Text>
        <VStack className="h-[12]" />
        <Text className="text-[21] text-white/50">{hero.subtitle}</Text>
        <VStack className="h-[60]" />
      </VStack>
    </ZStack>
  )
}

function FullBleedSection(data: Spotlight) {
  return (
    <ZStack className="overflow-hidden">
      <Image src={data.image} className="aspect-[16/8] object-cover" />
      <Gradient from="black/80" to="transparent" direction="to-top" />
      <VStack className="justify-end p-8 gap-0">
        <Text className="text-[11] font-bold text-white/30 uppercase tracking-wider">{data.eyebrow}</Text>
        <VStack className="h-[8]" />
        <Text className="text-[36] font-bold tracking-tight leading-tight">{data.title}</Text>
        <VStack className="h-[8]" />
        <Text className="text-[15] text-white/45">{data.subtitle}</Text>
        <VStack className="h-[24]" />
      </VStack>
    </ZStack>
  )
}

export function ContinuitySection() {
  const data: Spotlight = spotlightOne()
  return FullBleedSection(data)
}

export function IntelligenceSection() {
  const data: Spotlight = spotlightTwo()
  return FullBleedSection(data)
}

function FeatureShowcaseCard(title: string, subtitle: string, image: string) {
  return (
    <ZStack className="w-[400] rounded-2xl overflow-hidden">
      <Image src={image} className="aspect-[16/10] object-cover" />
      <Gradient from="black/70" to="transparent" direction="to-top" />
      <VStack className="justify-end p-5 gap-0">
        <Text className="text-[17] font-bold truncate">{title}</Text>
        <VStack className="h-[4]" />
        <Text className="text-[13] text-white/45 truncate">{subtitle}</Text>
      </VStack>
    </ZStack>
  )
}

export function FeaturesCarousel() {
  const cards: FeatureCard[] = featureCards()

  return (
    <VStack className="gap-0 bg-black">
      <VStack className="h-[60]" />
      <VStack className="items-center">
        <Text className="text-[36] font-bold tracking-tight">Even more to explore.</Text>
      </VStack>
      <VStack className="h-[32]" />
      <VStack className="px-8">
        <Scroll className="overflow-x-auto">
          <HStack className="gap-5">
            {FeatureShowcaseCard(cards[0].title, cards[0].subtitle, cards[0].image)}
            {FeatureShowcaseCard(cards[1].title, cards[1].subtitle, cards[1].image)}
            {FeatureShowcaseCard(cards[2].title, cards[2].subtitle, cards[2].image)}
            {FeatureShowcaseCard(cards[3].title, cards[3].subtitle, cards[3].image)}
            {FeatureShowcaseCard(cards[4].title, cards[4].subtitle, cards[4].image)}
          </HStack>
        </Scroll>
      </VStack>
      <VStack className="h-[60]" />
    </VStack>
  )
}

export function FooterSection() {
  return (
    <VStack className="items-center gap-0 bg-black px-8">
      <VStack className="h-[40]" />
      <Divider />
      <VStack className="h-[32]" />
      <Text className="text-[11] text-white/20 uppercase tracking-wider">TSN Native</Text>
      <VStack className="h-[8]" />
      <Text className="text-[13] text-white/25">Compiled to ARM64. No Electron. No web views.</Text>
      <VStack className="h-[40]" />
    </VStack>
  )
}
