import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchConfig } from '../api/client'

const STORAGE_KEY = 'hltbys_steam_id'
const RECENT_KEY = 'hltbys_recent_steam_ids'

function loadRecentIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
  } catch {
    return []
  }
}

function saveRecentId(steamId: string) {
  const trimmed = steamId.trim()
  if (!trimmed) {
    return
  }

  const recent = loadRecentIds().filter((id) => id !== trimmed)
  recent.unshift(trimmed)
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)))
  localStorage.setItem(STORAGE_KEY, trimmed)
}

export function HomePage() {
  const navigate = useNavigate()
  const [steamId, setSteamId] = useState('')
  const [hint, setHint] = useState('')
  const [recentIds, setRecentIds] = useState<string[]>([])

  useEffect(() => {
    fetchConfig().then((config) => {
      const stored = localStorage.getItem(STORAGE_KEY) || ''
      const defaultId = config.defaultSteamId || stored

      if (defaultId && window.location.pathname === '/') {
        navigate(`/library/${encodeURIComponent(defaultId)}`, { replace: true })
        return
      }

      setSteamId(defaultId)
      setRecentIds(loadRecentIds())

      if (config.defaultSteamId) {
        setHint('Default from config.local.py')
      } else if (stored) {
        setHint('Using your last Steam ID from this browser')
      }
    })
  }, [navigate])

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = steamId.trim()
    if (!trimmed) {
      return
    }

    saveRecentId(trimmed)
    navigate(`/library/${encodeURIComponent(trimmed)}`)
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-4">
      <h1 className="mb-2 text-3xl font-bold">HowLongToBeatYourSteam</h1>
      <p className="mb-6 text-slate-400">Find your next game by playtime, HLTB length, and backlog filters.</p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-6">
        <label className="block space-y-2 text-sm">
          <span className="text-slate-300">Steam ID (SteamID64)</span>
          <input
            list="recentSteamIds"
            value={steamId}
            onChange={(event) => setSteamId(event.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2"
            required
          />
          <datalist id="recentSteamIds">
            {recentIds.map((id) => (
              <option key={id} value={id} />
            ))}
          </datalist>
        </label>

        {hint && <p className="text-xs text-slate-500">{hint}</p>}

        <button type="submit" className="w-full rounded-md bg-sky-600 py-2 font-medium hover:bg-sky-500">
          Open library
        </button>
      </form>
    </div>
  )
}
