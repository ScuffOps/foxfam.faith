import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { deflateSync } from "node:zlib";
import { validateApprovedArtSlot, validateApprovedGameArt } from "./validate-game-art-assets.mjs";

const approvedSlot = (overrides = {}) => ({
  id: "quarters.room",
  approval: "approved",
  assetPath: "/assets/game-hub/environments/quarters-room.svg",
  aspect: "8:5",
  assetClass: "environment",
  ...overrides,
});

function fixturePublic() {
  const publicDir = mkdtempSync(join(tmpdir(), "foxfam-art-preflight-"));
  mkdirSync(join(publicDir, "assets/game-hub/environments"), { recursive: true });
  return publicDir;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(data.length + 12);
  chunk.writeUInt32BE(data.length, 0);
  typeBuffer.copy(chunk, 4);
  data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), data.length + 8);
  return chunk;
}

function makeRgbaPng({
  width = 3,
  height = 3,
  alphaAt = (x, y) => (x === 1 && y === 1 ? 255 : 0),
  rgbAt = () => [54, 64, 79],
} = {}) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    for (let x = 0; x < width; x += 1) {
      const offset = 1 + x * 4;
      const [red, green, blue] = rgbAt(x, y);
      row[offset] = red;
      row[offset + 1] = green;
      row[offset + 2] = blue;
      row[offset + 3] = alphaAt(x, y);
    }
    rows.push(row);
  }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(Buffer.concat(rows))),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function approvedCollectible(assetPath, payload) {
  const checkpoint = { state: "approved", by: "scuffox", at: "2026-08-13", evidence: "first-wave-render" };
  return {
    id: "shared.charm.starlit-bobber",
    kind: "charm",
    key: "starlit-bobber",
    artContract: "foxfam-asset-art-v1",
    approval: { concept: checkpoint, render: checkpoint, system: checkpoint },
    assetPath,
    sha256: createHash("sha256").update(payload).digest("hex"),
    aspect: "1:1",
    assetClass: "collectible",
  };
}

test("authored flat SVG art passes the approval preflight", () => {
  const publicDir = fixturePublic();
  writeFileSync(
    join(publicDir, "assets/game-hub/environments/quarters-room.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"><path fill="#f6eadc" d="M0 0h1600v1000H0z"/></svg>',
  );
  assert.equal(validateApprovedGameArt([approvedSlot()], publicDir), 1);
});

test("soft-rendering SVG techniques fail the Foxfam art preflight", () => {
  const publicDir = fixturePublic();
  writeFileSync(
    join(publicDir, "assets/game-hub/environments/quarters-room.svg"),
    '<svg viewBox="0 0 800 500"><style>.soft{opacity:.7}</style><rect class="soft" width="800" height="500" fill="#fff"/></svg>',
  );
  assert.throws(
    () => validateApprovedArtSlot(approvedSlot(), publicDir),
    /masks and embedded style blocks are forbidden/,
  );
});

test("environment palettes fail above the art bible's 18-color ceiling", () => {
  const publicDir = fixturePublic();
  const swatches = Array.from({ length: 19 }, (_, index) => {
    const color = `#${index.toString(16).padStart(6, "0")}`;
    return `<rect x="${index}" width="1" height="1" fill="${color}"/>`;
  }).join("");
  writeFileSync(
    join(publicDir, "assets/game-hub/environments/quarters-room.svg"),
    `<svg viewBox="0 0 800 500">${swatches}</svg>`,
  );
  assert.throws(
    () => validateApprovedArtSlot(approvedSlot(), publicDir),
    /environment art allows at most 18/,
  );
});

test("collectibles use the stricter 12-color small-icon ceiling", () => {
  const publicDir = fixturePublic();
  const swatches = Array.from({ length: 13 }, (_, index) => {
    const color = `#${index.toString(16).padStart(6, "0")}`;
    return `<rect x="${index}" width="1" height="1" fill="${color}"/>`;
  }).join("");
  writeFileSync(
    join(publicDir, "assets/game-hub/environments/quarters-room.svg"),
    `<svg viewBox="0 0 800 500">${swatches}</svg>`,
  );
  assert.throws(
    () => validateApprovedArtSlot(approvedSlot({ assetClass: "collectible" }), publicDir),
    /collectible art allows at most 12/,
  );
});

test("unapproved art remains outside the production validation boundary", () => {
  assert.deepEqual(validateApprovedArtSlot(approvedSlot({ approval: "awaiting-render-approval" }), fixturePublic()), { skipped: true });
});

test("unapproved exports cannot remain in the deployable public art tree", () => {
  const publicDir = fixturePublic();
  writeFileSync(
    join(publicDir, "assets/game-hub/environments/rejected-render.png"),
    Buffer.from("not-a-production-image"),
  );
  assert.throws(
    () => validateApprovedGameArt([], publicDir),
    /Unapproved game art is deployable under public/,
  );
});

test("fully approved collectible art joins the deployable approval boundary", () => {
  const publicDir = fixturePublic();
  const directory = join(publicDir, "assets/game-hub/collectibles/charms");
  mkdirSync(directory, { recursive: true });
  const source = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><path fill="#35404f" d="M24 24h80v80H24z"/></svg>';
  writeFileSync(join(directory, "starlit-bobber.svg"), source);
  const collectible = approvedCollectible("/assets/game-hub/collectibles/charms/starlit-bobber.svg", source);

  assert.equal(validateApprovedGameArt([], publicDir, [collectible]), 1);
  assert.throws(
    () => validateApprovedGameArt([], publicDir, [{ ...collectible, sha256: "f".repeat(64) }]),
    /checksum does not match/,
  );
  assert.throws(
    () => validateApprovedGameArt([], publicDir, [{
      ...collectible,
      assetPath: "/assets/game-hub/collectibles/charms/ascendant-anvil.svg",
    }]),
    /canonical key-specific collectible path/,
  );
});

test("collectible PNGs require real alpha and a fully transparent outer border", () => {
  const publicDir = fixturePublic();
  const directory = join(publicDir, "assets/game-hub/collectibles/charms");
  mkdirSync(directory, { recursive: true });
  const assetPath = "/assets/game-hub/collectibles/charms/starlit-bobber.png";

  const validPng = makeRgbaPng();
  writeFileSync(join(directory, "starlit-bobber.png"), validPng);
  assert.equal(validateApprovedGameArt([], publicDir, [approvedCollectible(assetPath, validPng)]), 1);

  const opaqueBorderPng = makeRgbaPng({ alphaAt: (x, y) => (x === 0 && y === 0 ? 255 : 0) });
  writeFileSync(join(directory, "starlit-bobber.png"), opaqueBorderPng);
  assert.throws(
    () => validateApprovedGameArt([], publicDir, [approvedCollectible(assetPath, opaqueBorderPng)]),
    /outer border contains 1 non-transparent pixels/,
  );

  const noTransparencyPng = makeRgbaPng({ alphaAt: () => 255 });
  writeFileSync(join(directory, "starlit-bobber.png"), noTransparencyPng);
  assert.throws(
    () => validateApprovedGameArt([], publicDir, [approvedCollectible(assetPath, noTransparencyPng)]),
    /alpha channel contains no transparent pixels/,
  );
});

test("collectible PNGs reject soft gradients while preserving flat cel fills", () => {
  const publicDir = fixturePublic();
  const directory = join(publicDir, "assets/game-hub/collectibles/charms");
  mkdirSync(directory, { recursive: true });
  const assetPath = "/assets/game-hub/collectibles/charms/starlit-bobber.png";
  const alphaAt = (x, y) => (x === 0 || y === 0 || x === 33 || y === 33 ? 0 : 255);

  const flatPng = makeRgbaPng({
    width: 34,
    height: 34,
    alphaAt,
    rgbAt: (x) => [[32, 54, 89], [169, 207, 221], [243, 207, 114]][x % 3],
  });
  writeFileSync(join(directory, "starlit-bobber.png"), flatPng);
  assert.equal(validateApprovedGameArt([], publicDir, [approvedCollectible(assetPath, flatPng)]), 1);

  const gradientPng = makeRgbaPng({
    width: 34,
    height: 34,
    alphaAt,
    rgbAt: (x) => {
      const value = Math.max(0, Math.min(255, (x - 1) * 8));
      return [value, value, value];
    },
  });
  writeFileSync(join(directory, "starlit-bobber.png"), gradientPng);
  assert.throws(
    () => validateApprovedGameArt([], publicDir, [approvedCollectible(assetPath, gradientPng)]),
    /soft or gradient rendering/,
  );
});

test("embedded raster, filters, gradients, and blend modes fail closed", () => {
  for (const forbidden of [
    '<linearGradient id="wash"/>',
    '<filter id="blur"/>',
    '<image href="data:image/png;base64,abc"/>',
    '<path style="mix-blend-mode:multiply"/>',
  ]) {
    const publicDir = fixturePublic();
    writeFileSync(
      join(publicDir, "assets/game-hub/environments/quarters-room.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000">${forbidden}</svg>`,
    );
    assert.throws(() => validateApprovedGameArt([approvedSlot()], publicDir), /forbidden/);
  }
});

test("wrong aspect ratios and paths outside the game-hub art root fail closed", () => {
  const publicDir = fixturePublic();
  writeFileSync(
    join(publicDir, "assets/game-hub/environments/quarters-room.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"/>',
  );
  assert.throws(() => validateApprovedGameArt([approvedSlot()], publicDir), /expected 8:5/);
  assert.throws(
    () => validateApprovedArtSlot(approvedSlot({ assetPath: "/assets/unreviewed.svg" }), publicDir),
    /under \/assets\/game-hub\//,
  );
});

test("game-hub traversal, encoded separators, fragments, and backslashes fail closed", () => {
  const publicDir = fixturePublic();
  mkdirSync(join(publicDir, "assets/outside"), { recursive: true });
  writeFileSync(
    join(publicDir, "assets/outside/quarters-room.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"/>',
  );

  for (const assetPath of [
    "/assets/game-hub/../outside/quarters-room.svg",
    "/assets/game-hub/%2e%2e/outside/quarters-room.svg",
    "/assets/game-hub/environments%2fquarters-room.svg",
    "/assets/game-hub/environments\\quarters-room.svg",
    "/assets/game-hub/environments/quarters-room.svg?raw=1",
    "/assets/game-hub/environments/quarters-room.svg#preview",
  ]) {
    assert.throws(
      () => validateApprovedArtSlot(approvedSlot({ assetPath }), publicDir),
      /unsafe asset path/,
      assetPath,
    );
  }
});

test("symlinked art cannot escape the canonical game-hub directory", () => {
  const publicDir = fixturePublic();
  const outsideDir = mkdtempSync(join(tmpdir(), "foxfam-art-outside-"));
  writeFileSync(
    join(outsideDir, "quarters-room.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"/>',
  );
  symlinkSync(outsideDir, join(publicDir, "assets/game-hub/external"));

  assert.throws(
    () => validateApprovedArtSlot(approvedSlot({ assetPath: "/assets/game-hub/external/quarters-room.svg" }), publicDir),
    /unsafe asset path/,
  );
});

test("malformed self-closing SVG art fails before deployment", () => {
  const publicDir = fixturePublic();
  writeFileSync(
    join(publicDir, "assets/game-hub/environments/quarters-room.svg"),
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"><path d="M0 0h1v1Z"/ fill="#fff6e8"></svg>',
  );
  assert.throws(() => validateApprovedGameArt([approvedSlot()], publicDir), /self-closing slash/);
});
