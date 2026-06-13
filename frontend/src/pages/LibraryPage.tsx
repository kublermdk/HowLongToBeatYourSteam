import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { fetchConfig } from '../api/client'
import { FilterPanel } from '../components/FilterPanel'
import { HiddenGamesControl } from '../components/HiddenGamesControl'
import { GameDetailDrawer } from '../components/GameDetailDrawer'
import { GameGrid } from '../components/GameGrid'
import { GameSortBar } from '../components/GameSortBar'
import { GameTable } from '../components/GameTable'
import { useLibrary } from '../hooks/useLibrary'
import { applyFilters, libraryFilterBounds, libraryNumericMaxes, migrateFiltersForLibrary } from '../lib/filters'
import { loadInitialFilters, saveFilters, filtersToSearchParams } from '../lib/filterStorage'
import { loadFiltersExpanded, saveFiltersExpanded } from '../lib/filtersPanelStorage'
import { loadShowHiddenGames, saveShowHiddenGames } from '../lib/hiddenGamesStorage'
import {
  isSortColumnId,
  sortGames,
  toggleSort,
  type SortColumnId,
  type SortDirection,
} from '../lib/gameSort'
import { formatHltbSyncMessage } from '../lib/syncProgress'
import { type FilterState, type Game } from '../types/game'

function loadInitialSort(searchParams: URLSearchParams): {
  sortColumn: SortColumnId
  sortDirection: SortDirection
} {
  const sortParam = searchParams.get('sort')
  const sortColumn = isSortColumnId(sortParam) ? sortParam : 'playtimeMinutes'
  const sortDirection = searchParams.get('dir') === 'asc' ? 'asc' : 'desc'
  return { sortColumn, sortDirection }
}

export function LibraryPage() {
  const { steamId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [showHiddenGames, setShowHiddenGames] = useState(() => loadShowHiddenGames())
  const { games, meta, loading, syncing, reviewSyncing, error, syncProgress, reviewProgress, refresh, refreshReviews, updateGameStore } = useLibrary(steamId, showHiddenGames)
  const [filters, setFilters] = useState<FilterState>(() => loadInitialFilters(searchParams))
  const [view, setView] = useState<'table' | 'grid'>(() => (searchParams.get('view') === 'grid' ? 'grid' : 'table'))
  const [sortState, setSortState] = useState(() => loadInitialSort(searchParams))
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filtersExpanded, setFiltersExpanded] = useState(() => loadFiltersExpanded())

  const filterBounds = useMemo(() => libraryFilterBounds(games), [games])
  const filteredGames = useMemo(
    () => applyFilters(games, filters, filterBounds),
    [games, filters, filterBounds],
  )
  const sortedGames = useMemo(
    () => sortGames(filteredGames, sortState.sortColumn, sortState.sortDirection),
    [filteredGames, sortState.sortColumn, sortState.sortDirection],
  )
  const maxes = useMemo(() => libraryNumericMaxes(games), [games])

  function handleSortChange(column: SortColumnId) {
    setSortState((current) => {
      const next = toggleSort(column, current.sortColumn, current.sortDirection)
      return { sortColumn: next.column, sortDirection: next.direction }
    })
  }

  useEffect(() => {
    if (games.length === 0) {
      return
    }
    setFilters((current) => migrateFiltersForLibrary(current, games))
  }, [games])

  useEffect(() => {
    saveFilters(filters)
  }, [filters])

  useEffect(() => {
    const params = filtersToSearchParams(filters)
    if (view === 'grid') {
      params.set('view', 'grid')
    }
    if (sortState.sortColumn !== 'playtimeMinutes') {
      params.set('sort', sortState.sortColumn)
    }
    if (sortState.sortDirection !== 'desc') {
      params.set('dir', sortState.sortDirection)
    }
    setSearchParams(params, { replace: true })
  }, [filters, view, sortState, setSearchParams])

  useEffect(() => {
    if (!steamId) {
      fetchConfig().then((config) => {
        if (config.defaultSteamId) {
          navigate(`/library/${config.defaultSteamId}`, { replace: true })
        } else {
          navigate('/', { replace: true })
        }
      })
    }
  }, [steamId, navigate])

  function handleFiltersExpandedChange(expanded: boolean) {
    setFiltersExpanded(expanded)
    saveFiltersExpanded(expanded)
  }

  function handleShowHiddenChange(showHidden: boolean) {
    setShowHiddenGames(showHidden)
    saveShowHiddenGames(showHidden)
  }

  const handleSelectGame = useCallback((game: Game) => {
    setSelectedGame(game)
    setDrawerOpen(true)
  }, [])

  if (!steamId) {
    return null
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Steam Games and How Long To Beat</h1>
          <p className="text-sm text-slate-400">Steam ID <strong>{steamId}</strong></p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/" className="rounded-md border border-slate-700 px-3 py-2 text-sm">
            Change ID
          </Link>
          <button
            type="button"
            onClick={refreshReviews}
            disabled={reviewSyncing || syncing}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {reviewSyncing ? 'Syncing reviews…' : 'Refresh Steam reviews'}
          </button>
          <button
            type="button"
            onClick={refresh}
            disabled={syncing}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Refresh HLTB'}
          </button>
        </div>
      </header>

      {(loading || syncing || reviewSyncing) && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
          {loading && 'Loading library…'}
          {!loading && syncing && formatHltbSyncMessage(syncProgress)}
          {!loading && !syncing && reviewSyncing &&
            `Syncing Steam reviews ${reviewProgress.done} / ${reviewProgress.total || meta?.totalGames || '?'}`}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-800 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      <FilterPanel
        filters={filters}
        games={games}
        onChange={setFilters}
        view={view}
        onViewChange={setView}
        expanded={filtersExpanded}
        onExpandedChange={handleFiltersExpandedChange}
        hiddenGamesControl={
          <HiddenGamesControl
            debug={meta?.hiddenDebug}
            showHidden={showHiddenGames}
            onShowHiddenChange={handleShowHiddenChange}
          />
        }
      />

      <div className="text-sm text-slate-400">
        Showing {filteredGames.length} of {games.length} games
        {meta?.syncComplete ? '' : ' · HLTB sync incomplete'}
        {meta?.reviewsComplete === false ? ' · Steam reviews incomplete' : ''}
      </div>

      {view === 'table' ? (
        <GameTable
          games={sortedGames}
          maxPlaytimeMinutes={maxes.playtimeMinutes}
          sortColumn={sortState.sortColumn}
          sortDirection={sortState.sortDirection}
          onSortChange={handleSortChange}
          onSelectGame={handleSelectGame}
        />
      ) : (
        <>
          <GameSortBar
            sortColumn={sortState.sortColumn}
            sortDirection={sortState.sortDirection}
            onSortChange={handleSortChange}
          />
          <GameGrid
            games={sortedGames}
            maxPlaytimeMinutes={maxes.playtimeMinutes}
            onSelectGame={handleSelectGame}
          />
        </>
      )}

      <GameDetailDrawer
        game={selectedGame}
        steamId={steamId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onStoreLoaded={updateGameStore}
      />
    </div>
  )
}
