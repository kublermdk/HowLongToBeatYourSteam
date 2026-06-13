import type { Game } from '../types/game'

export function formatHours(minutes: number): string {
  if (minutes <= 0) {
    return '0h'
  }

  const hours = minutes / 60
  if (hours < 1) {
    return `${minutes}m`
  }

  if (hours < 10) {
    return `${hours.toFixed(1)}h`
  }

  return `${Math.round(hours)}h`
}

export function formatRelativeTime(timestamp: number): string {
  if (!timestamp) {
    return 'Never'
  }

  const deltaMs = Date.now() - timestamp * 1000
  const days = Math.floor(deltaMs / 86400000)
  if (days <= 0) {
    return 'Today'
  }
  if (days === 1) {
    return '1 day ago'
  }
  if (days < 30) {
    return `${days} days ago`
  }
  if (days < 365) {
    return `${Math.floor(days / 30)} mo ago`
  }
  return `${Math.floor(days / 365)} yr ago`
}

export function formatCacheAge(timestamp: number | null): string {
  if (!timestamp) {
    return '—'
  }

  const hours = Math.floor((Date.now() / 1000 - timestamp) / 3600)
  if (hours < 1) {
    return 'just now'
  }
  if (hours < 24) {
    return `${hours}h ago`
  }
  return `${Math.floor(hours / 24)}d ago`
}

export function releaseSortKey(game: Game): number {
  if (game.release?.timestamp) {
    return game.release.timestamp
  }
  const hltbYear = game.hltb?.releaseYear
  if (hltbYear) {
    return Date.UTC(hltbYear, 6, 1) / 1000
  }
  return -1
}

export function formatReleaseDate(game: Game): string {
  const release = game.release

  if (release?.year != null) {
    if (release.source === 'steam' && release.month != null) {
      const date = new Date(release.year, release.month - 1, 1)
      return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    }
    return String(release.year)
  }

  if (release?.label) {
    return release.label
  }

  if (game.hltb?.releaseYear) {
    return String(game.hltb.releaseYear)
  }

  return '—'
}
