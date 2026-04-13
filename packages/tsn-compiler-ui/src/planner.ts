import type {
  TSNBehavior,
  TSNLayoutStyle,
  TSNLengthResolvable,
  TSNNode,
  TSNPropValue,
  TSNTextBehavior,
  TSNTextStyle,
  TSNVisualStyle,
} from '@tsn/core'
import { getElementSpec, type TSNElementSpec } from '@tsn/ui'

import type { TailwindResult } from '../../tsn-tailwind/src/types.js'

export interface ResolvedTextPresentation {
  size: number
  bold: boolean
}

export interface PrimitivePlan {
  tag: string
  primitive: TSNElementSpec | null
  node: TSNNode
  layoutStyle: Partial<TSNLayoutStyle>
  visualStyle: Partial<TSNVisualStyle>
  textStyle: Partial<TSNTextStyle>
  behavior: Partial<TSNBehavior>
  tailwind: TailwindResult | null
  runtimeCalls: string[]
  textPresentation: ResolvedTextPresentation | null
  pointWidth: number | null
  pointHeight: number | null
}

export function buildPrimitivePlan(
  tag: string,
  handle: string,
  className: string,
  staticProps: Record<string, TSNPropValue>,
  tailwind: TailwindResult | null,
): PrimitivePlan {
  const primitive = getElementSpec(tag)
  const layoutStyle = tailwind?.stylePatch.layoutStyle ?? {}
  const textStyle = tailwind?.stylePatch.textStyle ?? {}
  const behavior: Partial<TSNBehavior> = {
    ...(tailwind?.stylePatch.behavior ?? {}),
    text: resolveTextBehavior(tag, staticProps, textStyle),
  }
  return {
    tag,
    primitive,
    node: {
      ref: {
        id: handle,
        kind: primitive?.kind ?? 'custom',
      },
      sourceTag: tag,
      props: staticProps,
      styleSource: {
        className: className || undefined,
        variant: typeof staticProps.variant === 'string' ? staticProps.variant : undefined,
      },
      layoutStyle,
      visualStyle: tailwind?.stylePatch.visualStyle ?? {},
      textStyle,
      behavior,
      responsiveVariants: tailwind?.responsiveVariants.map(variant => ({
        selector: variant.selector,
        layoutStyle: variant.stylePatch.layoutStyle,
        visualStyle: variant.stylePatch.visualStyle,
        textStyle: variant.stylePatch.textStyle,
        behavior: variant.stylePatch.behavior,
      })) ?? [],
      events: [],
      children: [],
    },
    layoutStyle,
    visualStyle: tailwind?.stylePatch.visualStyle ?? {},
    textStyle,
    behavior,
    tailwind,
    runtimeCalls: tailwind?.calls ?? [],
    textPresentation: resolveTextPresentation(textStyle, tailwind),
    pointWidth: pointLength(layoutStyle.width),
    pointHeight: pointLength(layoutStyle.height),
  }
}

function resolveTextBehavior(
  tag: string,
  staticProps: Record<string, TSNPropValue>,
  textStyle: Partial<TSNTextStyle>,
): TSNTextBehavior | undefined {
  if (tag === 'Text' || tag === 'Symbol' || tag === 'Badge') {
    return {
      kind: 'static',
      role: staticProps.mono === true ? 'code' : 'body',
      wrap: textStyle.truncate ? 'truncate' : 'wrap',
      multiline: !textStyle.truncate,
      editable: false,
      selectable: staticProps.selectable === true,
    }
  }

  if (tag === 'Search') {
    return {
      kind: 'search',
      role: 'body',
      wrap: 'truncate',
      multiline: false,
      editable: true,
      selectable: true,
    }
  }

  if (tag === 'Input') {
    return {
      kind: 'input',
      role: 'body',
      wrap: 'truncate',
      multiline: false,
      editable: true,
      selectable: true,
    }
  }

  if (tag === 'TextArea') {
    return {
      kind: 'textarea',
      role: 'body',
      wrap: 'wrap',
      multiline: true,
      editable: true,
      selectable: true,
    }
  }

  return undefined
}

function pointLength(value: TSNLengthResolvable | undefined): number | null {
  if (value == null) return null
  if (typeof value === 'number') return value
  return value.unit === 'point' ? value.value : null
}

function resolveTextPresentation(
  textStyle: Partial<TSNTextStyle>,
  tailwind: TailwindResult | null,
): ResolvedTextPresentation | null {
  if (!tailwind && textStyle.size == null && textStyle.weight == null) return null
  return {
    size: textStyle.size ?? 14,
    bold: (textStyle.weight ?? -1) >= 7 || tailwind?.textBold || false,
  }
}
