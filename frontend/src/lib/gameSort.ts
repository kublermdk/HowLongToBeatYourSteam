import type { Game } from '../types/game'
import { releaseSortKey } from './format'

export type SortColumnId =
  | 'name'
  | 'type'
  | 'steamReviews'
  | 'playtimeMinutes'
  | 'vsHltb'
  | 'lastPlayedTimestamp'
  | 'mainExtraHours'
  | 'releaseTimestamp'

export type SortDirection = 'asc' | 'desc'

export const SORT_COLUMNS: { id: SortColumnId; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'type', label: 'Type' },
  { id: 'steamReviews', label: 'Steam reviews' },
  { id: 'playtimeMinutes', label: 'Your playtime' },
  { id: 'vsHltb', label: 'vs HLTB' },
  { id: 'lastPlayedTimestamp', label: 'Last played' },
  { id: 'mainExtraHours', label: 'HLTB M+E' },
  { id: 'releaseTimestamp', label: 'Released' },
]

const sortColumnIds = new Set<string>(SORT_COLUMNS.map((column) => column.id))

export function isSortColumnId(value: string | null): value is SortColumnId {
  return value != null && sortColumnIds.has(value)
}

function compareGames(a: Game, b: Game, column: SortColumnId): number {
  switch (column) {
    case 'name':
      return (a.hltbName || a.steamName).localeCompare(b.hltbName || b.steamName, undefined, {
        sensitivity: 'base',
      })
    case 'type':
      return (a.hltb?.gameTypeLabel ?? '').localeCompare(b.hltb?.gameTypeLabel ?? '', undefined, {
        sensitivity: 'base',
      })
    case 'steamReviews':
      return (a.steamReviews?.score ?? -1) - (b.steamReviews?.score ?? -1)
    case 'playtimeMinutes':
      return a.playtimeMinutes - b.playtimeMinutes
    case 'vsHltb': {
      const ratioA =
        a.hltb?.mainExtraHours && a.hltb.mainExtraHours > 0
          ? a.playtimeMinutes / 60 / a.hltb.mainExtraHours
          : -1
      const ratioB =
        b.hltb?.mainExtraHours && b.hltb.mainExtraHours > 0
          ? b.playtimeMinutes / 60 / b.hltb.mainExtraHours
          : -1
      return ratioA - ratioB
    }
    case 'lastPlayedTimestamp':
      return a.lastPlayedTimestamp - b.lastPlayedTimestamp
    case 'mainExtraHours':
      return (a.hltb?.mainExtraHours ?? -1) - (b.hltb?.mainExtraHours ?? -1)
    case 'releaseTimestamp':
      return releaseSortKey(a) - releaseSortKey(b)
  }
}

export function sortGames(games: Game[], column: SortColumnId, direction: SortDirection): Game[] {
  const sorted = [...games].sort((a, b) => compareGames(a, b, column))
  if (direction === 'desc') {
    sorted.reverse()
  }
  return sorted
}

export function defaultSortDirection(column: SortColumnId): SortDirection {
  return column === 'name' || column === 'type' ? 'asc' : 'desc'
}

export function toggleSort(
  column: SortColumnId,
  currentColumn: SortColumnId,
  currentDirection: SortDirection,
): { column: SortColumnId; direction: SortDirection } {
  if (column === currentColumn) {
    return {
      column,
      direction: currentDirection === 'asc' ? 'desc' : 'asc',
    }
  }
  return { column, direction: defaultSortDirection(column) }
}
