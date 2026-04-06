/**
 * Button primitive: all 8 style variants
 *
 * Tests that every button variant renders with consistent height
 * inside items-center rows, and that variant styling doesn't
 * break the layout geometry.
 */
export function ButtonVariantsCase() {
  return (
    <VStack testId="root" className="gap-3 w-[500] bg-zinc-900 p-4">
      <HStack testId="row-default" className="items-center gap-3 h-[44]">
        <Card testId="label-default" className="w-[100] h-[20] rounded bg-zinc-800" />
        <Button testId="btn-default">Default</Button>
      </HStack>
      <HStack testId="row-primary" className="items-center gap-3 h-[44]">
        <Card testId="label-primary" className="w-[100] h-[20] rounded bg-zinc-800" />
        <Button testId="btn-primary" variant="primary">Primary</Button>
      </HStack>
      <HStack testId="row-destructive" className="items-center gap-3 h-[44]">
        <Card testId="label-destructive" className="w-[100] h-[20] rounded bg-zinc-800" />
        <Button testId="btn-destructive" variant="destructive">Delete</Button>
      </HStack>
      <HStack testId="row-ghost" className="items-center gap-3 h-[44]">
        <Card testId="label-ghost" className="w-[100] h-[20] rounded bg-zinc-800" />
        <Button testId="btn-ghost" variant="ghost">Ghost</Button>
      </HStack>
      <HStack testId="row-get" className="items-center gap-3 h-[44]">
        <Card testId="label-get" className="w-[100] h-[20] rounded bg-zinc-800" />
        <Button testId="btn-get" variant="get">Get</Button>
      </HStack>
      <HStack testId="row-chip" className="items-center gap-3 h-[44]">
        <Card testId="label-chip" className="w-[100] h-[20] rounded bg-zinc-800" />
        <Button testId="btn-chip" variant="chip">Chip</Button>
      </HStack>
      <HStack testId="row-sidebar" className="items-center gap-3 h-[44]">
        <Card testId="label-sidebar" className="w-[100] h-[20] rounded bg-zinc-800" />
        <Button testId="btn-sidebar" variant="sidebar">Sidebar</Button>
      </HStack>
      <HStack testId="row-sidebar-active" className="items-center gap-3 h-[44]">
        <Card testId="label-sidebar-active" className="w-[100] h-[20] rounded bg-zinc-800" />
        <Button testId="btn-sidebar-active" variant="sidebar-active">Active</Button>
      </HStack>
    </VStack>
  )
}
