import type { FilterState, Game, HltbMetric } from '../types/game'
import { defaultFilters } from '../types/game'
import { STEAM_REVIEW_MIN_SCORE } from './steamReviews'

const DAY_SECONDS = 86400
const MONTH_SECONDS = 30.44 * DAY_SECONDS

export interface LibraryFilterBounds {
  playtimeMaxHours: number
  hltbMaxByMetric: Record<HltbMetric, number>
}

export function libraryFilterBounds(games: Game[]): LibraryFilterBounds {
  const maxes = libraryNumericMaxes(games)
  const playtimeMaxHours = Math.max(1, Math.ceil((maxes.playtimeMinutes / 60) * 1.1))

  return {
    playtimeMaxHours,
    hltbMaxByMetric: {
      mainStoryHours: Math.max(1, Math.ceil(maxes.mainStoryHours * 1.1)),
      mainExtraHours: Math.max(1, Math.ceil(maxes.mainExtraHours * 1.1)),
      completionistHours: Math.max(1, Math.ceil(maxes.completionistHours * 1.1)),
    },
  }
}

export function defaultFiltersForLibrary(games: Game[]): FilterState {
  const bounds = libraryFilterBounds(games)
  return {
    ...defaultFilters,
    playtimeMaxHours: bounds.playtimeMaxHours,
    hltbMaxHours: bounds.hltbMaxByMetric.mainExtraHours,
    includeUnknownHltb: true,
  }
}

const LEGACY_PLAYTIME_MAX_HOURS = 2000
const LEGACY_HLTB_MAX_HOURS = 100

export function migrateFiltersForLibrary(filters: FilterState, games: Game[]): FilterState {
  if (games.length === 0) {
    return filters
  }

  const bounds = libraryFilterBounds(games)
  const hltbCeiling = bounds.hltbMaxByMetric[filters.hltbMetric]
  let next = { ...filters }

  if (next.playtimeMinHours === 0) {
    if (next.playtimeMaxHours === LEGACY_PLAYTIME_MAX_HOURS || next.playtimeMaxHours >= defaultFilters.playtimeMaxHours) {
      next.playtimeMaxHours = bounds.playtimeMaxHours
    }
  }

  if (next.hltbMinHours === 0) {
    const wasLegacyHltbMax = next.hltbMaxHours === LEGACY_HLTB_MAX_HOURS
    if (wasLegacyHltbMax || next.hltbMaxHours >= defaultFilters.hltbMaxHours) {
      next.hltbMaxHours = hltbCeiling
      if (wasLegacyHltbMax) {
        next.includeUnknownHltb = true
      }
    }
  }

  return next
}

function isPlaytimeFilterActive(filters: FilterState, bounds?: LibraryFilterBounds): boolean {
  if (!bounds) {
    return filters.playtimeMinHours > 0 || filters.playtimeMaxHours < defaultFilters.playtimeMaxHours
  }
  return filters.playtimeMinHours > 0 || filters.playtimeMaxHours < bounds.playtimeMaxHours
}

function isHltbFilterActive(filters: FilterState, bounds?: LibraryFilterBounds): boolean {
  if (!bounds) {
    return (
      filters.hltbMinHours > 0 ||
      filters.hltbMaxHours < defaultFilters.hltbMaxHours ||
      !filters.includeUnknownHltb
    )
  }
  const hltbCeiling = bounds.hltbMaxByMetric[filters.hltbMetric]
  return filters.hltbMinHours > 0 || filters.hltbMaxHours < hltbCeiling || !filters.includeUnknownHltb
}

export function monthsSinceRelease(timestamp: number): number {
  const now = Date.now() / 1000
  return Math.max(0, Math.floor((now - timestamp) / MONTH_SECONDS))
}

export function monthsAgoLabel(monthsAgo: number): string {
  const date = new Date()
  date.setDate(1)
  date.setMonth(date.getMonth() - monthsAgo)
  return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

function matchesSteamReviewFilter(game: Game, filters: FilterState): boolean {
  const reviews = game.steamReviews

  if (filters.steamReviewPreset === 'any' && !filters.excludeNoSteamReviews) {
    return true
  }

  if (!reviews?.scoreLabel) {
    return filters.includeUnknownSteamReviews
  }

  if (filters.excludeNoSteamReviews && reviews.scoreLabel === 'No user reviews') {
    return false
  }

  if (filters.steamReviewPreset === 'any') {
    return true
  }

  if (filters.steamReviewPreset === 'custom') {
    if (filters.steamReviewLabels.length === 0) {
      return true
    }
    return filters.steamReviewLabels.includes(reviews.scoreLabel)
  }

  const score = reviews.score ?? 0
  const minimum = STEAM_REVIEW_MIN_SCORE[filters.steamReviewPreset] ?? 0
  return score >= minimum
}

function matchesReleaseFilter(game: Game, filters: FilterState): boolean {
  const release = game.release

  if (filters.earlyAccess === 'only' && !release?.earlyAccess) {
    return false
  }
  if (filters.earlyAccess === 'exclude' && release?.earlyAccess) {
    return false
  }

  if (filters.releaseAgePreset === 'any') {
    return true
  }

  const timestamp = release?.timestamp
  if (timestamp == null) {
    return filters.includeUnknownRelease
  }

  const monthsAgo = monthsSinceRelease(timestamp)

  switch (filters.releaseAgePreset) {
    case 'last12months':
      return monthsAgo <= 12
    case 'older12months':
      return monthsAgo > 12
    case 'older5years':
      return monthsAgo > 60
    case 'custom':
      return monthsAgo >= filters.releaseMonthsMin && monthsAgo <= filters.releaseMonthsMax
    default:
      return true
  }
}

export function getHltbHours(game: Game, metric: HltbMetric): number | null {
  if (!game.hltb) {
    return null
  }
  return game.hltb[metric]
}

export function getUniqueGameTypes(games: Game[]): string[] {
  const types = new Set<string>()
  for (const game of games) {
    const label = game.hltb?.gameTypeLabel
    if (label) {
      types.add(label)
    }
  }
  return Array.from(types).sort()
}

export function applyFilters(games: Game[], filters: FilterState, bounds?: LibraryFilterBounds): Game[] {
  const now = Date.now() / 1000
  const playtimeFilterActive = isPlaytimeFilterActive(filters, bounds)
  const hltbFilterActive = isHltbFilterActive(filters, bounds)

  return games.filter((game) => {
    const name = (game.hltbName || game.steamName).toLowerCase()
    if (filters.search && !name.includes(filters.search.toLowerCase())) {
      return false
    }

    if (playtimeFilterActive) {
      const playtimeHours = game.playtimeMinutes / 60
      if (playtimeHours < filters.playtimeMinHours || playtimeHours > filters.playtimeMaxHours) {
        return false
      }
    }

    if (filters.playStatus === 'unplayed' && game.playtimeMinutes > 0) {
      return false
    }
    if (filters.playStatus === 'played' && game.playtimeMinutes === 0) {
      return false
    }

    if (filters.lastPlayed === 'never' && game.lastPlayedTimestamp !== 0) {
      return false
    }
    if (filters.lastPlayed === 'recent') {
      if (!game.lastPlayedTimestamp) {
        return false
      }
      if (now - game.lastPlayedTimestamp > filters.lastPlayedDays * DAY_SECONDS) {
        return false
      }
    }
    if (filters.lastPlayed === 'older') {
      if (!game.lastPlayedTimestamp) {
        return true
      }
      if (now - game.lastPlayedTimestamp <= filters.lastPlayedDays * DAY_SECONDS) {
        return false
      }
    }

    if (hltbFilterActive) {
      const hltbHours = getHltbHours(game, filters.hltbMetric)
      if (hltbHours === null) {
        return filters.includeUnknownHltb
      }
      if (hltbHours < filters.hltbMinHours || hltbHours > filters.hltbMaxHours) {
        return false
      }
    }

    if (filters.gameTypes.length > 0) {
      const label = game.hltb?.gameTypeLabel
      if (!label || !filters.gameTypes.includes(label)) {
        return false
      }
    }

    if (!matchesReleaseFilter(game, filters)) {
      return false
    }

    if (!matchesSteamReviewFilter(game, filters)) {
      return false
    }

    return true
  })
}

export function applyBacklogPreset(filters: FilterState): FilterState {
  return {
    ...filters,
    playStatus: 'unplayed',
    hltbMetric: 'mainExtraHours',
    hltbMinHours: 8,
    hltbMaxHours: 20,
    includeUnknownHltb: false,
    playtimeMaxHours: 0,
    playtimeMinHours: 0,
    steamReviewPreset: 'mostlyPositivePlus',
    excludeNoSteamReviews: true,
  }
}

export function libraryNumericMaxes(games: Game[]) {
  return {
    playtimeMinutes: Math.max(...games.map((game) => game.playtimeMinutes), 1),
    mainStoryHours: Math.max(...games.map((game) => game.hltb?.mainStoryHours ?? 0), 1),
    mainExtraHours: Math.max(...games.map((game) => game.hltb?.mainExtraHours ?? 0), 1),
    completionistHours: Math.max(...games.map((game) => game.hltb?.completionistHours ?? 0), 1),
  }
}
