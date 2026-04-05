export function activeStorefrontRoute(currentRoute: string, returnRoute: string): string {
  if (currentRoute === 'detail') return returnRoute
  return currentRoute
}
