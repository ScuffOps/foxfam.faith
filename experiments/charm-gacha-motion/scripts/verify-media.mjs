import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const platform = `compositor-${process.platform}-${process.arch}`;
const packageDir = readdirSync("node_modules/.pnpm").find((name) =>
  name.startsWith(`@remotion+${platform}@`),
);
assert(packageDir, "Remotion compositor package is required");
const bin = path.resolve(
  "node_modules/.pnpm",
  packageDir,
  "node_modules/@remotion",
  platform,
);
const env = { ...process.env, DYLD_LIBRARY_PATH: bin, LD_LIBRARY_PATH: bin };
for (const [name, seconds] of [
  ["ordinary", 7],
  ["four-star", 8],
  ["five-star", 9],
]) {
  const file = `out/${name}.webm`;
  const probe = JSON.parse(
    execFileSync(
      path.join(bin, "ffprobe"),
      ["-v", "error", "-show_streams", "-show_format", "-of", "json", file],
      { encoding: "utf8", env },
    ),
  );
  const video = probe.streams.find((stream) => stream.codec_type === "video");
  const audio = probe.streams.find((stream) => stream.codec_type === "audio");
  assert.equal(video.codec_name, "vp9");
  assert.equal(video.tags.alpha_mode, "1");
  assert.equal(video.width, 1500);
  assert.equal(video.height, 1050);
  assert(audio);
  assert(Math.abs(Number(probe.format.duration) - seconds) < 0.15);
  console.log(
    JSON.stringify({
      file,
      codec: video.codec_name,
      audio: audio.codec_name,
      seconds: Number(probe.format.duration),
      alphaTag: video.tags.alpha_mode,
    }),
  );
}
// Decode through the same browser path used by web overlays. A container alpha
// tag alone is not proof that transparent/nonblank pixels survived encoding.
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:5193/");
  for (const name of ["ordinary", "four-star", "five-star"]) {
    const pixels = await page.evaluate(async (name) => {
      const video = document.createElement("video");
      video.muted = true;
      video.src = `/out/${name}.webm`;
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });
      const seek = new Promise((resolve) => {
        video.onseeked = resolve;
      });
      video.currentTime = 2;
      await seek;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0,
        opaque = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] === 0) transparent++;
        if (data[i] > 240) opaque++;
      }
      video.removeAttribute("src");
      video.load();
      return {
        transparentPercent: Math.round((transparent / (data.length / 4)) * 100),
        opaquePixels: opaque,
      };
    }, name);
    assert(pixels.transparentPercent > 70);
    assert(pixels.opaquePixels > 1000);
    console.log(name, pixels);
  }
} finally {
  await browser.close();
}
for (const family of ["ordinary", "epic", "mythic"]) {
  const wav = readFileSync(`public/audio/${family}.wav`);
  let peak = 0;
  for (let i = 44; i < wav.length; i += 2)
    peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
  assert(peak > 1000 && peak < 30000);
  console.log(`${family} WAV peak ${peak}/32767`);
}
