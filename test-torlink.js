// Runs the built provider (what Nuvio actually loads) against live sources.
const assert = require("assert");
const { getStreams } = require("./providers/torlink.js");

function show(streams, n) {
  for (const s of streams.slice(0, n)) {
    console.log(`  - [${s.quality}] ${s.title.replace(/\n/g, " | ")}`);
  }
}

async function main() {
  console.log("Movie: Oppenheimer (tmdb 872585)");
  const movie = await getStreams("872585", "movie", null, null);
  console.log(`  ${movie.length} streams`);
  assert(movie.length > 0, "expected movie streams");
  assert(movie[0].name === "TorLink");
  assert(movie[0].url.indexOf("magnet:?xt=urn:btih:") === 0, "expected magnet url");
  assert(movie[0].title.indexOf("seeds") >= 0, "expected seeds in title");
  show(movie, 3);

  console.log("TV: Breaking Bad S01E01 (tmdb 1396)");
  const tv = await getStreams("1396", "tv", 1, 1);
  console.log(`  ${tv.length} streams`);
  assert(tv.length > 0, "expected tv streams");
  assert(tv[0].url.indexOf("magnet:?xt=urn:btih:") === 0, "expected magnet url");
  show(tv, 3);

  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
