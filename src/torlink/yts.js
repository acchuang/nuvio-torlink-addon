const { fetchResilient, HttpError, USER_AGENT, qs } = require("./net");
const { buildMagnet } = require("./magnet");

const HOSTS = ["yts.mx", "yts.am", "yts.rs"];

async function fetchMovies(query) {
  const params = qs({ limit: "50", query_term: query.trim() });
  let lastError;
  for (const host of HOSTS) {
    try {
      const res = await fetchResilient(`https://${host}/api/v2/list_movies.json?${params}`, {
        headers: { "User-Agent": USER_AGENT },
        retries: 1,
      });
      if (res.ok) return await res.json();
      lastError = new HttpError(res.status, `YTS ${host} returned ${res.status}`);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

async function searchYts(query) {
  const json = await fetchMovies(query);
  const out = [];
  const movies = (json.data && json.data.movies) || [];
  for (const movie of movies) {
    const base = movie.title_long || movie.title || "Unknown";
    for (const t of movie.torrents || []) {
      if (!t.hash) continue;
      const infoHash = t.hash.toLowerCase();
      const tag = [t.quality, t.type].filter(Boolean).join(" ");
      const name = tag ? `${base} [${tag}]` : base;
      out.push({
        infoHash,
        name,
        sizeBytes: t.size_bytes || 0,
        seeders: t.seeds || 0,
        leechers: t.peers || 0,
        source: "yts",
        magnet: buildMagnet(infoHash, name),
      });
    }
  }
  return out;
}

module.exports = { searchYts };
