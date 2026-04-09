# StrictTS UI Targeted Nuke Plan

Last updated: 2026-04-08
Safe point commit: `de38b9c` (`Stabilize layout runtime and app store conformance`)
Branch: `feature/layout-engine-integration`

This document is meant to be a complete handoff for any future human or AI agent. It explains:

- what StrictTS UI is today
- what we changed recently
- what worked
- what failed
- why we keep getting stuck
- what the real architectural problem is
- what we are explicitly choosing to do next
- what we are explicitly choosing not to do next

This is not a vague “ideas” note. It is the intended working plan for the next architecture reset.

## 1. Executive Summary

StrictTS UI currently has a partially successful Yoga integration, but the architecture is still too coupled across the compiler, Tailwind mapping, and host runtime.

We now have:

- a real shadow/layout layer in the AppKit host
- a more structured Tailwind parser that produces `ops`
- better geometry conformance than before

But we still do not have:

- a canonical internal UI model that everything actually compiles into
- a stable primitive contract layer
- a text system that is strong enough for polished UI
- a clean separation between compile-time representation and runtime host behavior

The main problem is no longer “Yoga does not work.” The main problem is that the compiler still emits direct host/runtime calls, Tailwind still lowers too directly to runtime APIs, and the shadow tree is still centered around host views instead of a host-independent node model.

One important correction after reading the whole codebase:

We do already have the beginnings of the middle layer in:

- `packages/tsn-core`
- `packages/tsn-layout`
- `packages/tsn-style`
- `packages/tsn-ui`

So the plan is not “invent a brand new middle layer package.”
The plan is “make the existing middle layer become the real system boundary.”

The plan is a targeted nuke:

- keep the current progress where it is useful
- do not throw away Yoga or the idea of a shadow tree
- do not keep the current compiler-to-host coupling
- strengthen the existing middle layer into the canonical UI node/style model
- make both JSX props and Tailwind resolve into that model
- make the runtime consume that model

The goal is not “make App Store prettier.” The goal is “make adding a primitive or Tailwind class boring and predictable.”

## 2. What We Discussed And Decided

These are the main conclusions from the recent work and discussion:

1. Yoga itself was not the core mistake.
   The mistake was integrating Yoga underneath an AppKit-first imperative API instead of making Yoga part of a proper shadow-tree architecture.

2. The old system looked “better” in some places because AppKit was still doing accidental layout work for us, especially for text.
   Once Yoga and the shadow/layout logic became more authoritative, the missing text architecture became visible.

3. The remaining major blocker is not the lack of a reconciler.
   The main blockers are:
   - no canonical internal model
   - text measurement/rendering semantics
   - compiler/runtime coupling
   - too much feature logic spread across many layers

4. The shadow tree is not the same thing as the reconciler.
   The shadow tree is the in-memory UI model.
   The reconciler is the runtime system that compares old and new trees and applies minimal updates.
   We do not need the reconciler first.

5. We should stop using “full polished app screenshots” as proof that the architecture is ready.
   Geometry passing is useful, but it is not enough to prove that text and host UI semantics are correct.

6. We should not dump UI forever.
   But we should stop pretending the current stack is ready for arbitrary high-fidelity app surfaces.

7. We should take a targeted nuke approach, not a total wipe.
   Keep the valuable parts:
   - Yoga integration
   - shadow/layout concepts
   - structured Tailwind ops
   - the existing `tsn-core` / `tsn-layout` / `tsn-style` / `tsn-ui` package split
   Replace the broken seam:
   - direct compiler/Tailwind coupling to host APIs

## 3. Current Safe Point Snapshot

The safe point for this document is commit `de38b9c`.

At this snapshot:

- `bash harness/correctness.sh` passes
- `bash harness/gui-builds.sh` passes
- `npx tsx conformance/harness.ts` passes `35/35`
- `npx tsx conformance/app-harness.ts` passes `31/31` for App Store Discover

Important caveat:

Even though the current oracles pass, we explicitly do not treat that as proof that the UI architecture is done.

Why:

- the geometry harness mostly proves boxes and coordinates
- it does not fully prove typography quality
- it does not fully prove font fidelity
- it does not fully prove complex host semantics
- the detail page and other non-oracle surfaces still exposed fragility around text

So this commit is a safe checkpoint, not the final architecture.

## 4. Current Compile-Time vs Runtime Split

This section is intentionally explicit because this was a source of confusion in discussion.

### 4.1 Compile-Time

At compile-time, StrictTS:

- reads TypeScript/TSX source
- validates the StrictTS subset
- parses JSX
- parses `className`
- emits C code
- invokes clang to produce a native macOS binary

Key files:

- `packages/tsn-compiler-core/src/build.ts`
- `packages/tsn-compiler-ui/src/jsx.ts`
- `packages/tsn-tailwind/src/index.ts`

Important point:

The compiler does not “draw the UI.”
It generates a native program that will later create and update the UI at runtime.

### 4.2 Runtime

At runtime, the native binary:

- launches as a normal macOS app
- creates windows and views
- creates Yoga nodes
- measures text/images/controls
- computes layout
- commits frames and style to AppKit views
- renders on screen
- handles events and state updates

Key files:

- `packages/tsn-host-appkit/src/ui.m`
- `packages/tsn-host-appkit/src/runtime/layout.inc`
- `packages/tsn-host-appkit/src/runtime/shadow_tree.inc`
- `packages/tsn-host-appkit/src/runtime/controls.inc`
- `packages/tsn-host-appkit/src/runtime/shell.inc`
- `packages/tsn-host-appkit/src/runtime/windowing.inc`

### 4.3 Current Mental Model

Today the pipeline is roughly:

`TSX -> compiler emits host/runtime calls -> C -> native binary -> host runtime builds view/shadow structures -> Yoga computes layout -> AppKit renders`

This is close to a good model, but the middle is still wrong:

- the compiler still emits concrete host calls too directly
- the runtime shadow tree is still too host-centered
- text behavior still leaks between AppKit and our own layout logic

The concrete repo-level observation is:

- `packages/tsn-core/src/nodes.ts` already defines `TSNNode` and `TSNNodeKind`
- `packages/tsn-layout/src/types.ts` already defines `LayoutNode` and layout constraints
- `packages/tsn-style` already defines tokens and recipes
- `packages/tsn-ui` already has the beginnings of a primitive-facing layer

Those pieces exist today, but they are not yet the real center of the pipeline.

## 5. Comparison To React Native

This comparison matters because it gave us the right direction.

### 5.1 What React Native Does

React Native roughly does:

`JSX -> JS runtime builds shadow tree -> styles resolve onto shadow nodes -> Yoga computes layout -> native views are updated`

Important parts:

- React Native has a shadow tree that is a real runtime model
- Yoga operates on that model
- native views are more like render targets
- text is a first-class primitive with dedicated measurement behavior
- the reconciler sits in runtime and diffs old vs new trees

### 5.2 What StrictTS Does Today

StrictTS does:

`TSX -> compile to C/native binary -> runtime creates host views and Yoga nodes -> Yoga computes layout -> AppKit renders`

This is okay in principle. The problem is not the compiled binary model.

The problem is that our current runtime model is still too coupled to host views.

### 5.3 The Important Difference

React Native does not treat native views as the architectural center.

We still do, too often.

That is why adding a primitive or class still tends to touch:

- JSX emission
- Tailwind parsing
- runtime layout code
- runtime host code
- primitive-specific behavior

Instead of touching one stable internal model plus one adapter.

## 6. What Was Improved By The Recent Work

These are real improvements and should not be thrown away casually.

### 6.1 Shadow/Layout Layer

The new shadow/layout work introduced a more coherent structure in:

- `packages/tsn-host-appkit/src/runtime/shadow_tree.inc`
- `packages/tsn-host-appkit/src/runtime/layout.inc`

This gave us:

- a real per-view shadow node association
- explicit Yoga node ownership
- explicit child attachment into a shadow structure
- improved scroll content handling
- better root layout commit behavior

### 6.2 Tailwind Ops

`packages/tsn-tailwind/src/index.ts` now produces `ops` as a real intermediate step.

This is important because it means Tailwind is no longer only string concatenation.

That direction should stay.

### 6.3 Better Oracles

The geometry and app harnesses helped us surface real issues and avoid pure screenshot guessing.

This is valuable and should stay.

## 7. What Is Still Architecturally Wrong

This is the most important section in the document.

### 7.1 The Compiler Still Emits Host Calls Directly

`packages/tsn-compiler-ui/src/jsx.ts` is still a large tag switch that creates concrete host/runtime calls such as:

- `ui_text(...)`
- `ui_image(...)`
- `ui_scroll()`
- `ui_card()`
- `ui_add_child(...)`

That means the compiler still knows too much about concrete runtime/host details.

This is the main bad seam.

### 7.2 The Existing Middle Layer Exists But Is Mostly Bypassed

This is the biggest update after reading the whole repo.

The repo already has a partial host-independent layer in:

- `packages/tsn-core/src/nodes.ts`
- `packages/tsn-layout/src/types.ts`
- `packages/tsn-style/src/tokens.ts`
- `packages/tsn-style/src/recipes.ts`
- `packages/tsn-ui/src/primitives.ts`

These files already define real concepts:

- node kinds
- event bindings
- media/style placeholders
- layout constraints
- design tokens
- primitive helpers

But the actual live pipeline still mostly bypasses them:

- `packages/tsn-compiler-ui/src/jsx.ts` emits direct host/runtime calls
- `packages/tsn-tailwind/src/index.ts` still renders style intent into `ui_set_*` calls
- `packages/tsn-host-appkit/src/runtime/shadow_tree.inc` still centers runtime identity around host views

So the reset is not “create a middle layer from scratch.”
It is “stop bypassing the middle layer that already exists.”

### 7.3 Tailwind Still Targets Runtime APIs Too Directly

Even with `ops`, `packages/tsn-tailwind/src/index.ts` still renders those ops into direct runtime calls like:

- `ui_set_size`
- `ui_set_flex`
- `ui_set_padding`
- `ui_set_align_items`
- `ui_text_set_truncate`

This means Tailwind support is still coupled to the exact runtime API surface.

Adding a class is not yet a pure “style model” operation.

### 7.4 The Shadow Tree Is Still Host-Centered

In `packages/tsn-host-appkit/src/runtime/shadow_tree.inc`, `TSNShadowNode` still fundamentally centers on:

- `NSView *view`
- host-specific node kinds
- host ownership patterns

That is better than before, but still not enough.

We need a canonical UI node model where host views are an implementation detail, not the identity of the node.

### 7.5 Text Is Still Not A First-Class Runtime Primitive

This is the biggest functional weakness.

Text currently depends on:

- `NSTextField`
- our Yoga measure callback
- our paragraph-style rules
- our line-height assumptions
- our truncation and wrap behavior

That means text is half host-native behavior and half our own runtime semantics.

That hybrid is what keeps breaking polished UI.

### 7.6 Too Many Things Are Spread Across Too Many Layers

A new primitive or class often touches:

- compiler JSX switch
- prop parsing
- Tailwind parsing
- runtime layout
- runtime host implementation
- tests/docs/examples

This is exactly what we want to stop.

## 8. Root Cause Of “We Keep Getting Stuck”

We keep getting stuck because the architecture has not yet established one stable internal contract.

Instead, features still leak across:

- syntax layer
- style layer
- runtime layout layer
- runtime host layer

So every small change creates a wide bug surface.

The issue is not “we are unlucky.”
The issue is “the boundaries are still wrong.”

## 9. The Target Architecture

The right shape is:

`TSX -> canonical UI node model -> style resolution -> layout adapter -> host adapter`

That is the middle layer that already partially exists in the repo but is not yet the real boundary.

### 9.1 Canonical Node Model

We need a host-independent node structure.

Each node should contain:

- node kind
- stable id
- children
- layout style
- visual style
- text style
- behavior props
- measurement policy

Example conceptual node kinds:

- `window`
- `stack`
- `text`
- `image`
- `button`
- `input`
- `search`
- `scroll`
- `card`
- `divider`
- `symbol`
- `spacer`

The exact names are less important than the separation.

### 9.2 Split Styles

Style should be split into:

- `layoutStyle`
  - width, height, min/max, flex, gap, padding, align, justify, aspect, overflow-related layout settings

- `visualStyle`
  - background, radius, shadow, clip, gradient, colors

- `textStyle`
  - font size, weight, line height, tracking, transform, align, truncate

This is critical.

### 9.3 Behavior Props

Separate non-style behavior:

- click
- text input change
- scroll axis
- route/navigation actions
- state binding details

These should not be mixed into style or layout logic.

## 10. What The Compiler Should Do After The Reset

The compiler should:

- parse JSX
- parse props
- parse `className`
- build canonical node descriptions
- generate code that constructs those canonical nodes

The compiler should not:

- directly think in terms of AppKit view creation as the main abstraction
- directly think in terms of specific `ui_set_*` runtime calls for most features

That is the biggest conceptual shift.

The compiler should target the canonical model, not the host runtime API.

## 11. What Tailwind Should Do After The Reset

Tailwind should:

- tokenize class names
- resolve each token into canonical style fields
- merge into a style object

Tailwind should not:

- know about AppKit
- know about host view creation
- be tightly coupled to concrete runtime setter names

Adding a Tailwind class should mostly mean:

- parse token
- update canonical style field
- done

Only if the style field itself is new should the deeper architecture need changes.

## 12. What The Runtime Should Do After The Reset

The runtime should consume canonical nodes and do three jobs:

1. measurement
2. layout
3. host commit

### 12.1 Measurement

The runtime should know how each primitive measures.

Text is the biggest example:

- given content and text style
- and maybe a width constraint
- compute intrinsic size

Images and controls are similar.

### 12.2 Layout

Yoga should operate on canonical layout fields, not on ad hoc host-driven behavior.

### 12.3 Host Commit

After layout is resolved:

- create/update AppKit views
- apply frames
- apply visual style
- apply behavior wiring

The host layer should mostly be a renderer.

## 13. Where The Reconciler Fits

The reconciler is not step one.

The reconciler comes later and lives in runtime.

Its role will be:

- compare old and new canonical UI trees
- compute minimal updates
- commit only what changed

We do not need that yet to fix the architecture.

We need the canonical model first.

## 14. Targeted Nuke Definition

This is what “targeted nuke” means in this repo.

We are not nuking:

- Yoga
- the idea of a shadow tree
- the AppKit host as the platform backend
- the whole project

We are nuking:

- direct compiler-to-host coupling as the main architecture
- direct Tailwind-to-runtime setter coupling as the main architecture
- the idea that host views are the canonical node identity

## 15. What We Keep

Keep:

- current tests and oracles
- current Yoga integration knowledge
- current shadow/layout learnings
- current Tailwind tokenization and parsing logic where useful
- current AppKit host implementation code where it maps cleanly to stable primitives

## 16. What We Replace

Replace:

- the monolithic JSX switch as the long-term feature boundary
- host-first node identity
- runtime API as the direct target of style resolution

## 17. New Layer Ownership

This is the most important practical split.

### 17.1 Canonical Model Layer

New responsibility:

- define node schema
- define style schema
- define behavior schema

Actual package responsibility:

- `packages/tsn-core`
- `packages/tsn-layout`
- `packages/tsn-style`
- `packages/tsn-ui`

Important correction:

We are not planning to invent a parallel architecture package unless we hit a hard wall.
The repo already has the right package split.
The reset should make those packages authoritative.

### 17.2 Compiler Layer

Responsibility:

- TSX to canonical node construction

Should live mainly in:

- `packages/tsn-compiler-ui`

### 17.3 Tailwind Layer

Responsibility:

- class token to canonical style fields

Should live mainly in:

- `packages/tsn-tailwind`

### 17.4 Runtime Layout Layer

Responsibility:

- canonical layout fields to Yoga

Should live mainly in:

- `packages/tsn-host-appkit/src/runtime`
- plus shared layout contracts in `packages/tsn-layout`

### 17.5 Host Adapter Layer

Responsibility:

- canonical node types and visual/behavior props to AppKit views

Should live mainly in:

- `packages/tsn-host-appkit`

## 18. How Adding A Tailwind Class Should Work After The Reset

Desired future workflow:

1. decide which canonical style field it maps to
2. add token parsing
3. map token to canonical field
4. add test

That should be it for most classes.

Examples:

- `gap-*` -> `layoutStyle.gap`
- `w-*` -> `layoutStyle.width`
- `text-sm` -> `textStyle.size`
- `font-semibold` -> `textStyle.weight`
- `bg-zinc-800` -> `visualStyle.background`

Only if a class introduces a truly new concept should deeper runtime work be required.

## 19. How Adding A Primitive Should Work After The Reset

Desired future workflow:

1. define primitive in primitive registry
2. define prop schema
3. define which canonical node kind / behavior it maps to
4. implement or reuse host adapter
5. add tests

Examples:

- `Sidebar` should probably be composition, not host magic
- `Card` should be a container with visual defaults, not a special architecture concept
- `Hero` should not be a primitive at all
- `Scroll` should be a real primitive because it changes layout/measurement semantics

## 20. Primitive Registry Goal

We should move toward a primitive registry instead of a giant compiler switch being the main definition site.

A primitive definition should describe:

- primitive name
- child policy
- prop schema
- default style behavior
- whether it participates in layout
- whether it has intrinsic measurement
- whether it maps to a specific host adapter

The compiler can still dispatch somewhere, but the data model should own primitive identity.

## 21. Text System Requirements

This deserves its own section because it is the main real-world blocker.

We need a real text primitive model with:

- text content
- size
- weight
- line height
- tracking
- transform
- alignment
- truncation
- wrapping rules
- number-of-lines semantics

We also need a dedicated measurement path that is explicit and reusable.

Text should stop being “just an `NSTextField` plus some scattered rules.”

## 22. Why Arbitrary HTML/Tailwind Still Will Not Just Work

Even after the architecture cleanup, we still will not automatically be a browser.

Browser/Tailwind features that are broader than our current intended scope:

- arbitrary HTML element semantics
- CSS grid
- pseudo elements
- hover/focus/active variants
- responsive breakpoints
- transitions/animations
- CSS variables
- z-index / complex absolute stacking
- transforms
- filters / blend modes
- form styling plugins
- portal/overlay semantics

The architecture reset should make support easier to add where we choose to support it.

But it will not magically turn the runtime into full CSS.

## 23. Why Shadcn Compatibility Is Bigger Than Tailwind Parsing

shadcn compatibility requires more than classes.

It assumes:

- browser/DOM-like structure
- component composition patterns
- focus management
- overlays and portals
- keyboard interaction semantics
- CSS variables
- data-state selectors
- transitions and animations

So the reset should not promise “full shadcn compatibility.”

It should promise “a stable architecture on which a deliberate compatibility subset can be built.”

## 24. Migration Strategy

This is the recommended order.

### Phase 1: Strengthen The Existing Canonical Model

Deliverables:

- expand `packages/tsn-core/src/nodes.ts`
- add proper layout/visual/text/behavior buckets
- connect those types to `packages/tsn-layout`
- connect style/theme contracts to `packages/tsn-style`
- make `packages/tsn-ui` primitive helpers reflect the same model

Do not change behavior yet.
Just define the model.

### Phase 2: Make Tailwind Target The Existing Canonical Style Model

Deliverables:

- Tailwind parser outputs canonical style fields
- no direct runtime setter thinking in the main abstraction

### Phase 3: Make JSX Target Canonical Nodes

Deliverables:

- JSX emission builds canonical nodes instead of direct host-first calls
- primitive registry begins to replace giant switch logic

### Phase 4: Make Runtime Consume Canonical Nodes

Deliverables:

- layout adapter from canonical layout style to Yoga
- host adapter from canonical node/style/behavior to AppKit

### Phase 5: Harden Text

Deliverables:

- dedicated text measurement path
- predictable truncation/wrapping behavior
- font weight and line-height correctness

### Phase 6: Only Then Expand Surface Area

At that point:

- add new primitives
- add new Tailwind classes
- add richer app surfaces

## 25. Testing Strategy After The Reset

We should keep and expand the oracles.

### 25.1 Keep Geometry Oracles

Useful for:

- stack layout
- scroll extents
- size/spacing behavior
- app page structure

### 25.2 Add More Primitive-Focused Tests

Especially for:

- text
- controls
- scroll
- cards
- images

### 25.3 Add Typography-Specific Tests

Because geometry alone is not enough.

We need checks for:

- truncation
- line-height
- wrapping
- single-line vs multi-line
- weight mapping

### 25.4 Do Not Reward Hack

A geometry pass is not enough if the actual host rendering still looks wrong.

## 26. Current Known Files That Need Architectural Rework

These are the most important files for the targeted nuke.

### 26.1 Compiler

- `packages/tsn-compiler-ui/src/jsx.ts`

This file is still too central and too coupled to runtime details.

### 26.2 Tailwind

- `packages/tsn-tailwind/src/index.ts`

Good direction now, but still too tied to runtime setter names.

### 26.3 Runtime Node Model

- `packages/tsn-host-appkit/src/runtime/shadow_tree.inc`

Keep concepts, but move toward canonical node ownership instead of host-view-centered ownership.

### 26.4 Runtime Layout

- `packages/tsn-host-appkit/src/runtime/layout.inc`

Keep Yoga integration learnings, but make it consume canonical style/model data.

### 26.5 Host Commit Layer

- `packages/tsn-host-appkit/src/ui.m`
- `packages/tsn-host-appkit/src/runtime/controls.inc`
- `packages/tsn-host-appkit/src/runtime/shell.inc`
- `packages/tsn-host-appkit/src/runtime/windowing.inc`

These should become adapters over the canonical model, not the model itself.

## 27. Non-Goals For The Next Step

We are not trying to:

- build the reconciler now
- build full shadcn support now
- build full browser/CSS compatibility now
- polish every example app now
- introduce lots of new primitives now

The next step is architecture.

## 28. Practical Definition Of Success

The reset is successful if:

1. adding a new Tailwind class usually touches only the Tailwind/style mapping layer
2. adding a new primitive usually touches a primitive definition plus one host adapter
3. compiler code no longer needs to know detailed host/runtime API for most features
4. runtime node identity is no longer “whatever AppKit view we happened to create”
5. text behavior becomes explicit and testable

## 29. What We Should Tell Future Agents

If a future agent reads only one section, it should be this:

Do not keep patching the current compiler-to-host direct coupling.
Do not treat geometry passes as proof that UI architecture is done.
Do not start with the reconciler.

Start by introducing the canonical UI node/style/behavior model in the middle.
Make JSX and Tailwind target that model.
Make Yoga and AppKit consume that model.

That is the plan.

## 30. Suggested Immediate Next Tasks

If work resumes from this document, the next tasks should be:

1. strengthen `packages/tsn-core/src/nodes.ts` into the canonical node/style/behavior schema
2. define primitive capabilities and a primitive registry format in the existing middle-layer packages
3. wire `packages/tsn-layout`, `packages/tsn-style`, and `packages/tsn-ui` to that schema
4. refactor Tailwind to target the canonical style schema only
5. refactor JSX emission to target canonical nodes instead of direct host-first calls

Everything after that depends on those decisions.

## 31. Final Position

We should not keep incrementally stretching the current coupling pattern.

We should not do a total rewrite either.

We should do a targeted nuke at the architectural seam:

from:

`TSX -> direct host/runtime calls`

to:

`TSX -> canonical UI model -> Yoga/host adapters`

That is the clearest path to making future UI work predictable instead of fragile.

## 32. Repo-Grounded Plan Correction

The original version of this document was directionally correct but slightly too abstract.

After reading the whole relevant codebase, the updated conclusion is:

- do not invent a second new middle layer
- use the existing `tsn-core` / `tsn-layout` / `tsn-style` / `tsn-ui` split
- make those packages the real architectural center

So the targeted nuke seam is now explicit:

- move `packages/tsn-compiler-ui` away from direct host/runtime emission
- move `packages/tsn-tailwind` away from direct runtime setter targeting
- make `packages/tsn-host-appkit` consume canonical node/style/behavior data instead of acting as the primary model

That is the plan we should now implement in code.
