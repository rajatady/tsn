import { useRoute, useStore } from '../framework/react'
import { activeStorefrontRoute } from './navigation'
import { storeAppFromTag, type StoreApp } from './data'

export function openStoreApp(tag: number): void {
  const [route, navigate] = useRoute('discover')
  const [selectedAppId, setSelectedAppId] = useStore<string>('app-store:selected-app-id', 'rural-life')
  const [returnRoute, setReturnRoute] = useStore<string>('app-store:return-route', 'discover')
  const sourceRoute: string = activeStorefrontRoute(route, returnRoute)
  const app: StoreApp = storeAppFromTag(tag)

  setSelectedAppId(app.id)
  setReturnRoute(sourceRoute)
  navigate('detail')
}

export function goBackToStorefront(): void {
  const [route, navigate] = useRoute('discover')
  const [returnRoute, setReturnRoute] = useStore<string>('app-store:return-route', 'discover')
  navigate(activeStorefrontRoute(route, returnRoute))
}
