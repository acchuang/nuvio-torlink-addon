const { fetchResilient, HttpError, USER_AGENT, qs } = require("./net");
const { parseSize } = require("./format");
const { buildMagnet, unescapeEntities } = require("./magnet");

function tag(item, name) {
  const m = item.match(
    new RegExp(`<${name}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${name}>`, "s"),
  );
  return m ? m[1].trim() : "";
}

async function searchNyaa(query) {
  const params = qs({ page: "rss", q: query.trim(), c: "0_0", f: "0" });
  const res = await fetchResilient(`https://nyaa.si/?${params}`, {
    headers: { "User-Agent": USER_AGENT },
    retries: 1,
  });
  if (!res.ok) throw new HttpError(res.status, `Nyaa returned ${res.status}`);

  const xml = await res.text();
  const out = [];
  for (const item of xml.split("<item>").slice(1)) {
    const infoHash = tag(item, "nyaa:infoHash").toLowerCase();
    const name = unescapeEntities(tag(item, "title"));
    if (!infoHash || !name) continue;
    out.push({
      infoHash,
      name,
      sizeBytes: parseSize(tag(item, "nyaa:size")),
      seeders: Number(tag(item, "nyaa:seeders")) || 0,
      leechers: Number(tag(item, "nyaa:leechers")) || 0,
      source: "nyaa",
      magnet: buildMagnet(infoHash, name),
    });
  }
  return out;
}

module.exports = { searchNyaa };
