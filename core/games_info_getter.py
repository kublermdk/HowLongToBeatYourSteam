from .library_service import LibraryService


class GamesInfoGetter:
    iter_games_info = staticmethod(LibraryService.iter_sync)
