export interface GameSteamReviews {
  score: number | null
  scoreLabel: string
  totalReviews: number
  totalPositive: number
  totalNegative: number
  positivePercent: number | null
}

export interface GameLinks {
  steamStore: string
  howLongToBeat: string | null
}

export interface GameCached {
  steamFetchedAt: number | null
  hltbFetchedAt: number | null
  storeFetchedAt: number | null
}

export interface GameHltb {
  mainStoryHours: number | null
  mainExtraHours: number | null
  completionistHours: number | null
  allStylesHours: number | null
  coopHours: number | null
  multiplayerHours: number | null
  gameType: string | null
  gameTypeLabel: string | null
  reviewScore: number | null
  releaseYear: number | null
  platforms: string[]
  matchSimilarity: number | null
  gameAlias?: string | null
}

export interface GameStore {
  shortDescription: string | null
  genres: string[]
  developers: string[]
  releaseDate?: string | null
  releaseTimestamp?: number | null
  earlyAccess?: boolean
}

export interface GameRelease {
  year: number | null
  month: number | null
  timestamp: number | null
  label: string | null
  earlyAccess: boolean
  source: 'steam' | 'hltb' | null
}

export interface GameImages {
  headerUrl: string
  hltbImageUrl: string | null
}

export interface Game {
  appId: number
  steamName: string
  hltbName: string | null
  hltbId: number | null
  links: GameLinks
  playtimeMinutes: number
  playtime2WeeksMinutes: number
  lastPlayedTimestamp: number
  cached: GameCached
  hltb: GameHltb | null
  store: GameStore | null
  release: GameRelease | null
  steamReviews: GameSteamReviews | null
  images: GameImages
}

export interface LibraryMeta {
  steamId: string
  libraryFetchedAt: number | null
  totalGames: number
  hiddenFiltered: number
  hiddenInLibrary?: number
  hiddenDetection?: string
  hiddenDebug?: HiddenGamesDebug | null
  showHiddenGames?: boolean
  syncComplete: boolean
  reviewsComplete?: boolean
  cachedReviews?: number
}

export interface HiddenGamesDebug {
  checkHiddenGames: boolean
  showHiddenGames: boolean
  detection: string
  detectionSource?: string | null
  steamInstallPath?: string | null
  localconfigPath?: string | null
  cloudStorageDir?: string | null
  cloudStorageFile?: string | null
  accountId?: number
  localconfigMessage?: string | null
  cloudStorageMessage?: string | null
  hiddenAppidsInConfig?: number
  hiddenAddedCount?: number
  hiddenRemovedCount?: number
  hiddenInLibrary?: number
  hiddenFiltered?: number
  libraryTotal?: number
  visibleTotal?: number
  hiddenAppidsSample?: number[]
  filteredGamesSample?: { appId: number; name: string }[]
  parseError?: string | null
  message?: string | null
  actionMessage?: string | null
}

export interface LibraryResponse {
  meta: LibraryMeta
  games: Game[]
}

export type HltbMetric = 'mainStoryHours' | 'mainExtraHours' | 'completionistHours'

export type PlayStatus = 'any' | 'unplayed' | 'played'

export type LastPlayedFilter = 'any' | 'never' | 'recent' | 'older'

export type ReleaseAgePreset = 'any' | 'last12months' | 'older12months' | 'older5years' | 'custom'

export type EarlyAccessFilter = 'any' | 'only' | 'exclude'

export type SteamReviewPreset =
  | 'any'
  | 'mostlyPositivePlus'
  | 'positivePlus'
  | 'veryPositivePlus'
  | 'overwhelminglyPositivePlus'
  | 'custom'

export interface FilterState {
  search: string
  playStatus: PlayStatus
  playtimeMinHours: number
  playtimeMaxHours: number
  lastPlayed: LastPlayedFilter
  lastPlayedDays: number
  hltbMetric: HltbMetric
  hltbMinHours: number
  hltbMaxHours: number
  includeUnknownHltb: boolean
  gameTypes: string[]
  releaseAgePreset: ReleaseAgePreset
  releaseMonthsMin: number
  releaseMonthsMax: number
  earlyAccess: EarlyAccessFilter
  includeUnknownRelease: boolean
  steamReviewPreset: SteamReviewPreset
  steamReviewLabels: string[]
  excludeNoSteamReviews: boolean
  includeUnknownSteamReviews: boolean
}

export const FILTER_STORAGE_KEY = 'hltbys_filters'

export const defaultFilters: FilterState = {
  search: '',
  playStatus: 'any',
  playtimeMinHours: 0,
  playtimeMaxHours: 99999,
  lastPlayed: 'any',
  lastPlayedDays: 90,
  hltbMetric: 'mainExtraHours',
  hltbMinHours: 0,
  hltbMaxHours: 99999,
  includeUnknownHltb: true,
  gameTypes: [],
  releaseAgePreset: 'any',
  releaseMonthsMin: 0,
  releaseMonthsMax: 600,
  earlyAccess: 'any',
  includeUnknownRelease: false,
  steamReviewPreset: 'any',
  steamReviewLabels: [],
  excludeNoSteamReviews: false,
  includeUnknownSteamReviews: false,
}
