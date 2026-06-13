const SHOW_HIDDEN_KEY = 'hltbys_show_hidden_games'

export function loadShowHiddenGames(): boolean {
  try {
    return localStorage.getItem(SHOW_HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

export function saveShowHiddenGames(showHidden: boolean) {
  localStorage.setItem(SHOW_HIDDEN_KEY, showHidden ? '1' : '0')
}
