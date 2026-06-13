import type { SortColumnId, SortDirection } from '../lib/gameSort'
import type { Game } from '../types/game'
import { GameTableRow } from './GameTableRow'

interface GameTableProps {
  games: Game[]
  maxPlaytimeMinutes: number
  sortColumn: SortColumnId
  sortDirection: SortDirection
  onSortChange: (column: SortColumnId) => void
  onSelectGame?: (game: Game) => void
}

const SORTABLE_COLUMNS: { id: SortColumnId; label: string }[] = [
  { id: 'name', label: 'Name' },
  { id: 'type', label: 'Type' },
  { id: 'steamReviews', label: 'Steam reviews' },
  { id: 'playtimeMinutes', label: 'Your playtime' },
  { id: 'vsHltb', label: 'vs HLTB' },
  { id: 'lastPlayedTimestamp', label: 'Last played' },
  { id: 'mainExtraHours', label: 'HLTB M+E' },
  { id: 'releaseTimestamp', label: 'Released' },
]

export function GameTable({
  games,
  maxPlaytimeMinutes,
  sortColumn,
  sortDirection,
  onSortChange,
  onSelectGame,
}: GameTableProps) {
  function sortIndicator(columnId: SortColumnId) {
    if (columnId !== sortColumn) {
      return null
    }
    return sortDirection === 'asc' ? ' ▲' : ' ▼'
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900 text-left text-slate-300">
          <tr>
            <th className="px-3 py-2 font-medium" />
            {SORTABLE_COLUMNS.map((column) => (
              <th key={column.id} className="px-3 py-2 font-medium">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 hover:text-white"
                  onClick={() => onSortChange(column.id)}
                >
                  {column.label}
                  {sortIndicator(column.id)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <GameTableRow
              key={game.appId}
              game={game}
              maxPlaytimeMinutes={maxPlaytimeMinutes}
              onSelectGame={onSelectGame}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
