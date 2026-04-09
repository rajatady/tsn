import type { TSNAxis, TSNLengthResolvable } from '@tsn/core'

import type {
  LayoutAlign,
  LayoutConstraints,
  LayoutFrame,
  LayoutInsets,
  LayoutJustify,
  LayoutNode,
  LayoutRole,
  LayoutSize,
  LayoutSnapshotNode,
} from './types.js'

interface MeasuredNode {
  width: number
  height: number
}

interface AxisPosition {
  mainStart: number
  crossStart: number
}

const DEFAULT_ROLE: LayoutRole = 'node'
const DEFAULT_ALIGN: LayoutAlign = 'stretch'

export function resolveLayout(root: LayoutNode, viewport: LayoutSize): LayoutSnapshotNode {
  const frame: LayoutFrame = { x: 0, y: 0, width: viewport.width, height: viewport.height }
  return resolveNode(root, frame)
}

function resolveNode(node: LayoutNode, frame: LayoutFrame): LayoutSnapshotNode {
  const measured = measureNode(node, { width: frame.width, height: frame.height })
  const width = clampDimension(resolveWidth(node, frame.width, measured.width), node.constraints.minWidth, node.constraints.maxWidth)
  const height = clampDimension(resolveHeight(node, frame.height, measured.height), node.constraints.minHeight, node.constraints.maxHeight)
  const padding = readPadding(node.constraints)
  const innerWidth = Math.max(0, width - padding.left - padding.right)
  const innerHeight = Math.max(0, height - padding.top - padding.bottom)
  const role = node.role ?? DEFAULT_ROLE
  const base: LayoutSnapshotNode = {
    id: node.id,
    kind: node.kind,
    role,
    x: frame.x,
    y: frame.y,
    width,
    height,
    contentWidth: width,
    contentHeight: height,
    children: [],
  }

  if (node.children.length === 0) {
    return base
  }

  if (node.kind === 'overlay') {
    const children = node.children.map((child) =>
      resolveNode(child, {
        x: frame.x + padding.left,
        y: frame.y + padding.top,
        width: innerWidth,
        height: innerHeight,
      }),
    )
    return {
      ...base,
      contentWidth: width,
      contentHeight: height,
      children,
    }
  }

  const axis = resolveAxis(node)
  const children = resolveLinearChildren(node, {
    x: frame.x + padding.left,
    y: frame.y + padding.top,
    width: innerWidth,
    height: innerHeight,
    axis,
  })
  const contentWidth = Math.max(width, padding.left + padding.right + maxContentExtent(children, 'horizontal', frame.x))
  const contentHeight = Math.max(height, padding.top + padding.bottom + maxContentExtent(children, 'vertical', frame.y))
  return {
    ...base,
    contentWidth,
    contentHeight,
    children,
  }
}

function resolveLinearChildren(
  node: LayoutNode,
  frame: LayoutFrame & { axis: TSNAxis },
): LayoutSnapshotNode[] {
  const gap = node.constraints.gap ?? 0
  const alignItems = node.alignItems ?? DEFAULT_ALIGN
  const justifyContent = node.justifyContent ?? 'start'
  const availableMain = frame.axis === 'horizontal' ? frame.width : frame.height
  const availableCross = frame.axis === 'horizontal' ? frame.height : frame.width
  const baseSizes = node.children.map((child) => measureNode(child, measureAvailableSize(frame.axis, availableMain, availableCross)))
  const gaps = gap * Math.max(0, node.children.length - 1)
  const baseMain = sumMain(baseSizes, frame.axis) + gaps
  const growSum = node.children.reduce((sum, child) => sum + effectiveGrow(child), 0)
  const remaining = Math.max(0, availableMain - baseMain)
  const layoutMain = distributeMainSizes(node.children, baseSizes, frame.axis, remaining, growSum)
  const actualMain = layoutMain.reduce((sum, size) => sum + size, 0) + gaps
  const offset = justifyOffset(justifyContent, availableMain, actualMain)
  const spaceBetween = justifySpacing(justifyContent, availableMain, actualMain, gap, node.children.length)

  let cursor = offset
  return node.children.map((child, index) => {
    const childMain = layoutMain[index]
    const childCross = resolveCrossSize(child, baseSizes[index], availableCross, alignItems, frame.axis)
    const position = resolvePosition(frame, frame.axis, childMain, childCross, cursor, availableCross, child, alignItems)
    const childFrame: LayoutFrame =
      frame.axis === 'horizontal'
        ? {
            x: position.mainStart,
            y: position.crossStart,
            width: childMain,
            height: childCross,
          }
        : {
            x: position.crossStart,
            y: position.mainStart,
            width: childCross,
            height: childMain,
          }
    const resolved = resolveNode(child, childFrame)
    cursor += childMain + (index < node.children.length - 1 ? spaceBetween : 0)
    return resolved
  })
}

function measureNode(node: LayoutNode, available: LayoutSize): MeasuredNode {
  const padding = readPadding(node.constraints)
  const explicitWidth = resolveExplicitWidth(node.constraints, available.width)
  const explicitHeight = resolveExplicitHeight(node.constraints, available.height)
  const leafMeasured = measureLeaf(node, available)

  if (node.children.length === 0) {
    return clampSize(
      applyAspectRatio(
        {
          width: explicitWidth ?? leafMeasured.width,
          height: explicitHeight ?? leafMeasured.height,
        },
        node.constraints,
      ),
      node.constraints,
    )
  }

  if (node.kind === 'overlay') {
    const childAvailable = {
      width: Math.max(0, (explicitWidth ?? available.width) - padding.left - padding.right),
      height: Math.max(0, (explicitHeight ?? available.height) - padding.top - padding.bottom),
    }
    const children = node.children.map((child) => measureNode(child, childAvailable))
    const measured = {
      width: explicitWidth ?? Math.max(...children.map((child) => child.width), 0) + padding.left + padding.right,
      height: explicitHeight ?? Math.max(...children.map((child) => child.height), 0) + padding.top + padding.bottom,
    }
    return clampSize(applyAspectRatio(measured, node.constraints), node.constraints)
  }

  const axis = resolveAxis(node)
  const childAvailable = measureAvailableSize(
    axis,
    explicitWidth ?? available.width,
    explicitHeight ?? available.height,
  )
  const children = node.children.map((child) => measureNode(child, childAvailable))
  const gap = node.constraints.gap ?? 0
  const width =
    explicitWidth ??
    (axis === 'horizontal'
      ? sumMain(children, 'horizontal') + gap * Math.max(0, children.length - 1) + padding.left + padding.right
      : Math.max(...children.map((child) => child.width), 0) + padding.left + padding.right)
  const height =
    explicitHeight ??
    (axis === 'vertical'
      ? sumMain(children, 'vertical') + gap * Math.max(0, children.length - 1) + padding.top + padding.bottom
      : Math.max(...children.map((child) => child.height), 0) + padding.top + padding.bottom)

  return clampSize(applyAspectRatio({ width, height }, node.constraints), node.constraints)
}

function measureLeaf(node: LayoutNode, available: LayoutSize): MeasuredNode {
  if (node.role === 'spacer') {
    return { width: 0, height: 0 }
  }

  const constraints = node.constraints
  if (node.role === 'content-rail') {
    return clampSize(
      {
        width: Math.min(available.width, resolveLength(constraints.maxWidth, available.width) ?? available.width),
        height: resolveExplicitHeight(constraints, available.height) ?? node.intrinsicHeight ?? 0,
      },
      constraints,
    )
  }
  const explicitWidth = resolveExplicitWidth(constraints, available.width)
  const explicitHeight = resolveExplicitHeight(constraints, available.height)
  const intrinsicWidth = node.intrinsicWidth ?? 0
  const intrinsicHeight = node.intrinsicHeight ?? 0
  return clampSize(
    applyAspectRatio(
      {
        width: explicitWidth ?? intrinsicWidth,
        height: explicitHeight ?? intrinsicHeight,
      },
      constraints,
    ),
    constraints,
  )
}

function resolvePosition(
  frame: LayoutFrame & { axis: TSNAxis },
  axis: TSNAxis,
  childMain: number,
  childCross: number,
  cursor: number,
  availableCross: number,
  child: LayoutNode,
  parentAlign: LayoutAlign,
): AxisPosition {
  const align = child.constraints.alignSelf ?? parentAlign
  const crossOffset = resolveCrossOffset(align, availableCross, childCross)
  if (axis === 'horizontal') {
    return {
      mainStart: frame.x + cursor,
      crossStart: frame.y + crossOffset,
    }
  }
  return {
    mainStart: frame.y + cursor,
    crossStart: frame.x + crossOffset,
  }
}

function resolveCrossSize(
  child: LayoutNode,
  measured: MeasuredNode,
  availableCross: number,
  parentAlign: LayoutAlign,
  axis: TSNAxis,
): number {
  const align = child.constraints.alignSelf ?? parentAlign
  const explicit = axis === 'horizontal' ? child.constraints.height : child.constraints.width
  if (align === 'stretch' && explicit == null && child.role !== 'spacer') {
    return clampDimension(availableCross, axis === 'horizontal' ? child.constraints.minHeight : child.constraints.minWidth, axis === 'horizontal' ? child.constraints.maxHeight : child.constraints.maxWidth)
  }
  return axis === 'horizontal' ? measured.height : measured.width
}

function distributeMainSizes(
  children: LayoutNode[],
  sizes: MeasuredNode[],
  axis: TSNAxis,
  remaining: number,
  growSum: number,
): number[] {
  return children.map((child, index) => {
    const measured = axis === 'horizontal' ? sizes[index].width : sizes[index].height
    const grow = effectiveGrow(child)
    if (growSum === 0 || grow === 0) {
      return measured
    }
    return measured + remaining * (grow / growSum)
  })
}

function resolveAxis(node: LayoutNode): TSNAxis {
  if (node.kind === 'rail') {
    return 'horizontal'
  }
  return node.axis ?? 'vertical'
}

function sumMain(sizes: MeasuredNode[], axis: TSNAxis): number {
  return sizes.reduce((sum, child) => sum + (axis === 'horizontal' ? child.width : child.height), 0)
}

function resolveWidth(node: LayoutNode, availableWidth: number, measuredWidth: number): number {
  if (node.role === 'content-rail') {
    return clampDimension(
      Math.min(availableWidth, resolveLength(node.constraints.maxWidth, availableWidth) ?? availableWidth),
      node.constraints.minWidth,
      node.constraints.maxWidth,
      availableWidth,
    )
  }
  return resolveExplicitWidth(node.constraints, availableWidth) ?? (availableWidth > 0 ? availableWidth : measuredWidth)
}

function resolveHeight(node: LayoutNode, availableHeight: number, measuredHeight: number): number {
  return resolveExplicitHeight(node.constraints, availableHeight) ?? (availableHeight > 0 ? availableHeight : measuredHeight)
}

function resolveExplicitWidth(constraints: LayoutConstraints, fallback: number): number | undefined {
  const width = resolveLength(constraints.width, fallback)
  if (width != null) {
    return width
  }
  const maxWidth = resolveLength(constraints.maxWidth, fallback)
  if (maxWidth != null && fallback < maxWidth) {
    return fallback
  }
  return undefined
}

function resolveExplicitHeight(constraints: LayoutConstraints, fallback: number): number | undefined {
  const height = resolveLength(constraints.height, fallback)
  if (height != null) {
    return height
  }
  const maxHeight = resolveLength(constraints.maxHeight, fallback)
  if (maxHeight != null && fallback < maxHeight) {
    return fallback
  }
  return undefined
}

function measureAvailableSize(axis: TSNAxis, availableMain: number, availableCross: number): LayoutSize {
  return axis === 'horizontal'
    ? { width: availableMain, height: availableCross }
    : { width: availableCross, height: availableMain }
}

function readPadding(constraints: LayoutConstraints): LayoutInsets {
  return {
    top: constraints.paddingTop ?? 0,
    right: constraints.paddingRight ?? 0,
    bottom: constraints.paddingBottom ?? 0,
    left: constraints.paddingLeft ?? 0,
  }
}

function effectiveGrow(node: LayoutNode): number {
  if (node.constraints.grow != null) {
    return node.constraints.grow
  }
  return node.role === 'spacer' ? 1 : 0
}

function clampSize(size: LayoutSize, constraints: LayoutConstraints): LayoutSize {
  return {
    width: clampDimension(size.width, constraints.minWidth, constraints.maxWidth, size.width),
    height: clampDimension(size.height, constraints.minHeight, constraints.maxHeight, size.height),
  }
}

function clampDimension(
  value: number,
  min?: TSNLengthResolvable,
  max?: TSNLengthResolvable,
  fallback = value,
): number {
  let next = Number.isFinite(value) ? value : 0
  const resolvedMin = resolveLength(min, fallback)
  const resolvedMax = resolveLength(max, fallback)
  if (resolvedMin != null) {
    next = Math.max(next, resolvedMin)
  }
  if (resolvedMax != null) {
    next = Math.min(next, resolvedMax)
  }
  return next
}

function applyAspectRatio(size: LayoutSize, constraints: LayoutConstraints): LayoutSize {
  if (constraints.aspectRatio == null || constraints.aspectRatio <= 0) {
    return size
  }
  if (constraints.width != null && constraints.height == null) {
    return { width: size.width, height: size.width / constraints.aspectRatio }
  }
  if (constraints.height != null && constraints.width == null) {
    return { width: size.height * constraints.aspectRatio, height: size.height }
  }
  return size
}

function resolveLength(value: TSNLengthResolvable | undefined, fallback: number): number | undefined {
  if (value == null) return undefined
  if (typeof value === 'number') return value
  if (value.unit === 'point') return value.value
  return fallback * (value.value / 100)
}

function resolveCrossOffset(align: LayoutAlign, availableCross: number, childCross: number): number {
  if (align === 'center') {
    return Math.max(0, (availableCross - childCross) / 2)
  }
  if (align === 'end') {
    return Math.max(0, availableCross - childCross)
  }
  return 0
}

function justifyOffset(justify: LayoutJustify, availableMain: number, actualMain: number): number {
  if (justify === 'center') {
    return Math.max(0, (availableMain - actualMain) / 2)
  }
  if (justify === 'end') {
    return Math.max(0, availableMain - actualMain)
  }
  return 0
}

function justifySpacing(
  justify: LayoutJustify,
  availableMain: number,
  actualMain: number,
  gap: number,
  children: number,
): number {
  if (justify === 'space-between' && children > 1 && availableMain > actualMain) {
    return gap + (availableMain - actualMain) / (children - 1)
  }
  return gap
}

function maxContentExtent(
  children: LayoutSnapshotNode[],
  axis: TSNAxis,
  origin: number,
): number {
  return children.reduce((max, child) => {
    const extent = axis === 'horizontal' ? child.x + child.width - origin : child.y + child.height - origin
    return Math.max(max, extent)
  }, 0)
}
