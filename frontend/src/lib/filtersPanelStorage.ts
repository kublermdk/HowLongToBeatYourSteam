const FILTERS_EXPANDED_KEY = 'hltbys_filters_expanded'

export function loadFiltersExpanded(): boolean {
  try {
    return localStorage.getItem(FILTERS_EXPANDED_KEY) !== '0'
  } catch {
    return true
  }
}

export function saveFiltersExpanded(expanded: boolean) {
  localStorage.setItem(FILTERS_EXPANDED_KEY, expanded ? '1' : '0')
}
