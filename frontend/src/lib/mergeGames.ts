import type { Game } from '../types/game'

export function mergeGame(games: Game[], updated: Game): Game[] {
  return mergeGames(games, [updated])
}

export function mergeGames(games: Game[], updates: Game[]): Game[] {
  if (updates.length === 0) {
    return games
  }

  const updateMap = new Map(updates.map((game) => [game.appId, game]))
  let changed = false
  const next = games.map((game) => {
    const updated = updateMap.get(game.appId)
    if (updated) {
      changed = true
      updateMap.delete(game.appId)
      return updated
    }
    return game
  })

  if (updateMap.size > 0) {
    changed = true
    for (const game of updateMap.values()) {
      next.push(game)
    }
    next.sort((a, b) => a.steamName.localeCompare(b.steamName))
  }

  return changed ? next : games
}
