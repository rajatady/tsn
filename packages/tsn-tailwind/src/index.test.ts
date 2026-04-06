import assert from 'node:assert/strict'
import test from 'node:test'

import { parseTailwind } from './index.js'

/* ─── Flex ─────────────────────────────────────────────────────────── */

test('flex-1 emits ui_set_flex', () => {
  const r = parseTailwind('flex-1', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_flex(h, 1)')))
})

/* ─── Gap ──────────────────────────────────────────────────────────── */

test('gap-3 emits ui_set_spacing with 12px', () => {
  const r = parseTailwind('gap-3', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_spacing(h, 12)')))
})

/* ─── Padding ──────────────────────────────────────────────────────── */

test('p-4 emits ui_set_padding with 16px on all sides', () => {
  const r = parseTailwind('p-4', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_padding(h, 16, 16, 16, 16)')))
})

test('px-2 py-3 emits correct padding', () => {
  const r = parseTailwind('px-2 py-3', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_padding(h, 12, 8, 12, 8)')))
})

/* ─── Size ─────────────────────────────────────────────────────────── */

test('w-[200] h-[100] emits ui_set_size', () => {
  const r = parseTailwind('w-[200] h-[100]', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_size(h, 200, 100)')))
})

test('h-16 emits height 64px', () => {
  const r = parseTailwind('h-16', 'h')
  assert.equal(r.height, 64)
})

/* ─── Container alignment ─────────────────────────────────────────── */

test('items-center emits ui_set_align_items', () => {
  const r = parseTailwind('items-center', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_align_items(h, 1)')))
})

test('items-start emits ui_set_align_items 0', () => {
  const r = parseTailwind('items-start', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_align_items(h, 0)')))
})

test('items-end emits ui_set_align_items 2', () => {
  const r = parseTailwind('items-end', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_align_items(h, 2)')))
})

test('items-stretch emits ui_set_align_items 3', () => {
  const r = parseTailwind('items-stretch', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_align_items(h, 3)')))
})

test('justify-between emits ui_set_justify_content 3', () => {
  const r = parseTailwind('justify-between', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_justify_content(h, 3)')))
})

test('justify-center emits ui_set_justify_content 1', () => {
  const r = parseTailwind('justify-center', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_justify_content(h, 1)')))
})

test('justify-end emits ui_set_justify_content 2', () => {
  const r = parseTailwind('justify-end', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_justify_content(h, 2)')))
})

test('justify-start emits ui_set_justify_content 0', () => {
  const r = parseTailwind('justify-start', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_justify_content(h, 0)')))
})

/* ─── Self alignment ───────────────────────────────────────────────── */

test('mx-auto emits ui_set_alignment 1', () => {
  const r = parseTailwind('mx-auto', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_alignment(h, 1)')))
})

test('self-center emits ui_set_alignment 1', () => {
  const r = parseTailwind('self-center', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_alignment(h, 1)')))
})

test('self-end emits ui_set_alignment 2', () => {
  const r = parseTailwind('self-end', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_alignment(h, 2)')))
})

/* ─── Background ───────────────────────────────────────────────────── */

test('bg-zinc-900 emits ui_set_background_rgb', () => {
  const r = parseTailwind('bg-zinc-900', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_background_rgb')))
})

test('bg-black emits ui_set_background_rgb', () => {
  const r = parseTailwind('bg-black', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_background_rgb(h, 0, 0, 0, 1)')))
})

test('bg-[#2F2823] emits ui_set_background_rgb with hex values', () => {
  const r = parseTailwind('bg-[#2F2823]', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_background_rgb(h, 0.184')))
})

test('bg-white/5 emits white at 5% alpha', () => {
  const r = parseTailwind('bg-white/5', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_background_rgb(h, 1, 1, 1, 0.05)')))
})

test('bg-zinc-800/50 emits zinc-800 at 50% alpha', () => {
  const r = parseTailwind('bg-zinc-800/50', 'h')
  assert.ok(r.calls.some(c => c.includes('0.5)')))
})

test('bg-stone-800 emits warm gray', () => {
  const r = parseTailwind('bg-stone-800', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_background_rgb')))
})

test('text-[#4b8ef7] emits arbitrary text color', () => {
  const r = parseTailwind('text-[#4b8ef7]', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_text_set_color_rgb')))
})

test('text-white/80 emits white at 80% alpha', () => {
  const r = parseTailwind('text-white/80', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_text_set_color_rgb(h, 1, 1, 1, 0.8)')))
})

test('text-white/10 emits white at 10% alpha', () => {
  const r = parseTailwind('text-white/10', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_text_set_color_rgb(h, 1, 1, 1, 0.1)')))
})

/* ─── Text ─────────────────────────────────────────────────────────── */

test('text-sm sets textSize to 14', () => {
  const r = parseTailwind('text-sm', 'h')
  assert.equal(r.textSize, 14)
})

test('text-4xl sets textSize to 36', () => {
  const r = parseTailwind('text-4xl', 'h')
  assert.equal(r.textSize, 36)
})

test('font-bold sets textBold and textWeight 7', () => {
  const r = parseTailwind('font-bold', 'h')
  assert.equal(r.textBold, true)
  assert.equal(r.textWeight, 7)
})

test('font-semibold sets textWeight 6', () => {
  const r = parseTailwind('font-semibold', 'h')
  assert.equal(r.textWeight, 6)
})

test('font-medium sets textWeight 4', () => {
  const r = parseTailwind('font-medium', 'h')
  assert.equal(r.textWeight, 4)
})

test('leading-tight sets textLineHeight 1.25', () => {
  const r = parseTailwind('leading-tight', 'h')
  assert.equal(r.textLineHeight, 1.25)
})

test('leading-none sets textLineHeight 1.0', () => {
  const r = parseTailwind('leading-none', 'h')
  assert.equal(r.textLineHeight, 1.0)
})

test('tracking-tight sets textTracking -0.025 (em)', () => {
  const r = parseTailwind('tracking-tight', 'h')
  assert.equal(r.textTracking, -0.025)
})

test('tracking-[-0.04em] sets textTracking -0.04', () => {
  const r = parseTailwind('tracking-[-0.04em]', 'h')
  assert.equal(r.textTracking, -0.04)
})

test('uppercase sets textTransform 1', () => {
  const r = parseTailwind('uppercase', 'h')
  assert.equal(r.textTransform, 1)
})

test('text-center sets textAlign 1', () => {
  const r = parseTailwind('text-center', 'h')
  assert.equal(r.textAlign, 1)
})

/* ─── Rounded ──────────────────────────────────────────────────────── */

test('rounded-xl emits ui_set_corner_radius 16', () => {
  const r = parseTailwind('rounded-xl', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_corner_radius(h, 16)')))
})

test('rounded-full emits ui_set_corner_radius 9999', () => {
  const r = parseTailwind('rounded-full', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_corner_radius(h, 9999)')))
})

/* ─── Scroll ───────────────────────────────────────────────────────── */

test('overflow-x-auto emits ui_scroll_set_axis 1', () => {
  const r = parseTailwind('overflow-x-auto', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_scroll_set_axis(h, 1)')))
})

test('overflow-y-auto emits ui_scroll_set_axis 0', () => {
  const r = parseTailwind('overflow-y-auto', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_scroll_set_axis(h, 0)')))
})

/* ─── Shadow ───────────────────────────────────────────────────────── */

test('shadow-md emits ui_set_shadow', () => {
  const r = parseTailwind('shadow-md', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_shadow(h, 0, 4, 6, 0.1)')))
})

test('shadow-lg emits ui_set_shadow', () => {
  const r = parseTailwind('shadow-lg', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_shadow(h, 0, 10, 15, 0.1)')))
})

test('shadow-none emits zero shadow', () => {
  const r = parseTailwind('shadow-none', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_shadow(h, 0, 0, 0, 0)')))
})

/* ─── Image scaling ────────────────────────────────────────────────── */

test('object-cover emits ui_image_set_scaling 1', () => {
  const r = parseTailwind('object-cover', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_image_set_scaling(h, 1)')))
})

test('object-contain emits ui_image_set_scaling 0', () => {
  const r = parseTailwind('object-contain', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_image_set_scaling(h, 0)')))
})

test('object-fill emits ui_image_set_scaling 2', () => {
  const r = parseTailwind('object-fill', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_image_set_scaling(h, 2)')))
})

/* ─── Combined ─────────────────────────────────────────────────────── */

test('complex className produces multiple calls', () => {
  const r = parseTailwind('flex-1 gap-3 items-center bg-zinc-900 p-2 rounded-xl', 'h')
  assert.ok(r.calls.some(c => c.includes('ui_set_flex')))
  assert.ok(r.calls.some(c => c.includes('ui_set_spacing')))
  assert.ok(r.calls.some(c => c.includes('ui_set_align_items')))
  assert.ok(r.calls.some(c => c.includes('ui_set_background_rgb')))
  assert.ok(r.calls.some(c => c.includes('ui_set_padding')))
  assert.ok(r.calls.some(c => c.includes('ui_set_corner_radius')))
})
