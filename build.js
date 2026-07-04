// Bundles src/<name>/index.js -> providers/<name>.js
// Lowers async/await to generators: Hermes can't run async fns in dynamically loaded code.
const esbuild = require("esbuild");

const name = process.argv[2] || "torlink";

esbuild.buildSync({
  entryPoints: [`src/${name}/index.js`],
  outfile: `providers/${name}.js`,
  bundle: true,
  format: "cjs",
  platform: "neutral",
  target: "es2018",
  supported: { "async-await": false, "async-generator": false },
  logLevel: "info",
});

console.log(`✅ providers/${name}.js`);
