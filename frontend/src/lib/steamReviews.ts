export const STEAM_REVIEW_LABELS = [
  'Overwhelmingly Positive',
  'Very Positive',
  'Positive',
  'Mostly Positive',
  'Mixed',
  'Mostly Negative',
  'Negative',
  'Very Negative',
  'Overwhelmingly Negative',
  'No user reviews',
] as const

export type SteamReviewLabel = (typeof STEAM_REVIEW_LABELS)[number]

// -- Steam review_score is 1–9; higher is better.
export const STEAM_REVIEW_MIN_SCORE: Record<string, number> = {
  overwhelminglyPositivePlus: 9,
  veryPositivePlus: 8,
  positivePlus: 7,
  mostlyPositivePlus: 6,
}

export function steamReviewBadgeClass(label: string | null | undefined): string {
  switch (label) {
    case 'Overwhelmingly Positive':
    case 'Very Positive':
      return 'border-emerald-700 bg-emerald-950/60 text-emerald-200'
    case 'Positive':
    case 'Mostly Positive':
      return 'border-lime-700 bg-lime-950/50 text-lime-200'
    case 'Mixed':
      return 'border-amber-700 bg-amber-950/50 text-amber-200'
    case 'Mostly Negative':
    case 'Negative':
    case 'Very Negative':
    case 'Overwhelmingly Negative':
      return 'border-rose-700 bg-rose-950/50 text-rose-200'
    default:
      return 'border-slate-700 bg-slate-900 text-slate-400'
  }
}

export function formatSteamReviewSummary(
  label: string | null | undefined,
  positivePercent: number | null | undefined,
  totalReviews: number | null | undefined,
): string {
  if (!label) {
    return '—'
  }
  if (label === 'No user reviews' || !totalReviews) {
    return label
  }
  const percent = positivePercent != null ? `${positivePercent}%` : ''
  return percent ? `${label} (${percent})` : label
}
