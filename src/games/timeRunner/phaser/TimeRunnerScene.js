import Phaser from "phaser";
import { TIME_RUNNER_PHASES, TIME_RUNNER_POSTURES } from "@/games/timeRunner/simulation/timeRunnerRules";

const ROMAN_NUMERALS = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];

export default class TimeRunnerScene extends Phaser.Scene {
  constructor({ bridge } = {}) {
    super("TimeRunnerScene");
    this.bridge = bridge;
    this.staticGraphics = null;
    this.dynamicGraphics = null;
    this.numerals = [];
    this.lastSize = { width: 0, height: 0 };
  }

  create() {
    this.cameras.main.setBackgroundColor("#121426");
    this.staticGraphics = this.add.graphics();
    this.dynamicGraphics = this.add.graphics();
    this.drawStaticWorld();

    this.scale.on("resize", () => {
      this.drawStaticWorld();
    });

    this.input.on("pointerdown", () => {
      this.bridge?.dispatch("confirm");
    });
  }

  update() {
    const state = this.bridge?.getState?.();
    if (!state || !this.dynamicGraphics) return;

    const { width, height } = this.scale;
    if (width !== this.lastSize.width || height !== this.lastSize.height) {
      this.drawStaticWorld();
    }

    this.drawDynamicWorld(state);
  }

  drawStaticWorld() {
    if (!this.staticGraphics) return;

    const { width, height } = this.scale;
    this.lastSize = { width, height };
    this.staticGraphics.clear();
    this.numerals.forEach((text) => text.destroy());
    this.numerals = [];

    const graphics = this.staticGraphics;
    const clockX = width * 0.72;
    const clockY = height * 0.42;
    const clockRadius = Math.min(width, height) * 0.31;

    graphics.fillGradientStyle(0x171a32, 0x171a32, 0x2b2038, 0x2b2038, 1);
    graphics.fillRect(0, 0, width, height);

    for (let index = 0; index < 9; index += 1) {
      const x = width * (0.08 + index * 0.12);
      const top = height * (0.25 + (index % 3) * 0.04);
      graphics.fillStyle(index % 2 === 0 ? 0x242842 : 0x1e2339, 0.9);
      graphics.fillRoundedRect(x, top, width * 0.07, height * 0.58, 10);
      graphics.fillStyle(0xffd77d, 0.16);
      graphics.fillRect(x + 8, top + 22, width * 0.07 - 16, 8);
    }

    graphics.lineStyle(5, 0xffd77d, 0.24);
    graphics.strokeCircle(clockX, clockY, clockRadius);
    graphics.lineStyle(2, 0xfff3bd, 0.26);
    graphics.strokeCircle(clockX, clockY, clockRadius * 0.82);
    graphics.fillStyle(0xffe4a3, 0.08);
    graphics.fillCircle(clockX, clockY, clockRadius * 0.78);

    ROMAN_NUMERALS.forEach((numeral, index) => {
      const angle = Phaser.Math.DegToRad(index * 30 - 90);
      const text = this.add.text(
        clockX + Math.cos(angle) * clockRadius * 0.68,
        clockY + Math.sin(angle) * clockRadius * 0.68,
        numeral,
        {
          fontFamily: "Georgia, serif",
          fontSize: `${Math.max(14, Math.floor(clockRadius * 0.105))}px`,
          color: "#fff0bb",
          stroke: "#2a1839",
          strokeThickness: 3,
        },
      );
      text.setOrigin(0.5);
      text.setAlpha(0.82);
      this.numerals.push(text);
    });

    graphics.fillStyle(0x111421, 0.94);
    graphics.fillRect(0, height * 0.78, width, height * 0.22);
    graphics.fillStyle(0x2f314f, 1);
    graphics.fillRoundedRect(width * 0.04, height * 0.76, width * 0.92, 16, 8);
    graphics.fillStyle(0xffd77d, 0.22);
    for (let index = 0; index < 18; index += 1) {
      const x = width * 0.05 + index * width * 0.055;
      graphics.fillCircle(x, height * 0.785, 3);
    }
  }

  drawDynamicWorld(state) {
    const graphics = this.dynamicGraphics;
    const { width, height } = this.scale;
    const groundY = height * 0.735;
    const runnerX = width * 0.18;

    graphics.clear();
    this.drawClockHands(graphics, state, width, height);
    state.hazards.forEach((hazard) => this.drawHazard(graphics, hazard, width, groundY));
    this.drawRunner(graphics, state, runnerX, groundY);
    this.drawProgressRibbon(graphics, state, width, height);
  }

  drawClockHands(graphics, state, width, height) {
    const clockX = width * 0.72;
    const clockY = height * 0.42;
    const elapsedRatio = Math.max(0, Math.min(1, state.elapsedMs / 45000));
    const minuteAngle = elapsedRatio * Math.PI * 4 - Math.PI / 2;
    const hourAngle = elapsedRatio * Math.PI * 0.75 - Math.PI / 2;

    graphics.lineStyle(8, 0xf7c66f, 0.48);
    graphics.lineBetween(
      clockX,
      clockY,
      clockX + Math.cos(minuteAngle) * width * 0.16,
      clockY + Math.sin(minuteAngle) * width * 0.16,
    );
    graphics.lineStyle(11, 0xff8fac, 0.33);
    graphics.lineBetween(
      clockX,
      clockY,
      clockX + Math.cos(hourAngle) * width * 0.1,
      clockY + Math.sin(hourAngle) * width * 0.1,
    );
    graphics.fillStyle(0xfff0bb, 0.9);
    graphics.fillCircle(clockX, clockY, 9);
  }

  drawRunner(graphics, state, x, groundY) {
    const isJumping = state.posture === TIME_RUNNER_POSTURES.jump;
    const isDucking = state.posture === TIME_RUNNER_POSTURES.duck;
    const isFocus = state.posture === TIME_RUNNER_POSTURES.focus;
    const bob = Math.sin(this.time.now / 110) * 3;
    const y = groundY - (isJumping ? 74 : isDucking ? 20 : 45) + bob;
    const bodyHeight = isDucking ? 30 : 48;

    if (isFocus) {
      graphics.fillStyle(0xaee8ff, 0.18);
      graphics.fillCircle(x, y + 12, 48);
      graphics.lineStyle(3, 0xaee8ff, 0.42);
      graphics.strokeCircle(x, y + 12, 58 + Math.sin(this.time.now / 70) * 5);
    }

    graphics.fillStyle(0xff8fac, 1);
    graphics.fillRoundedRect(x - 18, y - bodyHeight * 0.2, 36, bodyHeight, 14);
    graphics.fillStyle(0x2a1839, 1);
    graphics.fillCircle(x, y - bodyHeight * 0.38, 19);
    graphics.fillStyle(0xffd7c8, 1);
    graphics.fillCircle(x + 3, y - bodyHeight * 0.42, 15);
    graphics.fillStyle(0x5b345f, 1);
    graphics.fillTriangle(x - 19, y - 28, x + 7, y - 44, x + 23, y - 27);
    graphics.fillStyle(0xfff0bb, 1);
    graphics.fillCircle(x + 8, y - bodyHeight * 0.45, 2.3);
    graphics.fillStyle(0x6bd6ff, 1);
    graphics.fillRoundedRect(x - 10, y + bodyHeight * 0.52, 20, 9, 5);
    graphics.lineStyle(4, 0xf7c66f, 1);
    graphics.lineBetween(x - 24, y + 4, x - 44, y + (isDucking ? 9 : 22));
    graphics.lineBetween(x + 24, y + 4, x + 44, y + (isJumping ? -14 : 14));
    graphics.lineStyle(5, 0x2a1839, 1);
    graphics.lineBetween(x - 10, y + bodyHeight * 0.78, x - 26, groundY + 3);
    graphics.lineBetween(x + 10, y + bodyHeight * 0.78, x + 24, groundY + (isJumping ? -10 : 3));
    graphics.fillStyle(0xfff0bb, 0.9);
    graphics.fillCircle(x - 24, y + 13, 7);
    graphics.lineStyle(2, 0x2a1839, 0.9);
    graphics.strokeCircle(x - 24, y + 13, 7);
  }

  drawHazard(graphics, hazard, width, groundY) {
    const x = width * (hazard.x / 100);
    if (hazard.kind === "hand-sweep") {
      graphics.lineStyle(10, 0xf7c66f, 0.86);
      graphics.lineBetween(x - 38, groundY - 12, x + 50, groundY - 56);
      graphics.fillStyle(0xfff0bb, 0.92);
      graphics.fillCircle(x + 50, groundY - 56, 10);
      graphics.fillStyle(0xff8fac, 0.22);
      graphics.fillCircle(x + 4, groundY - 34, 52);
      return;
    }

    if (hazard.kind === "roman-gate") {
      graphics.fillStyle(0x2a1839, 0.88);
      graphics.fillRoundedRect(x - 25, groundY - 106, 50, 92, 16);
      graphics.fillStyle(0xfff0bb, 0.94);
      graphics.fillRoundedRect(x - 17, groundY - 92, 34, 18, 8);
      graphics.lineStyle(4, 0xffd77d, 0.65);
      graphics.strokeRoundedRect(x - 25, groundY - 106, 50, 92, 16);
      return;
    }

    graphics.fillStyle(0x8be9ff, 0.82);
    graphics.fillTriangle(x, groundY - 92, x + 18, groundY - 52, x - 16, groundY - 45);
    graphics.fillStyle(0xfff0bb, 0.82);
    graphics.fillTriangle(x - 4, groundY - 82, x + 10, groundY - 55, x - 8, groundY - 56);
    graphics.lineStyle(2, 0x2a1839, 0.7);
    graphics.strokeTriangle(x, groundY - 92, x + 18, groundY - 52, x - 16, groundY - 45);
  }

  drawProgressRibbon(graphics, state, width, height) {
    const ratio = state.phase === TIME_RUNNER_PHASES.ready
      ? 0
      : Math.max(0, Math.min(1, state.elapsedMs / 45000));

    graphics.fillStyle(0x080a14, 0.62);
    graphics.fillRoundedRect(width * 0.06, height * 0.055, width * 0.35, 14, 7);
    graphics.fillStyle(0xffd77d, 0.88);
    graphics.fillRoundedRect(width * 0.06, height * 0.055, width * 0.35 * ratio, 14, 7);
  }
}
