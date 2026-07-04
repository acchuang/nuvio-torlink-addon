const { fetchResilient } = require("./net");

// Public TMDB key used across Nuvio community providers
const TMDB_API_KEY = "1865f43a0549ca50d341dd9ab8b29f49";
const ANIMATION_GENRE_ID = 16;

async function fetchMeta(tmdbId, mediaType) {
  try {
    const kind = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${kind}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
    const res = await fetchResilient(url, { retries: 1 });
    if (!res.ok) return null;
    const d = await res.json();
    const name = d.title || d.name;
    if (!name) return null;
    const date = d.release_date || d.first_air_date || "";
    const year = date ? Number(date.slice(0, 4)) : undefined;
    const imdbId = (d.external_ids && d.external_ids.imdb_id) || d.imdb_id || null;
    const isAnime =
      d.original_language === "ja" &&
      (d.genres || []).some((g) => g.id === ANIMATION_GENRE_ID);
    return { name, year, imdbId, isAnime };
  } catch (e) {
    return null;
  }
}

module.exports = { fetchMeta };
