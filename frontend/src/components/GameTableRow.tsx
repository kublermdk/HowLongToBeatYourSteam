import { memo } from 'react'
import type { Game } from '../types/game'
import { hltbRatioColor, playtimeColor } from '../lib/colors'
import { formatHours, formatReleaseDate, formatRelativeTime } from '../lib/format'
import { formatSteamReviewSummary, steamReviewBadgeClass } from '../lib/steamReviews'
import { hltbUrlForGame } from '../lib/links'
import { GameCover } from './GameCover'

interface GameTableRowProps {
  game: Game
  maxPlaytimeMinutes: number
  onSelectGame?: (game: Game) => void
}

export const GameTableRow = memo(function GameTableRow({
  game,
  maxPlaytimeMinutes,
  onSelectGame,
}: GameTableRowProps) {
  const displayName = game.hltbName || game.steamName
  const hltbUrl = hltbUrlForGame(game)
  const reviewLabel = game.steamReviews?.scoreLabel
  const target = game.hltb?.mainExtraHours
  const ratioWidth = target ? Math.min(100, Math.round(((game.playtimeMinutes / 60) / target) * 100)) : 0
  const playtimeWidth = Math.max(4, Math.round((game.playtimeMinutes / maxPlaytimeMinutes) * 100))
  const releaseLabel = formatReleaseDate(game)

  return (
    <tr className="border-t border-slate-800 hover:bg-slate-900/60">
      <td className="px-3 py-2 align-top">
        <button type="button" onClick={() => onSelectGame?.(game)}>
          <GameCover
            src={game.images.headerUrl}
            alt=""
            className="h-12 w-20 rounded object-cover bg-slate-800"
          />
        </button>
      </td>
      <td className="px-3 py-2 align-top">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => onSelectGame?.(game)}
            className="text-left font-medium text-sky-400 hover:text-sky-300"
          >
            {displayName}
          </button>
          {hltbUrl && (
            <div>
              <a href={hltbUrl} target="_blank" rel="noreferrer" className="text-xs">
                HLTB
              </a>
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-2 align-top">{game.hltb?.gameTypeLabel || '—'}</td>
      <td className="px-3 py-2 align-top">
        {!reviewLabel ? (
          '—'
        ) : (
          <span
            className={`inline-block rounded-full border px-2 py-0.5 text-xs ${steamReviewBadgeClass(reviewLabel)}`}
            title={formatSteamReviewSummary(
              reviewLabel,
              game.steamReviews?.positivePercent,
              game.steamReviews?.totalReviews,
            )}
          >
            {reviewLabel}
          </span>
        )}
      </td>
      <td className="px-3 py-2 align-top">
        <div className="min-w-28 space-y-1">
          <div className="h-2 rounded bg-slate-800">
            <div
              className={`h-2 rounded ${playtimeColor(game.playtimeMinutes, maxPlaytimeMinutes)}`}
              style={{ width: `${Math.min(playtimeWidth, 100)}%` }}
            />
          </div>
          <span className="text-sm">{formatHours(game.playtimeMinutes)}</span>
        </div>
      </td>
      <td className="px-3 py-2 align-top">
        <div className="min-w-24 space-y-1">
          <div className="h-2 rounded bg-slate-800">
            <div
              className={`h-2 rounded ${hltbRatioColor(game.playtimeMinutes, target)}`}
              style={{ width: `${ratioWidth}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">M+E {target ? `${target.toFixed(1)}h` : '—'}</span>
        </div>
      </td>
      <td className="px-3 py-2 align-top">{formatRelativeTime(game.lastPlayedTimestamp)}</td>
      <td className="px-3 py-2 align-top">
        {target == null ? (
          '—'
        ) : hltbUrl ? (
          <a href={hltbUrl} target="_blank" rel="noreferrer">
            {target.toFixed(1)}h
          </a>
        ) : (
          `${target.toFixed(1)}h`
        )}
      </td>
      <td className="px-3 py-2 align-top">
        {releaseLabel === '—' ? (
          releaseLabel
        ) : game.release?.earlyAccess ? (
          <div className="space-y-0.5">
            <div>{releaseLabel}</div>
            <div className="text-xs text-amber-400/90">Early Access</div>
          </div>
        ) : (
          releaseLabel
        )}
      </td>
    </tr>
  )
}, (prev, next) => prev.game === next.game && prev.maxPlaytimeMinutes === next.maxPlaytimeMinutes && prev.onSelectGame === next.onSelectGame)
