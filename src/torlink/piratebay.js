const { fetchResilient, HttpError, USER_AGENT } = require("./net");
const { buildMagnet } = require("./magnet");

const API = "https://apibay.org";
const MOVIE_CATS = [201, 202, 207, 209];
const TV_CATS = [205, 208];

const ZERO_HASH = "0000000000000000000000000000000000000000";

function toResult(it, source) {
  const infoHash = (it.info_hash || "").toLowerCase();
  if (!infoHash || infoHash === ZERO_HASH || it.id === "0") return null;
  const name = it.name || "Unknown";
  return {
    infoHash,
    name,
    sizeBytes: Number(it.size) || 0,
    seeders: Number(it.seeders) || 0,
    leechers: Number(it.leechers) || 0,
    source,
    magnet: buildMagnet(infoHash, name),
  };
}

async function fetchItems(query) {
  const res = await fetchResilient(`${API}/q.php?q=${encodeURIComponent(query)}`, {
    headers: { "User-Agent": USER_AGENT },
    retries: 1,
  });
  if (!res.ok) throw new HttpError(res.status, `TPB returned ${res.status}`);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}

async function searchTpb(query, cats, source) {
  const items = await fetchItems(query);
  return items
    .filter((it) => cats.includes(Number(it.category)))
    .map((it) => toResult(it, source))
    .filter(Boolean);
}

const searchTpbMovies = (query) => searchTpb(query, MOVIE_CATS, "tpb-movies");
const searchTpbTv = (query) => searchTpb(query, TV_CATS, "tpb-tv");

module.exports = { searchTpbMovies, searchTpbTv };
