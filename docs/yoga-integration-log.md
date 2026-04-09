---
name: Yoga Integration Session Log
description: Complete record of the Yoga layout engine integration attempt — what we did, what broke, what commands we used, and recurring issues
type: project
---

This file is a historical session log, not the current source-of-truth architecture doc. It intentionally preserves older references from that session, including mentions of the removed `examples/native-gui/ui-gallery.tsx` path.

## Pre-Yoga: What Led Here

### App Store Visual Quality Gap
User compared the native app-store to an HTML reference and said "both look nothing alike. The layout, the positioning, the overall fit and finish look absolutely different." Key gaps identified:
- No justify-content (space-between without Spacer hacks)
- No align-items on parents
- No overflow clipping (images overflow rounded corners)
- No object-fit (cover vs contain vs fill)
- Colors hardcoded to zinc palette + 10 system colors
- No shadows, no borders, no alpha colors (bg-white/5)
- No CSS Grid, no snap scrolling

### Detail Page, Sidebar Routing, Scroll Forwarding Fixes
- Rebuilt detail.tsx to match real App Store (hero with gradient, metric strip, screenshots, ratings, reviews)
- Fixed sidebar routing: Create→"create", Work→"work", Categories→"categories" (were all "discover")
- Added UIScrollViewForwarding subclass: horizontal carousels captured vertical scroll events, fixed by checking fabs(deltaY) > fabs(deltaX) and forwarding to parent

### Landing Page Attempts (Incident Tracker)
- User asked to replace incident tracker with apple.com/macos-style landing page
- First attempt: cramped app-store-style carousels → "EW. EW. EW."
- Second attempt: plain centered text on black → "Are we writing html in 1995?"
- Third attempt: ZStack+Gradient sections, better but layout issues persisted

### Deep Architectural Analysis
User said: "Nah. Its not working. We need to take a step back and reasses... Let's get concrete data on a single example..."

Traced the full pipeline: TSX → Tailwind parser (compile-time, emits C setter calls) → JSX emitter (emits ui_*() C calls) → clang → binary linked with ui.m → runtime UIStackContainer.layout does layout

Discovered:
- **Two layout engines existed**: tsn-layout (TypeScript, testing only) and layout.inc (Objective-C, runtime). Created 24 minutes apart, immediately diverged. Neither was proper flexbox.
- User: "I thought we were using the tsn-layout till now. what? Why?"

### React Native Architecture Comparison
User asked: "how does a system like React Native work forget the JavaScript bridge..."

Answer: RN uses Yoga (pure math) to compute frames, then just sets view.frame. No native views do layout. There's a Fiber reconciler → Shadow Tree → Yoga → Native Views pipeline.

TSN was the opposite — NSViews did their own layout. No reconciler. No shadow tree. _ts_rerender() rebuilds the entire view tree via ui_replace_root().

User: "So without a reconciler, we are living in borrowed time, aren't we?" — Yes.

### Yoga vs Taffy Decision
- User asked about Taffy (Rust layout library with grid support)
- Taffy requires Rust toolchain, Yoga is C++ and integrates directly with clang
- Chose Yoga: MIT license, 78 files, compiles to 244KB static lib
- User: "do not give me a plan. A plan is almost always very, very bad."

## Starting State (Pre-Yoga Integration)

- TSN compiler working, 4 example apps compiling and running (dashboard, app-store, incident-tracker, ui-gallery)
- 25/25 conformance tests passing
- Hand-rolled layout engine in layout.inc (~500 lines of flexbox approximation)
- Two disconnected layout engines: tsn-layout (TypeScript, testing only) and layout.inc (Objective-C, runtime)

## What The User Asked For

Fix fundamental layout issues. The app-store looked nothing like its HTML reference. The hand-rolled layout kept breaking. User asked to trace why layout breaks rather than trial-and-error fixing. User explicitly said: "No more trial and errors. Trace why it's happening. Don't fix it."

## Architecture Discussion

- Compared to React Native: RN uses Yoga (pure math) → computes frames → sets view.frame. No native views do layout.
- TSN was the opposite — NSViews did their own layout via UIStackContainer.layout
- Identified two fundamental gaps: layout solver and reconciler
- Chose Yoga over Taffy (C++ vs Rust, integrates with our clang toolchain)
- Agreed: Yoga is the single source of truth. UIStackContainer stripped to direction/ygNode/children only.

## What We Did (chronological)

### 1. Vendored Yoga
- 78 files from facebook/yoga into vendor/yoga/
- Compiled to build/libyoga.a (244KB)
- Updated build.ts and dev.ts: link libyoga.a, -I vendor, -lc++
- Commit: 528fcf2

### 2. Rewrote layout.inc
- Deleted all ObjC layout properties (padding, spacing, flex, alignment, etc.)
- UIStackContainer stripped to: direction, ygNode, children
- Added yoga_measure_func (text measurement callback)
- Added yoga_apply_layout (walks tree, sets view.frame from Yoga results)
- All ui_set_* functions write to YGNode
- ui_add_child builds Yoga tree

### 3. Fixed root-only recalculation
- Bug: child UIStackContainers re-ran YGNodeCalculateLayout in their layout method, resetting position to (0,0)
- Fix: only root containers (no Yoga parent) trigger calculation
- Conformance: 19→20 (align-center fixed)
- Commit: f016a53

### 4. Fixed sidebar leaf node sync
- Bug: shell.inc added views to children array without creating Yoga leaf nodes
- Fix: create leaf YGNodes for sidebar section headers and buttons
- Commit: f016a53 (same commit)

### 5. Unified YGNode access
- Added objc_setAssociatedObject to store YGNode on every NSView
- yoga_node_for_view() helper — works for both containers and leaves
- All ui_set_* functions use it, no more isKindOfClass checks
- Commit: 7dca0c9

### 6. Fixed badge stretching
- Badge UIStackContainer stretched to fill parent width
- Fix: set alignSelf:flexStart on badge's ygNode
- Commit: 0cc7053

### 7. Removed Card default padding
- ui_card() hardcoded padding:12, conflicted with explicit small heights
- Fix: removed hardcoded padding, let Tailwind classes set it
- card-deep and progress-deep now pass
- Commit: 99e64bd

### 8. Added ui_set_margin_auto for mx-auto
- mx-auto was using alignSelf:center (removed stretch)
- Fix: use YGNodeStyleSetMarginAuto + width:100%
- max-width now passes
- Commit: daba110

### 9. Added conformance harness filtering
- npx tsx conformance/harness.ts case-id1 case-id2
- 7s instead of 35s for targeted runs
- Commit: 5d899d2

### 10. Fixed ScrollView losing width
- ScrollView YGNodes didn't read view.frame for pre-set dimensions
- Fix: read fw/fh from frame at insertion time
- Commit: 3430499

### 11. Removed ui-gallery example app
- Caused confusion with conformance gallery (different binary)
- Commit: e1185ff

### 12. Added 10 new conformance cases
- flex-basis, justify-end, items-end, empty-spacer, zstack-overlay, horizontal-scroll, multi-col-grid, metric-strip, editorial-card, card-no-padding
- 25/35 (8 new failures exposing real layout gaps)
- Commit: 67303ea

### 13. Fixed flex-1 to use YGNodeStyleSetFlex
- CSS flex-1 = flex:1 1 0% but we only set flexGrow:1
- Yoga has SetFlex() which internally derives flexBasis:0
- flex-basis, stat-row, multi-col-grid now pass
- Commit: ba92502

### 14. Removed default flex-grow from ScrollViews
- ui_add_child was injecting flex-grow:1 on every scroll view
- Removed it — let user's classes control via flex-1
- THIS BROKE THE APP-STORE: main content scroll has flex-1 but ui_set_flex is called BEFORE ui_add_child, so the YGNode doesn't exist yet and flex is lost
- Commit: 981850d

## Recurring Issues

### The Ordering Problem
The compiler emits ui_set_* calls BEFORE ui_add_child. For UIStackContainers, the YGNode exists from init — no problem. For everything else (ScrollView, NSTextField, NSImageView, NSButton), the YGNode is created inside ui_add_child — too late. Properties set before insertion are lost.

We hacked around this for ui_set_size with a view.frame fallback. Same problem exists for flex, padding, alignment, and every other property.

### Multiple Sources of Truth
Despite the goal of "Yoga is the single source of truth", we ended up with:
- YGNode on UIStackContainer.ygNode (containers)
- YGNode via objc_setAssociatedObject (leaves, created at insertion)
- view.frame as intermediary for leaf view sizes (set before insertion, read at insertion)
- Hardcoded defaults in factory functions (ui_card padding, scroll flex-grow)

### Trial and Error vs Understanding
User repeatedly corrected this approach:
- "You are doing trial and error again. You are not understanding the issue."
- "No more trial and errors. Trace why it's happening."
- "Do not fix anything. Do not change anything. Look at data."
- "No reward hacking, please."

### Conformance Tests Not Testing Real Patterns
23/25 conformance while app-store looks broken. Tests only covered isolated primitives. Added 10 app-store pattern tests — exposed 8 real failures.

## Commands Used

```bash
# Build
./tsn build examples/native-gui/app-store.tsx
./tsn build conformance/gallery.tsx

# Run apps
./build/app-store &
./build/gallery &

# Screenshot
./tsn inspect --app app-store screenshot
./tsn inspect --app gallery screenshot
# Saves to /tmp/tsn-screenshot.png

# Inspector queries
echo "tree" | nc -U /tmp/tsn-inspect-gallery.sock
echo "get root wframe" | nc -U /tmp/tsn-inspect-gallery.sock
echo "clickid align-center" | nc -U /tmp/tsn-inspect-gallery.sock

# Conformance
bash harness/ui-conformance.sh                    # full suite (~35s)
npx tsx conformance/harness.ts stat-row badge-deep # specific cases (~7s)
bash harness/correctness.sh                        # 9 CLI tests

# Kill running apps
pkill -f './build/gallery'
pkill -f './build/app-store'
```

## Current State (end of session)

- Branch: feature/layout-engine-integration
- Correctness: 9/9
- Conformance: 28/35 (but app-store main content is invisible)
- The app-store is broken because scroll views lost flex-grow and the ordering problem prevents flex-1 from being applied
- The fundamental ordering problem (ui_set_* before ui_add_child) is unsolved for non-container views
- Text measurement uses hardcoded fontSize*1.5 instead of platform text metrics

## Key User Messages (verbatim)

- "How do we solve the fundamental gaps in layout? This is similar to how facebook might have built yoga/rn internal mappings from scratch."
- "EW. EW. EW. EW. Yak, yak, yak." (about first landing page attempt)
- "Are we writing html in 1995?" (about second landing page attempt)
- "Nah. Its not working. We need to take a step back and reasses..."
- "I thought we were using the tsn-layout till now. what? Why?"
- "and how does a system like React Native work forget the JavaScript bridge..."
- "So without a reconciler, we are living in borrowed time, aren't we?"
- "do not give me a plan. A plan is almost always very, very bad."
- "You are doing trial and error again. You are not understanding the issue, are you? No more trial and errors."
- "yes. Let's fix." (to clean up dual state)
- "remove that nan guard. Do you remember why we are adding Yoga, how we are adding Yoga, what needs to change after adding Yoga, and what changes we made after Yoga?"
- "Dude, don't confuse me right now. Your compaction was already a massive dent in the work that I was doing."
- "Take a step back. What was the architecture before? What is the architecture now, and what is the architecture that should be?"
- "no, wait, do you remember the original architecture that we discussed before adding Yoga? What the issue with the layout is, because I think now we are again sprawling, adding five sources of truth."
- "before making any changes, commit everything that is there in your status first. everything. and then don't go into a sprawl; fix one thing at a time without breaking anything else."
- "Why are you running UI gallery? You should be running the conformance tests."
- "Are you fucking blind? What is the width of the sidebar that you have set versus what it is showing at?"
- "if you have to hand roll all of this, then what is yoga for?"
- "What does layout.inc do?" → Answer: defines UIStackContainer, bridges C API to Yoga, applies Yoga results to AppKit. Zero layout computation.
- "How is it that the text measurement issue was not happening earlier, but it's happening now?" → Answer: existing tests had padding buffers and checked containers not text directly.
- "No reward hacking, please."
- "This is going very very very poorly. Almost disastrous."

## The Crash (before fixes)

When Yoga was first integrated, ui-gallery crashed with:
```
Exception Type:    EXC_BREAKPOINT (SIGTRAP)
Application Specific Information: Invalid view geometry: width is NaN

Thread 0 Crashed:
0   AppKit    _NSViewValidateGeometry + 868
2   AppKit    -[NSView setFrame:] + 40
3   ui-gallery yoga_apply_layout + 308
4   ui-gallery yoga_apply_layout + 556
5   ui-gallery yoga_apply_layout + 144
6   ui-gallery -[UIStackContainer layout] + 108
```

Root cause: shell.inc added views to UIStackContainer children array without creating corresponding Yoga leaf nodes. yoga_apply_layout iterated children array, called YGNodeGetChild(node, i) which returned NULL or wrong node, producing NaN from YGNodeLayoutGetWidth.

Note: This crash was in ui-gallery (examples app), NOT in conformance/gallery (the test binary). The conformance harness runs a different binary. This confusion wasted 30 minutes.

## How Yoga Actually Works (discovered during session)

### YGNodeStyleSetFlex vs YGNodeStyleSetFlexGrow
- `YGNodeStyleSetFlexGrow(node, 1)` — only sets grow, leaves basis as auto
- `YGNodeStyleSetFlex(node, 1)` — sets the unified flex property; Yoga internally derives:
  - `resolveFlexGrow()` returns 1
  - `processFlexBasis()` returns `points(0)` (non-web-defaults) — this is CSS flex:1 1 0%
- Source: vendor/yoga/node/Node.cpp lines 329-338, 426-435

### YGNodeStyleSetMarginAuto
- Yoga supports `YGNodeStyleSetMarginAuto(node, YGEdgeLeft/Right)` — exactly CSS `margin: 0 auto`
- We were incorrectly using `alignSelf: center` for mx-auto which removes stretch

### Text Measurement
- React Native uses CoreText (platform text engine) for measurement
- We use hardcoded `fontSize * 1.5` as line height — produces 21px for 14px text, browser gives 17px
- Should use NSTextField's intrinsicContentSize or cellSizeForBounds instead

## Root Cause (unsolved)

Every non-UIStackContainer view gets its YGNode created inside ui_add_child. But the compiler emits ui_set_* calls before ui_add_child. Properties are lost. This is the single architectural gap that causes cascading failures.

We hacked around it for ui_set_size with a view.frame fallback. But flex, padding, alignment all have the same problem. Removing the default flex-grow:1 hack from scroll views exposed this immediately — the app-store content scroll has flex-1 in its className but ui_set_flex can't find the YGNode because it doesn't exist yet.

The clean fix is to create the YGNode at view creation time (in ui_text, ui_scroll, ui_progress, ui_image, etc.), not at insertion time in ui_add_child. This has not been attempted yet because each "quick fix" has cascaded into more breakage.

## Files Modified During This Session

### Core layout
- `packages/tsn-host-appkit/src/runtime/layout.inc` — complete rewrite for Yoga
- `packages/tsn-host-appkit/src/runtime/shell.inc` — sidebar leaf YGNodes
- `packages/tsn-host-appkit/src/runtime/windowing.inc` — root flex-grow via Yoga
- `packages/tsn-host-appkit/src/runtime/inspector.inc` — read from YGNode
- `packages/tsn-host-appkit/src/ui.m` — badge/card Yoga integration
- `packages/tsn-host-appkit/src/ui.h` — added ui_set_margin_auto

### Build system
- `packages/tsn-compiler-core/src/build.ts` — link libyoga.a, -I vendor, -lc++
- `compiler/dev.ts` — same build changes

### Tailwind
- `packages/tsn-tailwind/src/index.ts` — mx-auto emits ui_set_margin_auto

### Conformance
- `conformance/harness.ts` — case filtering via CLI args
- `conformance/registry.ts` — 10 new cases
- `conformance/gallery/app.tsx` — wired up 10 new cases
- `conformance/cases/*.tsx` and `*.html` — 10 new test case pairs

### Deleted
- `examples/native-gui/ui-gallery.tsx` — caused confusion with conformance gallery
