export interface ComponentRecipe {
  name: string
  slots: Record<string, string[]>
  variants: Record<string, Record<string, string[]>>
}

export function defineRecipe(recipe: ComponentRecipe): ComponentRecipe {
  return recipe
}

export const buttonRecipe = defineRecipe({
  name: 'button',
  slots: {
    root: ['inline-flex', 'items-center', 'justify-center'],
  },
  variants: {
    variant: {
      primary: ['bg-accent', 'text-text'],
      ghost: ['bg-transparent'],
      chip: ['bg-panel', 'rounded-full'],
      get: ['bg-white', 'text-accent', 'rounded-full'],
    },
  },
})
