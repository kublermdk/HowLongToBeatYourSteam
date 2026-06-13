import * as Slider from '@radix-ui/react-slider'
import * as Tabs from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'
import type { FilterState, Game, HltbMetric } from '../types/game'
import { applyBacklogPreset, defaultFiltersForLibrary, getUniqueGameTypes, libraryFilterBounds, monthsAgoLabel } from '../lib/filters'
import { STEAM_REVIEW_LABELS } from '../lib/steamReviews'

interface FilterPanelProps {
  filters: FilterState
  games: Game[]
  onChange: (filters: FilterState) => void
  view: 'table' | 'grid'
  onViewChange: (view: 'table' | 'grid') => void
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  hiddenGamesControl?: ReactNode
}

const hltbMetricLabels: Record<HltbMetric, string> = {
  mainStoryHours: 'Main Story',
  mainExtraHours: 'Main + Extra',
  completionistHours: 'Completionist',
}

function RangeSlider({
  label,
  min,
  max,
  value,
  onValueChange,
  formatValue,
}: {
  label: string
  min: number
  max: number
  value: [number, number]
  onValueChange: (value: [number, number]) => void
  formatValue?: (value: number) => string
}) {
  const fmt = formatValue ?? ((v: number) => String(Math.round(v)))

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-slate-300">
        <span>{label}</span>
        <span>{fmt(value[0])} – {fmt(value[1])}</span>
      </div>
      <Slider.Root
        className="relative flex h-5 w-full touch-none items-center select-none"
        min={min}
        max={max}
        step={1}
        value={value}
        onValueChange={(next) => onValueChange([next[0], next[1]])}
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-slate-700">
          <Slider.Range className="absolute h-full rounded-full bg-sky-500" />
        </Slider.Track>
        <Slider.Thumb className="block h-4 w-4 rounded-full bg-white shadow" />
        <Slider.Thumb className="block h-4 w-4 rounded-full bg-white shadow" />
      </Slider.Root>
    </div>
  )
}

export function FilterPanel({
  filters,
  games,
  onChange,
  view,
  onViewChange,
  expanded,
  onExpandedChange,
  hiddenGamesControl,
}: FilterPanelProps) {
  const gameTypes = getUniqueGameTypes(games)
  const bounds = libraryFilterBounds(games)
  const playtimeSliderMax = bounds.playtimeMaxHours
  const hltbSliderMax = bounds.hltbMaxByMetric[filters.hltbMetric]

  function handleHltbMetricChange(metric: HltbMetric) {
    onChange({
      ...filters,
      hltbMetric: metric,
      hltbMaxHours: Math.max(filters.hltbMaxHours, bounds.hltbMaxByMetric[metric]),
    })
  }

  function toggleGameType(label: string) {
    const next = filters.gameTypes.includes(label)
      ? filters.gameTypes.filter((item) => item !== label)
      : [...filters.gameTypes, label]
    onChange({ ...filters, gameTypes: next })
  }

  function toggleReviewLabel(label: string) {
    const next = filters.steamReviewLabels.includes(label)
      ? filters.steamReviewLabels.filter((item) => item !== label)
      : [...filters.steamReviewLabels, label]
    onChange({ ...filters, steamReviewPreset: 'custom', steamReviewLabels: next })
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => onExpandedChange(!expanded)}
          className="flex items-center gap-2 text-left hover:text-sky-200"
        >
          <span className="text-xs text-slate-400" aria-hidden>
            {expanded ? '▼' : '▶'}
          </span>
          <h2 className="text-lg font-semibold">Filters</h2>
          {!expanded && filters.search && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-normal text-slate-400">
              search active
            </span>
          )}
        </button>
        <Tabs.Root value={view} onValueChange={(value) => onViewChange(value as 'table' | 'grid')}>
          <Tabs.List className="inline-flex rounded-lg bg-slate-800 p-1">
            <Tabs.Trigger
              value="table"
              className="rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              Table
            </Tabs.Trigger>
            <Tabs.Trigger
              value="grid"
              className="rounded-md px-3 py-1.5 text-sm data-[state=active]:bg-slate-700 data-[state=active]:text-white"
            >
              Grid
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>
      </div>

      {expanded && (
        <>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-slate-300">Search</span>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={filters.search}
            onChange={(event) => onChange({ ...filters, search: event.target.value })}
            placeholder="Game name..."
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-300">Play status</span>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={filters.playStatus}
            onChange={(event) => onChange({ ...filters, playStatus: event.target.value as FilterState['playStatus'] })}
          >
            <option value="any">Any</option>
            <option value="unplayed">Unplayed only</option>
            <option value="played">Played only</option>
          </select>
        </label>
      </div>

      <RangeSlider
        label="Your playtime (hours)"
        min={0}
        max={playtimeSliderMax}
        value={[
          filters.playtimeMinHours,
          Math.min(filters.playtimeMaxHours, playtimeSliderMax),
        ]}
        onValueChange={([playtimeMinHours, playtimeMaxHours]) =>
          onChange({ ...filters, playtimeMinHours, playtimeMaxHours })
        }
        formatValue={(value) => `${value}h`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-slate-300">Last played</span>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={filters.lastPlayed}
            onChange={(event) => onChange({ ...filters, lastPlayed: event.target.value as FilterState['lastPlayed'] })}
          >
            <option value="any">Any</option>
            <option value="never">Never played</option>
            <option value="recent">Within N days</option>
            <option value="older">Older than N days</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="text-slate-300">Last played window (days)</span>
          <input
            type="number"
            min={1}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={filters.lastPlayedDays}
            onChange={(event) => onChange({ ...filters, lastPlayedDays: Number(event.target.value) || 90 })}
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-slate-300">HLTB duration metric</span>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={filters.hltbMetric}
            onChange={(event) => handleHltbMetricChange(event.target.value as HltbMetric)}
          >
            {Object.entries(hltbMetricLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300 pt-6">
          <input
            type="checkbox"
            checked={filters.includeUnknownHltb}
            onChange={(event) => onChange({ ...filters, includeUnknownHltb: event.target.checked })}
          />
          Include games without HLTB data when filtering by duration
        </label>
      </div>

      <RangeSlider
        label={`HLTB ${hltbMetricLabels[filters.hltbMetric]} (hours)`}
        min={0}
        max={hltbSliderMax}
        value={[
          filters.hltbMinHours,
          Math.min(filters.hltbMaxHours, hltbSliderMax),
        ]}
        onValueChange={([hltbMinHours, hltbMaxHours]) =>
          onChange({ ...filters, hltbMinHours, hltbMaxHours })
        }
        formatValue={(value) => `${value}h`}
      />

      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
        <div className="text-sm font-medium text-slate-200">Game age</div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Release age</span>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              value={filters.releaseAgePreset}
              onChange={(event) =>
                onChange({
                  ...filters,
                  releaseAgePreset: event.target.value as FilterState['releaseAgePreset'],
                })
              }
            >
              <option value="any">Any release date</option>
              <option value="last12months">Released in the last 12 months</option>
              <option value="older12months">Released more than 12 months ago</option>
              <option value="older5years">Released more than 5 years ago</option>
              <option value="custom">Custom range</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Early access</span>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
              value={filters.earlyAccess}
              onChange={(event) =>
                onChange({
                  ...filters,
                  earlyAccess: event.target.value as FilterState['earlyAccess'],
                })
              }
            >
              <option value="any">Any</option>
              <option value="only">Early access only</option>
              <option value="exclude">Exclude early access</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { preset: 'last12months' as const, label: 'Last 12 months' },
            { preset: 'older12months' as const, label: 'Older than 12 months' },
            { preset: 'older5years' as const, label: 'Older than 5 years' },
          ].map(({ preset, label }) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange({ ...filters, releaseAgePreset: preset })}
              className={`rounded-full px-3 py-1 text-xs border ${
                filters.releaseAgePreset === preset
                  ? 'border-sky-500 bg-sky-500/20 text-sky-200'
                  : 'border-slate-700 bg-slate-800 text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filters.releaseAgePreset === 'custom' && (
          <RangeSlider
            label="Release window"
            min={0}
            max={600}
            value={[filters.releaseMonthsMin, filters.releaseMonthsMax]}
            onValueChange={([releaseMonthsMin, releaseMonthsMax]) =>
              onChange({ ...filters, releaseMonthsMin, releaseMonthsMax })
            }
            formatValue={(months) => monthsAgoLabel(months)}
          />
        )}

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={filters.includeUnknownRelease}
            onChange={(event) => onChange({ ...filters, includeUnknownRelease: event.target.checked })}
          />
          Include games without release date data
        </label>

        <p className="text-xs text-slate-500">
          Month precision uses Steam store data when cached; otherwise HLTB release year is used.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4">
        <div className="text-sm font-medium text-slate-200">Steam reviews</div>

        <label className="space-y-1 text-sm block">
          <span className="text-slate-300">Minimum review quality</span>
          <select
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            value={filters.steamReviewPreset}
            onChange={(event) =>
              onChange({
                ...filters,
                steamReviewPreset: event.target.value as FilterState['steamReviewPreset'],
                steamReviewLabels: [],
              })
            }
          >
            <option value="any">Any</option>
            <option value="mostlyPositivePlus">Mostly Positive or better</option>
            <option value="positivePlus">Positive or better</option>
            <option value="veryPositivePlus">Very Positive or better</option>
            <option value="overwhelminglyPositivePlus">Overwhelmingly Positive only</option>
            <option value="custom">Custom labels</option>
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          {[
            { preset: 'mostlyPositivePlus' as const, label: 'Mostly Positive+' },
            { preset: 'positivePlus' as const, label: 'Positive+' },
            { preset: 'veryPositivePlus' as const, label: 'Very Positive+' },
          ].map(({ preset, label }) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange({ ...filters, steamReviewPreset: preset, steamReviewLabels: [] })}
              className={`rounded-full px-3 py-1 text-xs border ${
                filters.steamReviewPreset === preset
                  ? 'border-sky-500 bg-sky-500/20 text-sky-200'
                  : 'border-slate-700 bg-slate-800 text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {filters.steamReviewPreset === 'custom' && (
          <div className="flex flex-wrap gap-2">
            {STEAM_REVIEW_LABELS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleReviewLabel(label)}
                className={`rounded-full px-3 py-1 text-xs border ${
                  filters.steamReviewLabels.includes(label)
                    ? 'border-sky-500 bg-sky-500/20 text-sky-200'
                    : 'border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={filters.excludeNoSteamReviews}
            onChange={(event) => onChange({ ...filters, excludeNoSteamReviews: event.target.checked })}
          />
          Exclude games with no Steam user reviews
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={filters.includeUnknownSteamReviews}
            onChange={(event) => onChange({ ...filters, includeUnknownSteamReviews: event.target.checked })}
          />
          Include games without cached Steam review data
        </label>

        <p className="text-xs text-slate-500">
          Review summaries are fetched from Steam and cached locally. Use Refresh Steam reviews to populate your library.
        </p>
      </div>

      {gameTypes.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-slate-300">Game type</div>
          <div className="flex flex-wrap gap-2">
            {gameTypes.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleGameType(label)}
                className={`rounded-full px-3 py-1 text-xs border ${
                  filters.gameTypes.includes(label)
                    ? 'border-sky-500 bg-sky-500/20 text-sky-200'
                    : 'border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium hover:bg-sky-500"
        onClick={() => onChange(applyBacklogPreset(filters))}
      >
        Preset: Short backlog pick (8–20h Main+Extra, unplayed)
      </button>

&nbsp; &nbsp;
      <button
        type="button"
        className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900"
        onClick={() => onChange(defaultFiltersForLibrary(games))}
      >
        Reset filters
      </button>

      {hiddenGamesControl}
        </>
      )}
    </section>
  )
}
