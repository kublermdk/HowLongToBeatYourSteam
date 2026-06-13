export function logScaleRatio(value: number, max: number): number {
  if (value <= 0 || max <= 0) {
    return 0
  }
  return Math.log(value + 1) / Math.log(max + 1)
}

export function playtimeColor(minutes: number, maxMinutes: number): string {
  const ratio = logScaleRatio(minutes, maxMinutes)
  if (ratio < 0.15) {
    return 'bg-teal-500/80'
  }
  if (ratio < 0.35) {
    return 'bg-amber-500/80'
  }
  if (ratio < 0.6) {
    return 'bg-orange-500/80'
  }
  return 'bg-rose-600/80'
}

export function hltbRatioColor(yourMinutes: number, targetHours: number | null | undefined): string {
  if (!targetHours || targetHours <= 0) {
    return 'bg-slate-600'
  }

  const ratio = yourMinutes / 60 / targetHours
  if (ratio < 0.85) {
    return 'bg-emerald-500'
  }
  if (ratio <= 1.15) {
    return 'bg-amber-400'
  }
  return 'bg-rose-500'
}

export function gridSpan(playtimeMinutes: number, maxMinutes: number): number {
  const scale = logScaleRatio(playtimeMinutes, maxMinutes)
  return Math.max(1, Math.min(4, Math.round(1 + scale * 3)))
}
