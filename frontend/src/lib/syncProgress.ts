export interface HltbSyncProgress {
    done: number
    total: number
    pendingHltb: number
    avgSecondsPerEntry: number | null
    etaSeconds: number | null
}

export const emptyHltbSyncProgress = (): HltbSyncProgress => ({
    done: 0,
    total: 0,
    pendingHltb: 0,
    avgSecondsPerEntry: null,
    etaSeconds: null,
})

interface HltbSyncTimingState {
    pendingHltb: number
    nonCachedProcessed: number
    nonCachedTotalMs: number
    fetchStartTime: number | null
}

export function createHltbSyncTimingState(): HltbSyncTimingState {
    return {
        pendingHltb: 0,
        nonCachedProcessed: 0,
        nonCachedTotalMs: 0,
        fetchStartTime: null,
    }
}

export function applyHltbMetaEvent(
    timing: HltbSyncTimingState,
    event: Record<string, unknown>,
): Pick<HltbSyncProgress, 'done' | 'total' | 'pendingHltb'> {
    const total = Number(event.totalGames ?? event.total ?? 0)
    const cachedHltb = Number(event.cachedHltb ?? event.cached_hltb ?? 0)
    const pendingHltb = Number(
        event.pendingHltb ?? event.pending_hltb ?? Math.max(0, total - cachedHltb),
    )

    timing.pendingHltb = pendingHltb
    timing.nonCachedProcessed = 0
    timing.nonCachedTotalMs = 0
    timing.fetchStartTime = null

    return {
        done: cachedHltb,
        total,
        pendingHltb,
    }
}

export function applyHltbGameEvent(
    timing: HltbSyncTimingState,
    event: Record<string, unknown>,
    current: HltbSyncProgress,
): HltbSyncProgress {
    const fromCache = Boolean(event.fromCache ?? event.from_cache)
    const done = Number(event.index ?? current.done)
    const now = Date.now()

    if (!fromCache) {
        if (timing.fetchStartTime !== null) {
            timing.nonCachedTotalMs += now - timing.fetchStartTime
        }
        timing.nonCachedProcessed += 1
        timing.fetchStartTime = now
    }

    const intervalCount = timing.nonCachedProcessed - 1
    const avgSecondsPerEntry =
        intervalCount >= 1 ? timing.nonCachedTotalMs / intervalCount / 1000 : null

    const remainingNonCached = Math.max(0, timing.pendingHltb - timing.nonCachedProcessed)
    const etaSeconds =
        avgSecondsPerEntry != null && remainingNonCached > 0
            ? remainingNonCached * avgSecondsPerEntry
            : null

    return {
        done,
        total: current.total,
        pendingHltb: timing.pendingHltb,
        avgSecondsPerEntry,
        etaSeconds,
    }
}

function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${Math.round(seconds)}s`
    }
    if (seconds < 3600) {
        const minutes = Math.round(seconds / 60)
        return `${minutes} min`
    }
    return `${(seconds / 3600).toFixed(1)} hr`
}

export function formatHltbSyncMessage(progress: HltbSyncProgress): string {
    const base = `Syncing HLTB ${progress.done} / ${progress.total || '?'}`

    if (progress.etaSeconds == null || progress.avgSecondsPerEntry == null) {
        return base
    }

    const eta = formatDuration(progress.etaSeconds)
    const rate = progress.avgSecondsPerEntry.toFixed(1)
    return `${base} ~${eta} remaining @ ${rate}s per entry`
}
