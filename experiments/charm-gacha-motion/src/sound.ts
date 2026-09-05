export class PullSound {
  private context?: AudioContext;
  private source?: AudioBufferSourceNode;
  private buffers = new Map<string, AudioBuffer>();
  private generation = 0;
  async unlock() {
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") await this.context.resume();
  }
  async play(family: string) {
    this.stop();
    const generation = this.generation;
    const ctx = this.context;
    if (!ctx || ctx.state !== "running")
      throw new Error("Audio is unavailable.");
    let buffer = this.buffers.get(family);
    if (!buffer) {
      const response = await fetch(`/audio/${family}.wav`);
      if (!response.ok) throw new Error("Audio could not be loaded.");
      buffer = await ctx.decodeAudioData(await response.arrayBuffer());
      this.buffers.set(family, buffer);
    }
    if (generation !== this.generation) return;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = 0.4;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(ctx.destination);
    this.source = source;
    source.start();
  }
  stop() {
    this.generation++;
    this.source?.stop();
    this.source = undefined;
  }
  dispose() {
    this.stop();
    void this.context?.close();
  }
}
