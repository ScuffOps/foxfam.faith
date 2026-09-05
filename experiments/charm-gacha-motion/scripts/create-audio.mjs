import { writeFile, mkdir } from "node:fs/promises";
// Original synthesized motif: soft clock ticks, rising fifths, held breath,
// then a three-note bell signature. No samples or third-party music.
const rate = 22050;
for (const [family, reveal, seconds] of [
  ["ordinary", 3.4, 7],
  ["epic", 4.2, 8],
  ["mythic", 5, 9],
]) {
  const data = new Float64Array(seconds * rate);
  function tone(at, length, hz, volume, bell = false) {
    for (
      let j = 0;
      j < length * rate && Math.floor(at * rate) + j < data.length;
      j++
    ) {
      const t = j / rate;
      const envelope =
        Math.min(1, t / 0.012) *
        Math.exp(-t * (bell ? 3 : 8)) *
        Math.min(1, (length - t) / 0.04);
      const wave =
        Math.sin(t * hz * Math.PI * 2) +
        (bell ? 0.22 * Math.sin(t * hz * 4.01 * Math.PI) : 0);
      data[Math.floor(at * rate) + j] += wave * envelope * volume;
    }
  }
  tone(0, 0.2, 150, 0.18);
  for (
    let at = 0.18, index = 0;
    at < reveal - 0.5;
    at += Math.max(0.1, 0.35 - index * 0.02), index++
  )
    tone(at, 0.05, index % 2 ? 1100 : 850, 0.055);
  const rise =
    family === "mythic"
      ? [261.63, 392, 523.25, 783.99, 1046.5]
      : [261.63, 392, 523.25];
  rise.forEach((hz, i) => tone(0.55 + i * 0.42, 0.7, hz, 0.07, true));
  [523.25, 659.25, 783.99].forEach((hz, i) =>
    tone(reveal + i * 0.13, 1.6, hz, 0.15, true),
  );
  if (family === "epic") tone(reveal + 0.5, 2, 1046.5, 0.075, true);
  if (family === "mythic")
    [261.63, 392, 1046.5, 1567.98].forEach((hz, i) =>
      tone(reveal + 0.4 + i * 0.12, 2.8, hz, 0.065, true),
    );
  const wav = Buffer.alloc(44 + data.length * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24);
  wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++)
    wav.writeInt16LE(
      Math.round(Math.max(-0.9, Math.min(0.9, data[i])) * 32767),
      44 + i * 2,
    );
  await mkdir("public/audio", { recursive: true });
  await writeFile(`public/audio/${family}.wav`, wav);
}
