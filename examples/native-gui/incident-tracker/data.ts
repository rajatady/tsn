import {
  heroImage,
  spotlightOneImage,
  spotlightTwoImage,
  featureOneImage,
  featureTwoImage,
  featureThreeImage,
  featureFourImage,
  featureFiveImage,
} from './assets'

export interface Feature {
  icon: string
  title: string
  description: string
}

export interface Spotlight {
  eyebrow: string
  title: string
  subtitle: string
  image: string
}

export interface FeatureCard {
  title: string
  subtitle: string
  image: string
}

export function heroData(): Spotlight {
  const hero: Spotlight = {
    eyebrow: 'macOS Sequoia',
    title: 'All new. All you.',
    subtitle: 'macOS Sequoia brings new ways to work, play, and create on your Mac.',
    image: heroImage,
  }
  return hero
}

export function coreFeatures(): Feature[] {
  const features: Feature[] = [
    {
      icon: 'macwindow.on.rectangle',
      title: 'iPhone Mirroring',
      description: 'Use your iPhone right from your Mac.',
    },
    {
      icon: 'safari.fill',
      title: 'Safari Updates',
      description: 'Highlights surface key information.',
    },
    {
      icon: 'lock.shield.fill',
      title: 'Privacy & Security',
      description: 'Lock and hide apps behind Face ID.',
    },
  ]
  return features
}

export function spotlightOne(): Spotlight {
  const data: Spotlight = {
    eyebrow: 'Continuity',
    title: 'All your devices, one seamless experience.',
    subtitle: 'Start on iPhone. Continue on Mac. Finish on iPad.',
    image: spotlightOneImage,
  }
  return data
}

export function spotlightTwo(): Spotlight {
  const data: Spotlight = {
    eyebrow: 'Apple Intelligence',
    title: 'AI that understands you.',
    subtitle: 'Writing tools, image generation, and smart suggestions.',
    image: spotlightTwoImage,
  }
  return data
}

export function featureCards(): FeatureCard[] {
  const cards: FeatureCard[] = [
    { title: 'Window Tiling', subtitle: 'Snap and organize windows with a drag.', image: featureOneImage },
    { title: 'Video Conferencing', subtitle: 'Presenter overlay and smart backgrounds.', image: featureTwoImage },
    { title: 'Gaming', subtitle: 'Game Mode for peak performance on Mac.', image: featureThreeImage },
    { title: 'Passwords App', subtitle: 'A dedicated app for all your credentials.', image: featureFourImage },
    { title: 'Messages', subtitle: 'Schedule, edit, and react with any emoji.', image: featureFiveImage },
  ]
  return cards
}

export function compatibilityModels(): string[] {
  const models: string[] = [
    'MacBook Air (2020 and later)',
    'MacBook Pro (2018 and later)',
    'Mac mini (2018 and later)',
    'Mac Studio (2022 and later)',
    'Mac Pro (2019 and later)',
    'iMac (2019 and later)',
  ]
  return models
}
