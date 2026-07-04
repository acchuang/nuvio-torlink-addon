const { fetchResilient, HttpError, USER_AGENT, qs } = require("./net");
const { buildMagnet } = require("./magnet");

const API = "https://bitsearch.eu/api/v1/search";
const MOVIE_CAT = 2;
const TV_CAT = 1;

function toResult(item, source) {
  const infoHash = (item.infohash || "").toLowerCase();
  if (!infoHash) return null;
  const name = item.title || "Unknown";
  return {
    infoHash,
    name,
    sizeBytes: item.size || 0,
    seeders: item.seeders || 0,
    leechers: item.leechers || 0,
    source,
    magnet: buildMagnet(infoHash, name),
  };
}

async function fetchItems(query) {
  const res = await fetchResilient(`${API}?${qs({ q: query.trim(), fuv: "true" })}`, {
    headers: { "User-Agent": USER_AGENT },
    retries: 1,
  });
  if (!res.ok) throw new HttpError(res.status, `Bitsearch returned ${res.status}`);
  const json = await res.json();
  return Array.isArray(json.results) ? json.results : [];
}

async function searchBitsearch(query, cat, source) {
  const items = await fetchItems(query);
  return items
    .filter((r) => r.category === cat)
    .map((r) => toResult(r, source))
    .filter(Boolean);
}

const searchBitsearchMovies = (query) => searchBitsearch(query, MOVIE_CAT, "bitsearch-movies");
const searchBitsearchTv = (query) => searchBitsearch(query, TV_CAT, "bitsearch-tv");

module.exports = { searchBitsearchMovies, searchBitsearchTv };
