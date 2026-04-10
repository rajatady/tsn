import type { TSNNode, TSNTextMeasureRequest, TSNTextMeasureResult } from '@tsn/core'

export function buildTextMeasureRequest(node: TSNNode, maxWidth?: number): TSNTextMeasureRequest | null {
  const behavior = node.behavior.text
  if (!behavior) return null

  const text = resolveMeasureText(node)
  const size = node.textStyle.size ?? defaultFontSizeForNode(node)
  const weight = node.textStyle.weight ?? defaultFontWeightForNode(node)

  return {
    text,
    size,
    weight,
    lineHeight: node.textStyle.lineHeight,
    tracking: node.textStyle.tracking,
    role: behavior.role,
    wrap: behavior.wrap,
    multiline: behavior.multiline,
    maxWidth,
  }
}

export function measureTextRequest(request: TSNTextMeasureRequest): TSNTextMeasureResult {
  const text = request.text
  const fontSize = request.size > 0 ? request.size : 14
  const tracking = request.tracking ?? 0
  const lineHeight = resolveLineHeight(request)
  const baseline = Math.round(lineHeight * 0.8 * 1000) / 1000

  if (text.length === 0) {
    return {
      width: 0,
      height: lineHeight,
      baseline,
    }
  }

  const charWidth = estimateCharWidth(fontSize, request.role)
  const rawWidth = Math.max(0, text.length * charWidth + Math.max(0, text.length - 1) * (tracking * fontSize))
  const maxWidth = request.maxWidth ?? 0

  if (!request.multiline || request.wrap === 'truncate' || request.wrap === 'clip') {
    return {
      width: maxWidth > 0 ? Math.min(rawWidth, maxWidth) : rawWidth,
      height: lineHeight,
      baseline,
    }
  }

  if (maxWidth <= 0 || rawWidth <= maxWidth) {
    return {
      width: rawWidth,
      height: lineHeight,
      baseline,
    }
  }

  const lines = Math.max(1, Math.ceil(rawWidth / maxWidth))
  return {
    width: maxWidth,
    height: lineHeight * lines,
    baseline,
  }
}

export function defaultCssLineHeightForSize(fontSize: number): number {
  if (fontSize <= 12) return 16
  if (fontSize <= 14) return 20
  if (fontSize <= 16) return 24
  if (fontSize <= 20) return 28
  if (fontSize <= 24) return 32
  if (fontSize <= 30) return 36
  if (fontSize <= 36) return 40
  return fontSize * 1.2
}

function resolveMeasureText(node: TSNNode): string {
  if (typeof node.props.value === 'string') return node.props.value
  if (typeof node.props.text === 'string') return node.props.text
  if (typeof node.props.label === 'string') return node.props.label
  if (typeof node.props.placeholder === 'string') return node.props.placeholder
  return ''
}

function resolveLineHeight(request: TSNTextMeasureRequest): number {
  if (request.lineHeight != null) return request.size * request.lineHeight
  return defaultCssLineHeightForSize(request.size)
}

function estimateCharWidth(fontSize: number, role: TSNTextMeasureRequest['role']): number {
  if (role === 'code') return fontSize * 0.62
  if (role === 'label') return fontSize * 0.54
  return fontSize * 0.56
}

function defaultFontSizeForNode(node: TSNNode): number {
  if (node.sourceTag === 'Badge') return 11
  if (node.sourceTag === 'Symbol') return 14
  return 14
}

function defaultFontWeightForNode(node: TSNNode): number {
  if (node.sourceTag === 'Badge') return 6
  return 4
}
