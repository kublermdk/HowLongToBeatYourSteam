import { useMemo } from 'react'
import type { Game } from '../types/game'
import { gridSpan, playtimeColor } from '../lib/colors'
import { formatHours } from '../lib/format'
import { hltbUrlForGame } from '../lib/links'
import { GameCover } from './GameCover'

interface GameGridProps {
  games: Game[]
  maxPlaytimeMinutes: number
  onSelectGame?: (game: Game) => void
}

function mostPlayedAppId(games: Game[]): number | null {
  if (games.length === 0) {
    return null
  }

  let topAppId: number | null = null
  let topMinutes = 0

  for (const game of games) {
    if (game.playtimeMinutes > topMinutes) {
      topMinutes = game.playtimeMinutes
      topAppId = game.appId
    }
  }

  return topMinutes > 0 ? topAppId : null
}

export function GameGrid({ games, maxPlaytimeMinutes, onSelectGame }: GameGridProps) {
  const heroAppId = useMemo(() => mostPlayedAppId(games), [games])

  return (
    <div
      className="grid auto-rows-auto gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}
    >
      {games.map((game) => {
        const isMostPlayed = game.appId === heroAppId
        const colSpan = gridSpan(game.playtimeMinutes, maxPlaytimeMinutes)
        const displayName = game.hltbName || game.steamName
        const hltbUrl = hltbUrlForGame(game)

        return (
          <article
            key={game.appId}
            className="flex flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900/70 cursor-pointer hover:border-slate-600"
            style={{ gridColumn: isMostPlayed ? '1 / -1' : `span ${colSpan}` }}
            onClick={() => onSelectGame?.(game)}
          >
            <GameCover
              src={game.images.headerUrl}
              alt={displayName}
              className="block w-full h-auto"
            />
            <div className="space-y-2 p-2">
              <div className="flex items-start justify-between gap-2">
                <span className="line-clamp-2 text-sm font-medium leading-tight">
                  {displayName}
                </span>
                {hltbUrl && (
                  <a
                    href={hltbUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-[10px] uppercase tracking-wide text-sky-400 hover:text-sky-300"
                    onClick={(event) => event.stopPropagation()}
                  >
                    HLTB
                  </a>
                )}
              </div>
              <div className="space-y-1">
                <div className="h-1.5 rounded bg-slate-800">
                  <div
                    className={`h-1.5 rounded ${playtimeColor(game.playtimeMinutes, maxPlaytimeMinutes)}`}
                    style={{
                      width: `${Math.max(4, Math.min(100, Math.round((game.playtimeMinutes / maxPlaytimeMinutes) * 100)))}%`,
                    }}
                  />
                </div>
                <div className="text-xs text-slate-400">
                  {formatHours(game.playtimeMinutes)}
                  {game.hltb?.mainExtraHours != null && ` · M+E ${game.hltb.mainExtraHours.toFixed(0)}h`}
                </div>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
