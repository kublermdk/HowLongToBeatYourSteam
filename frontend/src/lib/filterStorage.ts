import { FILTER_STORAGE_KEY, defaultFilters, type EarlyAccessFilter, type FilterState, type HltbMetric, type LastPlayedFilter, type PlayStatus, type ReleaseAgePreset, type SteamReviewPreset } from '../types/game'

export function loadSavedFilters(): FilterState {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) {
      return defaultFilters
    }
    return { ...defaultFilters, ...JSON.parse(raw) }
  } catch {
    return defaultFilters
  }
}

export function saveFilters(filters: FilterState) {
  localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters))
}

function parseNumber(value: string | null, fallback: number): number {
  if (value == null || value === '') {
    return fallback
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseBool(value: string | null): boolean {
  return value === '1' || value === 'true'
}

const playStatuses = new Set<PlayStatus>(['any', 'unplayed', 'played'])
const lastPlayedValues = new Set<LastPlayedFilter>(['any', 'never', 'recent', 'older'])
const hltbMetrics = new Set<HltbMetric>(['mainStoryHours', 'mainExtraHours', 'completionistHours'])
const releaseAgePresets = new Set<ReleaseAgePreset>(['any', 'last12months', 'older12months', 'older5years', 'custom'])
const earlyAccessFilters = new Set<EarlyAccessFilter>(['any', 'only', 'exclude'])
const steamReviewPresets = new Set<SteamReviewPreset>([
  'any',
  'mostlyPositivePlus',
  'positivePlus',
  'veryPositivePlus',
  'overwhelminglyPositivePlus',
  'custom',
])

export function filtersFromSearchParams(params: URLSearchParams): Partial<FilterState> {
  const partial: Partial<FilterState> = {}

  const search = params.get('q')
  if (search) {
    partial.search = search
  }

  const playStatus = params.get('played')
  if (playStatus && playStatuses.has(playStatus as PlayStatus)) {
    partial.playStatus = playStatus as PlayStatus
  }

  if (params.has('ptMin')) {
    partial.playtimeMinHours = parseNumber(params.get('ptMin'), defaultFilters.playtimeMinHours)
  }
  if (params.has('ptMax')) {
    partial.playtimeMaxHours = parseNumber(params.get('ptMax'), defaultFilters.playtimeMaxHours)
  }

  const lastPlayed = params.get('last')
  if (lastPlayed && lastPlayedValues.has(lastPlayed as LastPlayedFilter)) {
    partial.lastPlayed = lastPlayed as LastPlayedFilter
  }
  if (params.has('lastDays')) {
    partial.lastPlayedDays = parseNumber(params.get('lastDays'), defaultFilters.lastPlayedDays)
  }

  const hltbMetric = params.get('hltb')
  if (hltbMetric && hltbMetrics.has(hltbMetric as HltbMetric)) {
    partial.hltbMetric = hltbMetric as HltbMetric
  }
  if (params.has('hltbMin')) {
    partial.hltbMinHours = parseNumber(params.get('hltbMin'), defaultFilters.hltbMinHours)
  }
  if (params.has('hltbMax')) {
    partial.hltbMaxHours = parseNumber(params.get('hltbMax'), defaultFilters.hltbMaxHours)
  }
  if (params.has('hltbUnknown')) {
    partial.includeUnknownHltb = parseBool(params.get('hltbUnknown'))
  }

  const types = params.get('types')
  if (types) {
    partial.gameTypes = types.split(',').map((t) => t.trim()).filter(Boolean)
  }

  const releaseAgePreset = params.get('release')
  if (releaseAgePreset && releaseAgePresets.has(releaseAgePreset as ReleaseAgePreset)) {
    partial.releaseAgePreset = releaseAgePreset as ReleaseAgePreset
  }
  if (params.has('relMin')) {
    partial.releaseMonthsMin = parseNumber(params.get('relMin'), defaultFilters.releaseMonthsMin)
  }
  if (params.has('relMax')) {
    partial.releaseMonthsMax = parseNumber(params.get('relMax'), defaultFilters.releaseMonthsMax)
  }

  const earlyAccess = params.get('early')
  if (earlyAccess && earlyAccessFilters.has(earlyAccess as EarlyAccessFilter)) {
    partial.earlyAccess = earlyAccess as EarlyAccessFilter
  }
  if (params.has('relUnknown')) {
    partial.includeUnknownRelease = parseBool(params.get('relUnknown'))
  }

  const steamReviewPreset = params.get('reviews')
  if (steamReviewPreset && steamReviewPresets.has(steamReviewPreset as SteamReviewPreset)) {
    partial.steamReviewPreset = steamReviewPreset as SteamReviewPreset
  }
  const reviewLabels = params.get('reviewLabels')
  if (reviewLabels) {
    partial.steamReviewLabels = reviewLabels.split(',').map((label) => label.trim()).filter(Boolean)
  }
  if (params.has('reviewNoUser')) {
    partial.excludeNoSteamReviews = parseBool(params.get('reviewNoUser'))
  }
  if (params.has('reviewUnknown')) {
    partial.includeUnknownSteamReviews = parseBool(params.get('reviewUnknown'))
  }

  return partial
}

export function filtersToSearchParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.search) {
    params.set('q', filters.search)
  }
  if (filters.playStatus !== defaultFilters.playStatus) {
    params.set('played', filters.playStatus)
  }
  if (filters.playtimeMinHours !== defaultFilters.playtimeMinHours) {
    params.set('ptMin', String(filters.playtimeMinHours))
  }
  if (filters.playtimeMaxHours !== defaultFilters.playtimeMaxHours) {
    params.set('ptMax', String(filters.playtimeMaxHours))
  }
  if (filters.lastPlayed !== defaultFilters.lastPlayed) {
    params.set('last', filters.lastPlayed)
  }
  if (filters.lastPlayedDays !== defaultFilters.lastPlayedDays) {
    params.set('lastDays', String(filters.lastPlayedDays))
  }
  if (filters.hltbMetric !== defaultFilters.hltbMetric) {
    params.set('hltb', filters.hltbMetric)
  }
  if (filters.hltbMinHours !== defaultFilters.hltbMinHours) {
    params.set('hltbMin', String(filters.hltbMinHours))
  }
  if (filters.hltbMaxHours !== defaultFilters.hltbMaxHours) {
    params.set('hltbMax', String(filters.hltbMaxHours))
  }
  if (filters.includeUnknownHltb !== defaultFilters.includeUnknownHltb) {
    params.set('hltbUnknown', filters.includeUnknownHltb ? '1' : '0')
  }
  if (filters.gameTypes.length > 0) {
    params.set('types', filters.gameTypes.join(','))
  }
  if (filters.releaseAgePreset !== defaultFilters.releaseAgePreset) {
    params.set('release', filters.releaseAgePreset)
  }
  if (filters.releaseMonthsMin !== defaultFilters.releaseMonthsMin) {
    params.set('relMin', String(filters.releaseMonthsMin))
  }
  if (filters.releaseMonthsMax !== defaultFilters.releaseMonthsMax) {
    params.set('relMax', String(filters.releaseMonthsMax))
  }
  if (filters.earlyAccess !== defaultFilters.earlyAccess) {
    params.set('early', filters.earlyAccess)
  }
  if (filters.includeUnknownRelease !== defaultFilters.includeUnknownRelease) {
    params.set('relUnknown', filters.includeUnknownRelease ? '1' : '0')
  }
  if (filters.steamReviewPreset !== defaultFilters.steamReviewPreset) {
    params.set('reviews', filters.steamReviewPreset)
  }
  if (filters.steamReviewLabels.length > 0) {
    params.set('reviewLabels', filters.steamReviewLabels.join(','))
  }
  if (filters.excludeNoSteamReviews !== defaultFilters.excludeNoSteamReviews) {
    params.set('reviewNoUser', filters.excludeNoSteamReviews ? '1' : '0')
  }
  if (filters.includeUnknownSteamReviews !== defaultFilters.includeUnknownSteamReviews) {
    params.set('reviewUnknown', filters.includeUnknownSteamReviews ? '1' : '0')
  }

  return params
}

export function loadInitialFilters(searchParams: URLSearchParams): FilterState {
  const fromUrl = filtersFromSearchParams(searchParams)
  const saved = loadSavedFilters()
  return { ...defaultFilters, ...saved, ...fromUrl }
}
