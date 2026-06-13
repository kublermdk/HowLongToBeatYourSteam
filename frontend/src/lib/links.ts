import type { Game } from '../types/game'

export function hltbUrlForGame(game: Game): string {
  if (game.links.howLongToBeat) {
    return game.links.howLongToBeat
  }
  if (game.hltbId) {
    return `https://howlongtobeat.com/game/${game.hltbId}`
  }
  const query = encodeURIComponent(game.hltbName || game.steamName)
  return `https://howlongtobeat.com/?q=${query}`
}
