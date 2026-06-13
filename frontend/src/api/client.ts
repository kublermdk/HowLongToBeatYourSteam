import type { Game, GameStore, GameRelease, LibraryResponse } from '../types/game'
import { mergeGame, mergeGames } from '../lib/mergeGames'

export { mergeGame, mergeGames }

export async function fetchConfig(): Promise<{
  defaultSteamId: string | null
  fetchStoreMetadata?: boolean
  fetchSteamReviews?: boolean
}> {
  const response = await fetch('/api/config')
  if (!response.ok) {
    throw new Error('Failed to load config')
  }
  return response.json()
}

export async function fetchLibrary(steamId: string, showHidden = false): Promise<LibraryResponse> {
  const params = showHidden ? '?showHidden=1' : ''
  const response = await fetch(`/api/library/${encodeURIComponent(steamId)}${params}`)
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load library')
  }
  return payload
}

export function syncLibrary(
  steamId: string,
  onEvent: (event: Record<string, unknown>) => void,
  showHidden = false,
): EventSource {
  const params = showHidden ? '?showHidden=1' : ''
  const source = new EventSource(`/api/library/${encodeURIComponent(steamId)}/sync${params}`)

  source.onmessage = (message) => {
    onEvent(JSON.parse(message.data))
  }

  return source
}

export function syncSteamReviews(
  steamId: string,
  onEvent: (event: Record<string, unknown>) => void,
  showHidden = false,
): EventSource {
  const params = showHidden ? '?showHidden=1' : ''
  const source = new EventSource(`/api/library/${encodeURIComponent(steamId)}/sync-reviews${params}`)

  source.onmessage = (message) => {
    onEvent(JSON.parse(message.data))
  }

  return source
}

export async function fetchStoreMetadata(
  steamId: string,
  appId: number,
): Promise<{ store: GameStore | null; release: GameRelease | null }> {
  const response = await fetch(
    `/api/games/${encodeURIComponent(steamId)}/${appId}/store`,
  )
  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error || 'Failed to load store metadata')
  }
  return {
    store: payload.store ?? null,
    release: payload.release ?? null,
  }
}

export function mergeGameStore(
  games: Game[],
  appId: number,
  store: GameStore,
  release?: GameRelease | null,
): Game[] {
  return games.map((game) =>
    game.appId === appId
      ? {
          ...game,
          store,
          release: release ?? game.release,
          cached: { ...game.cached, storeFetchedAt: Math.floor(Date.now() / 1000) },
        }
      : game,
  )
}
