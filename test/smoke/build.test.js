// Smoke test for the production build + asset pipeline. This is the closest
// cheap proxy for "will GitHub Pages serve a working site": it runs the real
// Vite build (if a dist isn't already present from a prior CI step) and asserts
// the emitted artifact has the entry HTML, hashed JS/CSS bundles, and every
// icon / share asset the <head> references — with the path-independent base so
// it works under the project sub-path on Pages.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const dist = join(root, "dist");

// self-contained: build once if CI hasn't already produced a dist
if (!existsSync(join(dist, "index.html"))) {
  execSync("npm run build", { cwd: root, stdio: "ignore" });
}

const html = readFileSync(join(dist, "index.html"), "utf8");

test("build emits the entry HTML with the app mount point and module script", () => {
  assert.match(html, /<div id="root">/);
  assert.match(html, /<script type="module"[^>]*src="\.\/assets\/index-[^"]+\.js"/);
});

test("build emits hashed JS and CSS bundles", () => {
  const assets = readdirSync(join(dist, "assets"));
  assert.ok(assets.some((f) => /^index-.*\.js$/.test(f)), "a hashed JS bundle");
  assert.ok(assets.some((f) => /^index-.*\.css$/.test(f)), "a hashed CSS bundle");
});

test("every icon / share asset referenced in <head> is present in dist", () => {
  for (const f of ["favicon.svg", "apple-touch-icon.png", "share.png"]) {
    assert.ok(existsSync(join(dist, f)), `dist/${f} missing`);
  }
});

test("head wires up the favicon, apple-touch icon and social card", () => {
  assert.match(html, /rel="icon"[^>]*href="\.\/favicon\.svg/);
  assert.match(html, /rel="apple-touch-icon"[^>]*href="\.\/apple-touch-icon\.png/);
  assert.match(html, /property="og:image"[^>]*content="https:\/\/[^"]*\/share\.png"/);
  assert.match(html, /name="twitter:card"[^>]*content="summary_large_image"/);
});

test("asset URLs are relative (base './') so the site works under the Pages sub-path", () => {
  assert.doesNotMatch(html, /src="\/assets\//, "JS must not be root-absolute");
  assert.doesNotMatch(html, /href="\/assets\//, "CSS must not be root-absolute");
});
