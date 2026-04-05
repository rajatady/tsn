import { useStore } from '../../../packages/tsn-ui/src/react'
import { gallerySuiteByTag } from './registry'

export function initGallery(): void {
  const [suite, setSuite] = useStore<string>('ui-gallery:suite', 'layout')
  const [query, setQuery] = useStore<string>('ui-gallery:query', '')
  const [counter, setCounter] = useStore<number>('ui-gallery:counter', 0)
  setSuite('layout')
  setQuery('')
  setCounter(0)
}

export function setActiveSuite(id: string): void {
  const [suite, setSuite] = useStore<string>('ui-gallery:suite', 'layout')
  setSuite(id)
}

export function onSuiteClick(tag: number): void {
  setActiveSuite(gallerySuiteByTag(tag).id)
}

export function onGallerySearch(text: string): void {
  const [query, setQuery] = useStore<string>('ui-gallery:query', '')
  setQuery(text.trim())
}

export function incrementCounter(): void {
  const [counter, setCounter] = useStore<number>('ui-gallery:counter', 0)
  setCounter(counter + 1)
}

export function decrementCounter(): void {
  const [counter, setCounter] = useStore<number>('ui-gallery:counter', 0)
  if (counter === 0) return
  setCounter(counter - 1)
}

export function resetDemo(): void {
  const [counter, setCounter] = useStore<number>('ui-gallery:counter', 0)
  const [query, setQuery] = useStore<string>('ui-gallery:query', '')
  setCounter(0)
  setQuery('')
}
