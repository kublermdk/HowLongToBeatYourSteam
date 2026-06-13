import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import type { Game } from '../types/game'
import { mergeGames } from '../lib/mergeGames'

export function useBatchedGameUpdates(setGames: Dispatch<SetStateAction<Game[]>>) {
  const pendingRef = useRef<Map<number, Game>>(new Map())
  const frameRef = useRef<number | null>(null)

  const flush = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }

    const pending = pendingRef.current
    if (pending.size === 0) {
      return
    }

    pendingRef.current = new Map()
    const updates = Array.from(pending.values())
    setGames((current) => mergeGames(current, updates))
  }, [setGames])

  const queueGameUpdate = useCallback(
    (game: Game) => {
      pendingRef.current.set(game.appId, game)

      if (frameRef.current === null) {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null
          flush()
        })
      }
    },
    [flush],
  )

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current)
      }
      pendingRef.current.clear()
    }
  }, [])

  return { queueGameUpdate, flushGameUpdates: flush }
}
