export function AbsolutePositionCase() {
  return (
    <View testId="root" className="relative w-[520] h-[240] rounded-2xl bg-zinc-950">
      <View testId="hero" className="w-full h-full rounded-2xl bg-zinc-900" />
      <View testId="badge" className="absolute top-[16px] left-[20px] rounded-full border border-white/20 bg-black/40 px-3 py-1">
        <Text testId="badge-text" className="text-xs uppercase text-white/80">Overlay</Text>
      </View>
      <View testId="cta" className="absolute bottom-[18px] right-[18px] w-[96] h-[40] rounded-lg bg-white/10" />
    </View>
  )
}
