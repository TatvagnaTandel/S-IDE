import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "../server.js";

test("serves the IDE shell", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/`);
  const html = await response.text();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

  assert.equal(response.status, 200);
  assert.match(html, /S-IDE — Browser IDE/);
  assert.match(html, /Quick open/);
});

test("serves static assets with proper content types", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const cssResponse = await fetch(`http://127.0.0.1:${address.port}/styles.css`);
  const jsResponse = await fetch(`http://127.0.0.1:${address.port}/app.js`);
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

  assert.equal(cssResponse.status, 200);
  assert.ok(cssResponse.headers.get("content-type")?.includes("text/css"));
  assert.equal(jsResponse.status, 200);
  assert.ok(jsResponse.headers.get("content-type")?.includes("text/javascript"));
});

test("returns 404 for nonexistent files", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/not-found-page.html`);
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

  assert.equal(response.status, 404);
});

test("rejects unsupported HTTP methods with 405", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/`, { method: "POST" });
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));

  assert.equal(response.status, 405);
});
