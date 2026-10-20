import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "server.js",
  "package.json",
  "README.md",
];

for (const file of requiredFiles) {
  const content = await readFile(path.join(root, file), "utf8");
  assert.ok(content.length > 0, `${file} must exist and not be empty`);
}

const html = await readFile(path.join(root, "index.html"), "utf8");
assert.match(html, /<title>S-IDE — Browser IDE<\/title>/);
assert.match(html, /class="app-shell"/);
assert.match(html, /id="code-editor"/);
assert.match(html, /id="terminal-panel"/);

console.log("Static build check passed.");
