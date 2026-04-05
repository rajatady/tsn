# JSX & Components

StrictTS supports React-like TSX syntax that compiles to native macOS UI. Write familiar JSX with Tailwind classes — the compiler emits C calls to the AppKit-based UI framework.

## How It Works

```
dashboard.tsx  →  TypeScript AST  →  ui_*() C calls  →  clang  →  native binary
```

Each JSX element maps to a `ui_*()` C function. Props become function arguments. Tailwind classes become `ui_set_*()` calls. Children recurse.

```tsx
<HStack className="flex-1 gap-3 px-5">
  <Text className="text-2xl font-bold">Hello</Text>
</HStack>
```

Generates:
```c
UIHandle _j0 = ui_hstack();
ui_set_flex(_j0, 1);
ui_set_spacing(_j0, 12);
ui_set_padding(_j0, 0, 20, 0, 20);
UIHandle _j1 = ui_text("Hello", 24, true);
ui_add_child(_j0, _j1);
```

## Function Components

StrictTS now supports named React-style function components that return JSX. The normal `return (...)` form is supported, including destructured props and a top-level `<App />` root.

```tsx
interface HeaderProps {
  title: string
  children: JSX.Element
}

function Header({ title, children }: HeaderProps) {
  return (
    <HStack className="gap-3">
      <Text className="text-2xl font-bold">{title}</Text>
      <Spacer />
      {children}
    </HStack>
  )
}

function App() {
  return (
    <Window title="Example" width={900} height={600} dark>
      <Header title="Incidents">
        <Search placeholder="Search..." onChange={onSearch} />
      </Header>
    </Window>
  )
}

<App />
```

Notes:
- Function components compile to real C functions returning `UIHandle`
- `children` should be typed as `JSX.Element`
- Top-level `<App />` is allowed, so the entry file does not need one giant inline `<Window>`
- Hooks like `useState()` are not part of this slice yet

## Component Catalog

### Window

The root container. Every TSX app has exactly one.

```tsx
<Window title="My App" width={1200} height={780} dark
        subtitle="Native macOS App">
  {/* children */}
</Window>
```

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `title` | string | required | Window title |
| `width` | number | 1200 | Width in pixels |
| `height` | number | 780 | Height in pixels |
| `dark` | boolean | false | Dark appearance |
| `subtitle` | string | none | Subtitle in title bar |

### VStack / HStack

Flexbox-like layout containers.

```tsx
<VStack className="flex-1 gap-3 p-5">
  <Text>First</Text>
  <Text>Second</Text>
</VStack>

<HStack className="h-16 px-5 gap-3 bg-zinc-900">
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</HStack>
```

### Text

Static text label.

```tsx
<Text className="text-2xl font-bold">Title</Text>
<Text className="text-xs text-zinc-500">Subtitle</Text>
```

Text size and boldness come from className:
- `text-xs` (12px), `text-sm` (14), `text-base` (16), `text-lg` (18), `text-xl` (20), `text-2xl` (24), `text-3xl` (30), `text-4xl` (36)
- `font-bold` for bold weight

### Spacer

Fills available space in a stack. Like CSS `flex: 1` on an empty div.

```tsx
<HStack>
  <Text>Left</Text>
  <Spacer />
  <Text>Right</Text>
</HStack>
```

### Divider

Horizontal line separator.

```tsx
<Divider />
```

### Search

Search field with text change callback.

```tsx
<Search placeholder="Search employees..." onChange={onSearch} className="w-[280]" />
```

| Prop | Type | Notes |
|------|------|-------|
| `placeholder` | string | Placeholder text |
| `onChange` | `(text: string) => void` | Called on every keystroke |
| `className` | string | Tailwind classes |

### Input

Plain text input field.

```tsx
<Input placeholder="Ticket title" onChange={onTitleChange} className="w-[240]" />
```

| Prop | Type | Notes |
|------|------|-------|
| `placeholder` | string | Placeholder text |
| `onChange` | `(text: string) => void` | Called on text change |
| `className` | string | Tailwind classes |

### Sidebar

Fixed-width sidebar with sections and items.

```tsx
<Sidebar className="w-[200]">
  <SidebarSection title="NAVIGATION">
    <SidebarItem icon="chart.bar.fill" onClick={onNavClick}>Overview</SidebarItem>
    <SidebarItem icon="person.3.fill" onClick={onNavClick}>Employees</SidebarItem>
  </SidebarSection>
  <SidebarSection title="DEPARTMENTS">
    <SidebarItem icon="gearshape.fill" onClick={onDeptClick}>Engineering</SidebarItem>
  </SidebarSection>
</Sidebar>
```

| Component | Props | Notes |
|-----------|-------|-------|
| `Sidebar` | `className` | Width via `w-[N]` |
| `SidebarSection` | `title` | Section header text |
| `SidebarItem` | `icon`, `onClick` | Text content is the label. Icon is an SF Symbol name. |

### Table

Data table with custom cell rendering.

```tsx
<Table
  columns={[
    { id: "name", title: "Name", width: 160 },
    { id: "dept", title: "Department", width: 120 },
    { id: "salary", title: "Salary", width: 100 },
  ]}
  cellFn={tableCellFn}
  rows={500}
  rowHeight={26}
  alternating
  className="flex-1 mx-5"
/>
```

| Prop | Type | Notes |
|------|------|-------|
| `columns` | `Array<{id, title, width}>` | Inline array literal |
| `cellFn` | `(row: number, col: number) => string` | Returns cell text |
| `rows` | number | Number of rows to display |
| `rowHeight` | number | Row height in pixels (default 26) |
| `alternating` | boolean | Alternating row colors |

The compiler auto-generates a `refreshTable(rows: number)` function. Declare it with `declare function`:

```typescript
declare function refreshTable(rows: number): void

function onSearch(text: string): void {
  searchText = text
  applyFilters()
  refreshTable(filteredCount)
}
```

### Stat

KPI stat card.

```tsx
<Stat value="50,000" label="Total Employees" color="blue" />
<Stat value="$122,500" label="Avg Salary" color="purple" />
```

| Prop | Type | Notes |
|------|------|-------|
| `value` | string | Display value |
| `label` | string | Label below value |
| `color` | string | `blue`, `green`, `red`, `orange`, `yellow`, `purple`, `pink`, `teal`, `indigo`, `cyan` |

### Badge

Colored pill label.

```tsx
<Badge text="Active" color="green" />
<Badge text="Remote" color="blue" />
```

### Button

Native button with optional icon and variant mapping.

```tsx
<Button onClick={onReset}>Reset</Button>
<Button variant="ghost" icon="arrow.clockwise" onClick={onReset}>Refresh</Button>
```

| Prop | Type | Notes |
|------|------|-------|
| `onClick` | `(tag?: number) => void` | Click handler |
| `variant` | string | `default`, `secondary`, `outline`, `ghost`, `link`, `destructive`, `primary`, `accent` |
| `icon` | string | Optional SF Symbol name |
| `text` | string | Optional label prop; text children also work |

### Card

Rounded container that behaves like a layout stack.

```tsx
<Card className="rounded-lg">
  <Text>Summary</Text>
</Card>
```

### BarChart

Bar chart visualization.

```tsx
<BarChart title="Department Sizes" className="h-[180]" />
```

| Prop | Type | Notes |
|------|------|-------|
| `title` | string | Chart title |
| `className` | string | Height via `h-[N]` |

### Progress

Progress bar.

```tsx
<Progress value={0.75} />    <!-- 75% -->
<Progress value={-1} />      <!-- indeterminate (spinning) -->
```

## Callbacks

### onClick

```typescript
function onDeptClick(tag: number): void {
  // tag is the sidebar item's sequential index
  deptFilterIdx = tag
  applyFilters()
}
```

The compiler wraps TypeScript functions to match C callback signatures:
- TypeScript `(tag: number) => void` (double) becomes C `void(*)(int)`
- Auto-generated wrapper: `_wrap_click_onDeptClick(int _tag) { onDeptClick((double)_tag); }`

### onChange

```typescript
function onSearch(text: string): void {
  searchText = text
  applyFilters()
}
```

- TypeScript `(text: string) => void` (Str) becomes C `void(*)(const char*)`
- Auto-generated wrapper converts `const char*` to `Str` via `str_from()`

### cellFn

```typescript
function tableCellFn(row: number, col: number): string {
  const e: Employee = employees[row]
  if (col === 0) return e.name
  if (col === 1) return "$" + String(Math.floor(e.salary))
  return ""
}
```

- TypeScript `(row: number, col: number) => string` becomes C `const char*(*)(int, int, void*)`
- Auto-generated wrapper converts return `Str` to `const char*` via static buffer

## .map() in JSX

```tsx
<Sidebar>
  <SidebarSection title="DEPARTMENTS">
    {departments.map(d =>
      <SidebarItem icon="folder.fill" onClick={onDeptClick}>
        {d.name}
      </SidebarItem>
    )}
  </SidebarSection>
</Sidebar>
```

Generates a C for-loop that creates one element per iteration and adds it to the parent.

## Tailwind Classes

Compile-time parsing. No CSS runtime. 1 Tailwind unit = 4 pixels.

### Layout

| Class | Effect | Example |
|-------|--------|---------|
| `flex-1`, `flex-2` | Set flex grow | `ui_set_flex(h, 1)` |
| `gap-N` | Stack spacing | `gap-3` = 12px |
| `p-N` | Padding all sides | `p-5` = 20px |
| `px-N`, `py-N` | Horizontal/vertical padding | `px-5` = 20px left+right |
| `pt-N`, `pr-N`, `pb-N`, `pl-N` | Individual padding | `pt-4` = 16px top |
| `m-N`, `mx-N`, `my-N` | Margin (emitted as padding) | `mx-5` = 20px left+right |

### Sizing

| Class | Effect |
|-------|--------|
| `w-N` | Width = N * 4px |
| `h-N` | Height = N * 4px |
| `w-[200]` | Width = 200px (arbitrary) |
| `h-[100]` | Height = 100px (arbitrary) |

### Typography

| Class | Size |
|-------|------|
| `text-xs` | 12px |
| `text-sm` | 14px |
| `text-base` | 16px |
| `text-lg` | 18px |
| `text-xl` | 20px |
| `text-2xl` | 24px |
| `text-3xl` | 30px |
| `text-4xl` | 36px |
| `font-bold` | Bold weight |

### Colors

Background colors (zinc palette):

| Class | RGB |
|-------|-----|
| `bg-zinc-50` | 0.98, 0.98, 0.98 |
| `bg-zinc-100` | 0.96, 0.96, 0.96 |
| `bg-zinc-200` | 0.90, 0.90, 0.90 |
| `bg-zinc-800` | 0.15, 0.15, 0.15 |
| `bg-zinc-900` | 0.09, 0.09, 0.09 |
| `bg-zinc-950` | 0.04, 0.04, 0.04 |

Text colors use system color indices:

| Class | Color |
|-------|-------|
| `text-zinc-500` | tertiaryLabel (dimmed) |
| `text-blue` | systemBlue |
| `text-green` | systemGreen |
| `text-red` | systemRed |

### Decoration

| Class | Effect |
|-------|--------|
| `rounded` | 8px corner radius |
| `rounded-sm` | 4px |
| `rounded-md` | 6px |
| `rounded-lg` | 12px |
| `rounded-full` | 9999px |

## Top-Level Variables in JSX Mode

When a file contains JSX, top-level `const`/`let` declarations become C globals (not inside `main()`). This lets functions and components reference them:

```typescript
const employees: Employee[] = generateEmployees(50000)   // global
let searchText = ""                                       // global

function onSearch(text: string): void {
  searchText = text   // can access because it's global
}

function App() {
  return (
    <Window title="App" ...>
      ...
    </Window>
  )
}

<App />
```

## Element IDs

Every JSX element is registered with a unique ID (`_j0`, `_j1`, ...) for inspector lookup:

```c
UIHandle _j0 = ui_window("App", 800, 600, true);
ui_set_id(_j0, "_j0");
```

Query elements at runtime via the inspector: `strictts inspect get _j5 type`
