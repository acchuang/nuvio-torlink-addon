# nuvio-torlink-addon

[Nuvio](https://github.com/NuvioMedia/NuvioMobile) provider that finds torrent streams for movies and TV shows. Port of [stremio-torlink-addon](https://github.com/acchuang/stremio-torlink-addon) — same sources, adapted for Nuvio's TMDB-based local-scraper system.

## Sources

| Type | Sources |
|------|---------|
| Movies | YTS, The Pirate Bay, 1337x, Bitsearch |
| TV Series | EZTV, The Pirate Bay, 1337x, Bitsearch |
| Anime (movie/TV) | Nyaa (auto-detected via TMDB language + genre) |

Results are deduplicated by info hash, filtered to seeded torrents, and sorted by seeders.

## Install in Nuvio

1. Open Nuvio → **Settings** → **Plugins**
2. Add this repository URL:
   ```
   https://raw.githubusercontent.com/acchuang/nuvio-torlink-addon/refs/heads/main
   ```
3. Refresh and enable **TorLink**.

Streams are returned as magnet links.

## Development

Requires Node.js 18+.

```bash
npm install
npm run build   # bundles src/torlink -> providers/torlink.js (async lowered for Hermes)
npm test        # runs the built provider against live sources
```

Source lives in `src/torlink/`; `providers/torlink.js` is the build artifact Nuvio loads — don't edit it by hand.

## How it works

Nuvio calls `getStreams(tmdbId, mediaType, season, episode)`. The provider:

1. Resolves the TMDB ID to title, year, and IMDB ID (`api.themoviedb.org`).
2. Queries IMDB-native APIs (YTS for movies, EZTV for TV) and title-based sources (TPB, 1337x, Bitsearch) in parallel. Japanese animation titles also search Nyaa.
3. Returns streams as `{ name, title, url (magnet), quality, size }`.
