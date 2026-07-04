const { fetchResilient, HttpError, USER_AGENT } = require("./net");
const { parseSize } = require("./format");
const { unescapeEntities } = require("./magnet");

const HOSTS = ["1337x.to", "1337x.st", "x1337x.ws", "1337xx.to"];
const MAX_DETAILS = 6;

function parseRows(html) {
  const start = html.indexOf("table-list");
  if (start < 0) return [];
  const out = [];
  for (const tr of html.slice(start).split(/<tr[\s>]/i).slice(1)) {
    const link = tr.match(/href="(\/torrent\/[^"]+)"[^>]*>([^<]+)<\/a>/i);
    if (!link) continue;
    const sizeMatch = tr.match(/class="coll-4 size[^"]*">\s*([\d.]+\s*[KMGT]i?B)/i);
    const seedMatch = tr.match(/class="coll-2 seeds[^"]*">\s*(\d+)/i);
    const leechMatch = tr.match(/class="coll-3 leeches[^"]*">\s*(\d+)/i);
    out.push({
      name: unescapeEntities(link[2].trim()),
      path: link[1],
      seeders: Number(seedMatch ? seedMatch[1] : 0),
      leechers: Number(leechMatch ? leechMatch[1] : 0),
      sizeBytes: parseSize(sizeMatch ? sizeMatch[1] : ""),
    });
  }
  return out;
}

async function fetchText(url, retries) {
  const res = await fetchResilient(url, {
    headers: { "User-Agent": USER_AGENT },
    retries,
  });
  if (!res.ok) throw new HttpError(res.status, `1337x returned ${res.status}`);
  return res.text();
}

async function detailMagnet(base, path) {
  try {
    const html = await fetchText(`${base}${path}`, 1);
    const raw = html.match(/magnet:\?xt=urn:btih:[^"'<>\s]+/i);
    return raw ? unescapeEntities(raw[0]) : null;
  } catch (e) {
    return null;
  }
}

const STOP = ["the", "a", "an", "of", "and", "or", "to"];

async function search(query, cat, source) {
  const q = query.trim();
  const path = q
    ? `/category-search/${encodeURIComponent(q).replace(/%20/g, "+")}/${cat}/1/`
    : `/popular-${cat === "Movies" ? "movies" : "tv"}`;

  let base = "";
  let html = "";
  let lastError;
  for (const host of HOSTS) {
    try {
      const candidate = `https://${host}`;
      html = await fetchText(`${candidate}${path}`, 1);
      base = candidate;
      break;
    } catch (e) {
      lastError = e;
    }
  }
  if (!base) throw lastError || new Error("1337x unreachable");

  // Require ALL meaningful query tokens to appear in the result name
  const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
  const need = tokens.filter((t) => !STOP.includes(t));

  const rows = parseRows(html)
    .filter((r) => {
      if (!need.length) return true;
      const n = r.name.toLowerCase();
      return need.every((t) => {
        if (n.includes(t)) return true;
        // SxxExx ↔ Nx0E alternate episode notation (e.g. "s03e07" ↔ "3x07")
        const ep = t.match(/^s(\d+)e(\d+)$/);
        if (ep) return new RegExp(`${parseInt(ep[1], 10)}x${ep[2]}`, "i").test(n);
        return false;
      });
    })
    .sort((a, b) => b.seeders - a.seeders)
    .slice(0, MAX_DETAILS);

  const settled = await Promise.all(
    rows.map(async (row) => {
      const magnet = await detailMagnet(base, row.path);
      const hashMatch = magnet && magnet.match(/urn:btih:([a-zA-Z0-9]+)/i);
      if (!magnet || !hashMatch) return null;
      return {
        infoHash: hashMatch[1].toLowerCase(),
        name: row.name,
        sizeBytes: row.sizeBytes,
        seeders: row.seeders,
        leechers: row.leechers,
        source,
        magnet,
      };
    }),
  );
  return settled.filter(Boolean);
}

const searchX1337Movies = (query) => search(query, "Movies", "x1337-movies");
const searchX1337Tv = (query) => search(query, "TV", "x1337-tv");

module.exports = { searchX1337Movies, searchX1337Tv };
