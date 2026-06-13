import { SORT_COLUMNS, type SortColumnId, type SortDirection } from '../lib/gameSort'

interface GameSortBarProps {
  sortColumn: SortColumnId
  sortDirection: SortDirection
  onSortChange: (column: SortColumnId) => void
}

export function GameSortBar({ sortColumn, sortDirection, onSortChange }: GameSortBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-300">
      <span className="text-slate-500">Sort by</span>
      {SORT_COLUMNS.map((column) => {
        const active = sortColumn === column.id
        const indicator = active ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''

        return (
          <button
            key={column.id}
            type="button"
            className={`rounded-md px-2 py-1 hover:text-white ${
              active ? 'bg-slate-800 font-medium text-white' : ''
            }`}
            onClick={() => onSortChange(column.id)}
          >
            {column.label}
            {indicator}
          </button>
        )
      })}
    </div>
  )
}
