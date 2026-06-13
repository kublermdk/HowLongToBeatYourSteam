import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchConfig, fetchLibrary, mergeGameStore, syncLibrary, syncSteamReviews } from '../api/client'
import type { Game, GameRelease, GameStore, LibraryMeta } from '../types/game'
import { useBatchedGameUpdates } from './useBatchedGameUpdates'
import {
  applyHltbGameEvent,
  applyHltbMetaEvent,
  createHltbSyncTimingState,
  emptyHltbSyncProgress,
  type HltbSyncProgress,
} from '../lib/syncProgress'

interface UseLibraryResult {
  games: Game[]
  meta: LibraryMeta | null
  loading: boolean
  syncing: boolean
  reviewSyncing: boolean
  error: string | null
  syncProgress: HltbSyncProgress
  reviewProgress: { done: number; total: number }
  refresh: () => void
  refreshReviews: () => void
  updateGameStore: (appId: number, store: GameStore, release?: GameRelease | null) => void
}

export function useLibrary(steamId: string | undefined, showHiddenGames = false): UseLibraryResult {
  const [games, setGames] = useState<Game[]>([])
  const [meta, setMeta] = useState<LibraryMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [reviewSyncing, setReviewSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState<HltbSyncProgress>(emptyHltbSyncProgress)
  const hltbSyncTimingRef = useRef(createHltbSyncTimingState())
  const [reviewProgress, setReviewProgress] = useState({ done: 0, total: 0 })
  const [fetchSteamReviewsEnabled, setFetchSteamReviewsEnabled] = useState(true)
  const { queueGameUpdate, flushGameUpdates } = useBatchedGameUpdates(setGames)

  useEffect(() => {
    fetchConfig().then((config) => {
      setFetchSteamReviewsEnabled(config.fetchSteamReviews !== false)
    })
  }, [])

  const startSync = useCallback(
    (id: string) => {
      setSyncing(true)
      hltbSyncTimingRef.current = createHltbSyncTimingState()
      setSyncProgress(emptyHltbSyncProgress())

      const source = syncLibrary(
        id,
        (event) => {
          if (event.type === 'meta') {
            const metaProgress = applyHltbMetaEvent(hltbSyncTimingRef.current, event)
            setSyncProgress((current) => ({
              ...current,
              ...metaProgress,
            }))
          }

          if (event.type === 'game' && event.game) {
            queueGameUpdate(event.game as Game)
            setSyncProgress((current) => applyHltbGameEvent(hltbSyncTimingRef.current, event, current))
          }

          if (event.type === 'done') {
            flushGameUpdates()
            setSyncing(false)
            source.close()
            setMeta((current) => (current ? { ...current, syncComplete: true } : current))
          }

          if (event.type === 'error') {
            flushGameUpdates()
            setSyncing(false)
            source.close()
            setError(String(event.message))
          }
        },
        showHiddenGames,
      )

      return () => {
        flushGameUpdates()
        source.close()
      }
    },
    [showHiddenGames, queueGameUpdate, flushGameUpdates],
  )

  const startReviewSync = useCallback(
    (id: string) => {
      setReviewSyncing(true)
      const source = syncSteamReviews(
        id,
        (event) => {
          if (event.type === 'meta') {
            setReviewProgress({
              done: Number(event.cachedReviews ?? 0),
              total: Number(event.totalGames ?? event.total ?? 0),
            })
          }

          if (event.type === 'game' && event.game) {
            queueGameUpdate(event.game as Game)
            setReviewProgress((current) => ({
              ...current,
              done: Number(event.index ?? current.done),
            }))
          }

          if (event.type === 'done') {
            flushGameUpdates()
            setReviewSyncing(false)
            source.close()
            setMeta((current) =>
              current
                ? { ...current, reviewsComplete: true, cachedReviews: current.totalGames }
                : current,
            )
          }

          if (event.type === 'error') {
            flushGameUpdates()
            setReviewSyncing(false)
            source.close()
            setError(String(event.message))
          }
        },
        showHiddenGames,
      )

      return () => {
        flushGameUpdates()
        source.close()
      }
    },
    [showHiddenGames, queueGameUpdate, flushGameUpdates],
  )

  const refresh = useCallback(() => {
    if (!steamId) {
      return
    }
    startSync(steamId)
  }, [steamId, startSync])

  const refreshReviews = useCallback(() => {
    if (!steamId) {
      return
    }
    startReviewSync(steamId)
  }, [steamId, startReviewSync])

  const updateGameStore = useCallback((appId: number, store: GameStore, release?: GameRelease | null) => {
    setGames((current) => mergeGameStore(current, appId, store, release))
  }, [])

  useEffect(() => {
    if (!steamId) {
      setLoading(false)
      return
    }

    let cancelled = false
    let closeSync: (() => void) | undefined
    let closeReviewSync: (() => void) | undefined

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const library = await fetchLibrary(steamId!, showHiddenGames)
        if (cancelled) {
          return
        }

        setGames(library.games)
        setMeta(library.meta)
        setLoading(false)

        if (!library.meta.syncComplete) {
          closeSync = startSync(steamId!)
        } else if (fetchSteamReviewsEnabled && library.meta.reviewsComplete === false) {
          closeReviewSync = startReviewSync(steamId!)
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load library')
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
      closeSync?.()
      closeReviewSync?.()
    }
  }, [steamId, showHiddenGames, startSync, startReviewSync, fetchSteamReviewsEnabled])

  return {
    games,
    meta,
    loading,
    syncing,
    reviewSyncing,
    error,
    syncProgress,
    reviewProgress,
    refresh,
    refreshReviews,
    updateGameStore,
  }
}
