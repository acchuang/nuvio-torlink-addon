const { fetchMeta } = require("./meta");
const { formatBytes } = require("./format");
const { searchYts } = require("./yts");
const { searchEztv } = require("./eztv");
const { searchTpbMovies, searchTpbTv } = require("./piratebay");
const { searchX1337Movies, searchX1337Tv } = require("./x1337");
const { searchBitsearchMovies, searchBitsearchTv } = require("./bitsearch");
const { searchNyaa } = require("./nyaa");

const PROVIDER_NAME = "TorLink";
const MAX_STREAMS = 40;

const SOURCE_LABELS = {
  yts: "YTS",
  eztv: "EZTV",
  "tpb-movies": "TPB",
  "tpb-tv": "TPB",
  "x1337-movies": "1337x",
  "x1337-tv": "1337x",
  "bitsearch-movies": "Bitsearch",
  "bitsearch-tv": "Bitsearch",
  nyaa: "Nyaa",
};

function dedup(results) {
  const seen = {};
  return results.filter((r) => {
    if (!r.infoHash || seen[r.infoHash]) return false;
    seen[r.infoHash] = true;
    return true;
  });
}

function detectQuality(name) {
  const n = name.toUpperCase();
  if (/\b(2160P|4K|UHD)\b/.test(n)) return "2160p";
  if (n.indexOf("1080P") >= 0) return "1080p";
  if (n.indexOf("720P") >= 0) return "720p";
  if (n.indexOf("480P") >= 0) return "480p";
  return "Unknown";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

async function getStreams(tmdbId, mediaType, season, episode) {
  try {
    const meta = await fetchMeta(tmdbId, mediaType);
    if (!meta) {
      console.log(`[${PROVIDER_NAME}] No TMDB meta for ${mediaType}/${tmdbId}`);
      return [];
    }

    const baseQuery = meta.year ? `${meta.name} ${meta.year}` : meta.name;
    const episodeQuery =
      season != null && episode != null
        ? `${meta.name} S${pad2(season)}E${pad2(episode)}`
        : baseQuery;

    const searches = [];
    if (mediaType === "tv") {
      if (meta.imdbId) searches.push(searchEztv(meta.imdbId, season, episode));
      searches.push(
        searchTpbTv(episodeQuery),
        searchX1337Tv(episodeQuery),
        searchBitsearchTv(episodeQuery),
      );
      if (meta.isAnime) searches.push(searchNyaa(episodeQuery));
    } else {
      if (meta.imdbId) searches.push(searchYts(meta.imdbId));
      searches.push(
        searchTpbMovies(baseQuery),
        searchX1337Movies(baseQuery),
        searchBitsearchMovies(baseQuery),
      );
      if (meta.isAnime) searches.push(searchNyaa(baseQuery));
    }

    const settled = await Promise.all(
      searches.map((p) =>
        p.catch((e) => {
          console.log(`[${PROVIDER_NAME}] source failed: ${e && e.message}`);
          return [];
        }),
      ),
    );

    const all = dedup([].concat.apply([], settled))
      .filter((r) => r.seeders > 0)
      .sort((a, b) => b.seeders - a.seeders)
      .slice(0, MAX_STREAMS);

    console.log(`[${PROVIDER_NAME}] ${all.length} streams for "${baseQuery}"`);

    return all.map((r) => ({
      name: PROVIDER_NAME,
      title: [
        r.name,
        `👥 ${r.seeders} seeds · ${formatBytes(r.sizeBytes)} · ${SOURCE_LABELS[r.source] || r.source}`,
      ].join("\n"),
      url: r.magnet,
      quality: detectQuality(r.name),
      size: r.sizeBytes || undefined,
    }));
  } catch (e) {
    console.error(`[${PROVIDER_NAME}] Error: ${e && e.message}`);
    return [];
  }
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { getStreams };
} else {
  global.getStreams = getStreams;
}
