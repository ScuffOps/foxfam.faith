import Phaser from "phaser";
import { TIME_RUNNER_PHASES, TIME_RUNNER_POSTURES } from "@/games/timeRunner/simulation/timeRunnerRules";

const COLORS = {
  linen: 0xfaf3eb,
  blue: 0xd9e6ec,
  bell: 0xb4c6dc,
  teal: 0x80adbc,
  rose: 0xd5a1a3,
  gold: 0xdfd8ab,
  brass: 0xcab08b,
  green: 0xeaeee0,
  ink: 0x364152,
  outline: 0x485365,
};

const ROMAN_NUMERALS = ["XII", "III", "VI", "IX"];

export default class TimeRunnerScene extends Phaser.Scene {
  constructor({ bridge } = {}) {
    super("TimeRunnerScene");
    this.bridge = bridge;
    this.worldGraphics = null;
    this.actionGraphics = null;
    this.labels = [];
    this.landingButtons = new Map();
    this.lastSize = { width: 0, height: 0 };
  }

  create() {
    this.cameras.main.setBackgroundColor("#D9E6EC");
    this.worldGraphics = this.add.graphics();
    this.actionGraphics = this.add.graphics();
    this.drawWorld();
    this.scale.on("resize", () => this.drawWorld());
  }

  update() {
    const state = this.bridge?.getState?.();
    if (!state || !this.actionGraphics) return;
    const { width, height } = this.scale;
    if (width !== this.lastSize.width || height !== this.lastSize.height) this.drawWorld();
    this.syncLandingButtons(state);
    this.drawActionLayer(state);
  }

  drawWorld() {
    const { width, height } = this.scale;
    this.lastSize = { width, height };
    this.worldGraphics.clear();
    this.labels.forEach((label) => label.destroy());
    this.labels = [];
    const g = this.worldGraphics;

    g.fillStyle(COLORS.blue, 1).fillRect(0, 0, width, height);
    g.fillStyle(COLORS.linen, 0.72).fillCircle(width * 0.78, height * 0.18, Math.min(width, height) * 0.34);
    g.lineStyle(3, COLORS.outline, 0.18);
    for (let x = -80; x < width + 100; x += 96) g.lineBetween(x, 0, x + 210, height);

    this.drawClockFace(g, width * 0.78, height * 0.28, Math.min(width, height) * 0.23);
    this.drawTower(g, width, height);
    this.drawRoute(g, width, height);
  }

  drawClockFace(g, cx, cy, radius) {
    g.fillStyle(COLORS.linen, 0.8).fillCircle(cx, cy, radius);
    g.lineStyle(5, COLORS.outline, 0.55).strokeCircle(cx, cy, radius);
    g.lineStyle(2, COLORS.brass, 0.8).strokeCircle(cx, cy, radius * 0.82);
    ROMAN_NUMERALS.forEach((numeral, index) => {
      const angle = index * (Math.PI / 2) - Math.PI / 2;
      const label = this.add.text(cx + Math.cos(angle) * radius * 0.68, cy + Math.sin(angle) * radius * 0.68, numeral, {
        fontFamily: "Georgia, serif", fontSize: `${Math.max(12, radius * 0.11)}px`, color: "#485365", fontStyle: "bold",
      }).setOrigin(0.5).setDepth(3);
      this.labels.push(label);
    });
  }

  drawTower(g, width, height) {
    const floorY = height * 0.82;
    g.fillStyle(COLORS.green, 1).fillTriangle(0, floorY - 15, width, floorY - 15, width, height);
    g.fillStyle(COLORS.brass, 0.5).fillRect(width * 0.05, height * 0.2, width * 0.07, floorY - height * 0.2);
    g.fillStyle(COLORS.rose, 0.5).fillRect(width * 0.88, height * 0.36, width * 0.07, floorY - height * 0.36);
    g.lineStyle(4, COLORS.outline, 0.7);
    g.lineBetween(width * 0.085, height * 0.2, width * 0.085, floorY);
    g.lineBetween(width * 0.915, height * 0.36, width * 0.915, floorY);
    [0.3, 0.56, 0.82].forEach((ratio, index) => {
      const x = width * ratio;
      const ropeTop = height * (0.12 + index * 0.05);
      const bobY = height * (0.48 + index * 0.05);
      g.lineStyle(4, COLORS.brass, 0.8).lineBetween(x, ropeTop, x, bobY);
      g.fillStyle(index % 2 ? COLORS.rose : COLORS.gold, 0.95).fillCircle(x, bobY, 17);
      g.lineStyle(3, COLORS.outline, 0.8).strokeCircle(x, bobY, 17);
    });
  }

  drawRoute(g, width, height) {
    const points = [
      [0.08, 0.75], [0.24, 0.67], [0.41, 0.75], [0.58, 0.62], [0.76, 0.72], [0.93, 0.61],
    ];
    points.forEach(([px, py], index) => {
      const x = width * px;
      const y = height * py;
      const platformWidth = Math.max(74, width * 0.12);
      const platformHeight = Math.max(22, height * 0.055);
      const color = [COLORS.gold, COLORS.bell, COLORS.rose][index % 3];
      g.fillStyle(COLORS.outline, 0.22).fillTriangle(x, y + 9, x + platformWidth / 2, y + platformHeight + 9, x - platformWidth / 2, y + platformHeight + 9);
      g.fillStyle(color, 1).fillTriangle(x, y, x + platformWidth / 2, y + platformHeight, x - platformWidth / 2, y + platformHeight);
      g.lineStyle(3, COLORS.outline, 0.8);
      g.lineBetween(x, y, x + platformWidth / 2, y + platformHeight);
      g.lineBetween(x + platformWidth / 2, y + platformHeight, x - platformWidth / 2, y + platformHeight);
      g.lineBetween(x - platformWidth / 2, y + platformHeight, x, y);
    });
  }

  syncLandingButtons(state) {
    const activeIds = new Set(state.phase === TIME_RUNNER_PHASES.running ? state.availableLandings.map((item) => item.id) : []);
    this.landingButtons.forEach((button, id) => {
      if (!activeIds.has(id)) {
        button.destroy();
        this.landingButtons.delete(id);
      }
    });
    state.availableLandings.forEach((landing, index) => {
      if (state.phase !== TIME_RUNNER_PHASES.running || this.landingButtons.has(landing.id)) return;
      const x = this.scale.width * (index === 0 ? 0.42 : 0.59);
      const y = this.scale.height * (index === 0 ? 0.63 : 0.51);
      const button = this.add.circle(x, y, 20, index === 0 ? COLORS.gold : COLORS.rose, 0.9)
        .setStrokeStyle(4, COLORS.outline, 0.9)
        .setDepth(20)
        .setInteractive({ useHandCursor: true })
        .setData("landingId", landing.id)
        .on("pointerdown", () => this.bridge?.dispatch("select-landing", { landingId: landing.id }))
        .on("pointerover", () => button.setScale(1.12))
        .on("pointerout", () => button.setScale(1));
      this.landingButtons.set(landing.id, button);
    });
  }

  drawActionLayer(state) {
    const g = this.actionGraphics;
    const { width, height } = this.scale;
    g.clear();
    this.drawHands(g, state, width, height);
    state.hazards.forEach((hazard) => this.drawHazard(g, hazard, width, height));
    this.drawFamiliar(g, state, width * 0.18, height * 0.66);
    const progress = state.phase === TIME_RUNNER_PHASES.ready ? 0 : Math.min(1, state.elapsedMs / 45000);
    g.fillStyle(COLORS.linen, 0.95).fillRoundedRect(width * 0.07, height * 0.06, width * 0.38, 16, 8);
    g.lineStyle(2, COLORS.outline, 0.7).strokeRoundedRect(width * 0.07, height * 0.06, width * 0.38, 16, 8);
    g.fillStyle(COLORS.teal, 1).fillRoundedRect(width * 0.07 + 3, height * 0.06 + 3, Math.max(1, (width * 0.38 - 6) * progress), 10, 5);
  }

  drawHands(g, state, width, height) {
    const cx = width * 0.78;
    const cy = height * 0.28;
    const ratio = Math.min(1, state.elapsedMs / 45000);
    const minuteAngle = ratio * Math.PI * 4 - Math.PI / 2;
    const hourAngle = ratio * Math.PI - Math.PI / 2;
    g.lineStyle(9, COLORS.brass, 0.9).lineBetween(cx, cy, cx + Math.cos(minuteAngle) * width * 0.15, cy + Math.sin(minuteAngle) * width * 0.15);
    g.lineStyle(12, COLORS.rose, 0.75).lineBetween(cx, cy, cx + Math.cos(hourAngle) * width * 0.09, cy + Math.sin(hourAngle) * width * 0.09);
    g.fillStyle(COLORS.outline, 1).fillCircle(cx, cy, 8);
  }

  drawFamiliar(g, state, x, baseY) {
    const jumping = state.posture === TIME_RUNNER_POSTURES.jump;
    const ducking = state.posture === TIME_RUNNER_POSTURES.duck;
    const focus = state.posture === TIME_RUNNER_POSTURES.focus;
    const y = baseY - (jumping ? 52 : ducking ? 4 : 20) + Math.sin(this.time.now / 130) * 2;
    if (focus) {
      g.fillStyle(COLORS.teal, 0.2).fillCircle(x, y, 48);
      g.lineStyle(3, COLORS.teal, 0.8).strokeCircle(x, y, 52);
    }
    g.fillStyle(COLORS.brass, 1).fillEllipse(x, y + 17, ducking ? 56 : 43, ducking ? 28 : 50);
    g.lineStyle(3, COLORS.outline, 1).strokeEllipse(x, y + 17, ducking ? 56 : 43, ducking ? 28 : 50);
    g.fillStyle(COLORS.linen, 1).fillCircle(x, y - 8, 24);
    g.lineStyle(3, COLORS.outline, 1).strokeCircle(x, y - 8, 24);
    g.fillStyle(COLORS.linen, 1).fillTriangle(x - 20, y - 23, x - 10, y - 45, x - 1, y - 25);
    g.fillTriangle(x + 2, y - 25, x + 12, y - 45, x + 21, y - 22);
    g.lineStyle(3, COLORS.outline, 1);
    g.lineBetween(x - 20, y - 23, x - 10, y - 45); g.lineBetween(x - 10, y - 45, x - 1, y - 25);
    g.lineBetween(x + 2, y - 25, x + 12, y - 45); g.lineBetween(x + 12, y - 45, x + 21, y - 22);
    g.fillStyle(COLORS.ink, 1).fillCircle(x - 8, y - 9, 2.5).fillCircle(x + 8, y - 9, 2.5);
    g.fillStyle(COLORS.rose, 1).fillTriangle(x - 3, y - 2, x + 3, y - 2, x, y + 2);
    g.fillStyle(COLORS.bell, 1).fillRoundedRect(x - 20, y + 6, 40, 12, 5);
    g.lineStyle(3, COLORS.outline, 1).strokeRoundedRect(x - 20, y + 6, 40, 12, 5);
  }

  drawHazard(g, hazard, width, height) {
    const x = width * (hazard.x / 100);
    const y = height * 0.74;
    if (hazard.kind === "hand-sweep") {
      g.lineStyle(10, COLORS.brass, 0.95).lineBetween(x - 38, y, x + 48, y - 38);
      g.fillStyle(COLORS.gold, 1).fillCircle(x + 48, y - 38, 9);
    } else if (hazard.kind === "roman-gate") {
      g.fillStyle(COLORS.rose, 0.9).fillRoundedRect(x - 27, y - 92, 54, 80, 7);
      g.lineStyle(4, COLORS.outline, 0.9).strokeRoundedRect(x - 27, y - 92, 54, 80, 7);
    } else {
      g.fillStyle(COLORS.teal, 1).fillTriangle(x, y - 82, x + 17, y - 45, x - 16, y - 42);
      g.lineStyle(3, COLORS.outline, 0.9).strokeTriangle(x, y - 82, x + 17, y - 45, x - 16, y - 42);
    }
  }
}
