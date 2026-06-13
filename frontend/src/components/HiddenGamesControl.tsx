import type { HiddenGamesDebug } from '../types/game'

interface HiddenGamesControlProps {
  debug: HiddenGamesDebug | null | undefined
  showHidden: boolean
  onShowHiddenChange: (showHidden: boolean) => void
}

function DebugRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  if (value == null || value === '') {
    return null
  }
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="break-all text-slate-300">{value}</span>
    </div>
  )
}

function HiddenGamesDebugDetails({ debug }: { debug: HiddenGamesDebug }) {
  return (
    <div className="mt-3 space-y-3">
      {debug.message && <p>{debug.message}</p>}
      {debug.actionMessage && <p className="text-slate-300">{debug.actionMessage}</p>}

      <div className="space-y-1 rounded-md border border-slate-800 bg-slate-950/50 p-3">
        <DebugRow label="Detection" value={debug.detection} />
        <DebugRow label="Source" value={debug.detectionSource} />
        <DebugRow label="Steam path" value={debug.steamInstallPath} />
        <DebugRow label="localconfig.vdf" value={debug.localconfigPath} />
        <DebugRow label="Cloud dir" value={debug.cloudStorageDir} />
        <DebugRow label="Cloud file" value={debug.cloudStorageFile} />
        <DebugRow label="localconfig note" value={debug.localconfigMessage} />
        <DebugRow label="Cloud note" value={debug.cloudStorageMessage} />
        <DebugRow label="Parse error" value={debug.parseError} />
      </div>
    </div>
  )
}

export function HiddenGamesControl({ debug, showHidden, onShowHiddenChange }: HiddenGamesControlProps) {
  if (!debug?.checkHiddenGames) {
    return null
  }

  const hiddenCount = debug.hiddenInLibrary ?? debug.hiddenAppidsInConfig ?? 0
  const detectionFailed = debug.detection !== 'ok'

  if (detectionFailed) {
    return (
      <div className="rounded-lg border border-amber-800 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
        <div className="font-medium">Hidden games could not be loaded ({debug.detection})</div>
        <HiddenGamesDebugDetails debug={debug} />
      </div>
    )
  }

  if (hiddenCount === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4 text-sm">
      <span className="text-slate-300">
        {hiddenCount} hidden {hiddenCount === 1 ? 'game' : 'games'}
        {!showHidden && debug.hiddenFiltered ? ` (${debug.hiddenFiltered} excluded)` : ''}
      </span>
      <label className="flex cursor-pointer items-center gap-2 text-slate-300">
        <input
          type="checkbox"
          checked={showHidden}
          onChange={(event) => onShowHiddenChange(event.target.checked)}
          className="rounded border-slate-600"
        />
        Show hidden games
      </label>
    </div>
  )
}
