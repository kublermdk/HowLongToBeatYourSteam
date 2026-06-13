import * as Dialog from '@radix-ui/react-dialog'
import { useEffect, useState } from 'react'
import { fetchStoreMetadata } from '../api/client'
import type { Game, GameRelease, GameStore } from '../types/game'
import { hltbUrlForGame } from '../lib/links'
import { formatCacheAge, formatHours, formatRelativeTime } from '../lib/format'
import { formatSteamReviewSummary } from '../lib/steamReviews'
import { GameCover } from './GameCover'

interface GameDetailDrawerProps {
  game: Game | null
  steamId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onStoreLoaded?: (appId: number, store: GameStore, release?: GameRelease | null) => void
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  )
}

function formatReleaseLabel(game: Game): string {
  if (game.release?.label) {
    return game.release.earlyAccess ? `${game.release.label} (Early Access)` : game.release.label
  }
  if (game.hltb?.releaseYear) {
    return String(game.hltb.releaseYear)
  }
  return '—'
}

export function GameDetailDrawer({
  game,
  steamId,
  open,
  onOpenChange,
  onStoreLoaded,
}: GameDetailDrawerProps) {
  const [store, setStore] = useState<GameStore | null>(null)
  const [loadingStore, setLoadingStore] = useState(false)
  const [storeError, setStoreError] = useState<string | null>(null)

  useEffect(() => {
    if (!game || !open) {
      setStore(null)
      setStoreError(null)
      return
    }

    if (game.store) {
      setStore(game.store)
      setStoreError(null)
      return
    }

    let cancelled = false
    setLoadingStore(true)
    setStoreError(null)

    fetchStoreMetadata(steamId, game.appId)
      .then(({ store: loadedStore, release }) => {
        if (cancelled) {
          return
        }
        setStore(loadedStore)
        if (loadedStore) {
          onStoreLoaded?.(game.appId, loadedStore, release)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStoreError(error instanceof Error ? error.message : 'Failed to load store data')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingStore(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [game, open, onStoreLoaded, steamId])

  const displayName = game?.hltbName || game?.steamName || 'Game'
  const hltbUrl = game ? hltbUrlForGame(game) : null

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed right-0 top-0 flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-slate-800 bg-slate-950 p-6 shadow-2xl">
          {game && (
            <>
              <Dialog.Title className="text-xl font-bold">{displayName}</Dialog.Title>
              {game.hltb?.gameAlias && (
                <Dialog.Description className="mt-1 text-sm text-slate-400">
                  Also known as {game.hltb.gameAlias}
                </Dialog.Description>
              )}

              <GameCover
                src={game.images.headerUrl}
                alt={displayName}
                className="mt-4 w-full rounded-lg"
              />

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={game.links.steamStore}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-steam"
                >
                  Steam store
                </a>
                <a
                  href={hltbUrl!}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-hltb"
                >
                  How Long To Beat
                </a>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Your playtime" value={formatHours(game.playtimeMinutes)} />
                <Stat label="Last played" value={formatRelativeTime(game.lastPlayedTimestamp)} />
                <Stat label="Released" value={formatReleaseLabel(game)} />
                <Stat
                  label="Steam reviews"
                  value={formatSteamReviewSummary(
                    game.steamReviews?.scoreLabel,
                    game.steamReviews?.positivePercent,
                    game.steamReviews?.totalReviews,
                  )}
                />
                <Stat
                  label="HLTB Main + Extra"
                  value={game.hltb?.mainExtraHours != null ? `${game.hltb.mainExtraHours.toFixed(1)}h` : '—'}
                />
                <Stat
                  label="HLTB Completionist"
                  value={game.hltb?.completionistHours != null ? `${game.hltb.completionistHours.toFixed(1)}h` : '—'}
                />
                <Stat label="Steam cached" value={formatCacheAge(game.cached.steamFetchedAt)} />
                <Stat label="HLTB cached" value={formatCacheAge(game.cached.hltbFetchedAt)} />
              </div>

              {(store?.shortDescription || loadingStore || storeError) && (
                <section className="mt-6 space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">About</h3>
                  {loadingStore && <p className="text-sm text-slate-500">Loading store description…</p>}
                  {storeError && <p className="text-sm text-rose-300">{storeError}</p>}
                  {store?.shortDescription && (
                    <p className="text-sm leading-relaxed text-slate-300">{store.shortDescription}</p>
                  )}
                  {store?.genres && store.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {store.genres.map((genre) => (
                        <span
                          key={genre}
                          className="rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-300"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <Dialog.Close className="mt-6 self-start rounded-md border border-slate-700 px-3 py-2 text-sm hover:bg-slate-900">
                Close
              </Dialog.Close>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
