import Phaser from "phaser";
import { STARFISHING_PHASES } from "@/games/starfishing/simulation/starfishingRules";

export default class StarfishingScene extends Phaser.Scene {
  constructor({ bridge } = {}) {
    super("StarfishingScene");
    this.bridge = bridge;
    this.bobber = null;
    this.line = null;
    this.fishGlow = null;
    this.lastPhase = "";
  }

  create() {
    this.cameras.main.setBackgroundColor("#060a1c");

    const { width, height } = this.scale;
    this.add.rectangle(width / 2, height / 2, width, height, 0x070b1c);

    for (let index = 0; index < 90; index += 1) {
      const x = Phaser.Math.Between(12, width - 12);
      const y = Phaser.Math.Between(12, Math.floor(height * 0.58));
      const radius = Phaser.Math.FloatBetween(0.8, 2.3);
      const star = this.add.circle(x, y, radius, 0xbdefff, Phaser.Math.FloatBetween(0.35, 0.92));
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.2, 0.9),
        yoyo: true,
        repeat: -1,
        duration: Phaser.Math.Between(1200, 3200),
      });
    }

    this.add.ellipse(width / 2, height * 0.74, width * 0.78, height * 0.32, 0x13234d, 0.82);
    this.add.ellipse(width / 2, height * 0.72, width * 0.68, height * 0.23, 0x1b6f9d, 0.32);
    this.add.ellipse(width / 2, height * 0.71, width * 0.44, height * 0.13, 0x9ae6ff, 0.12);

    const dockX = width * 0.22;
    const dockY = height * 0.68;
    this.add.rectangle(dockX, dockY, width * 0.25, 20, 0x8b5b3e, 0.8).setAngle(-6);
    this.add.circle(dockX - 72, dockY - 18, 22, 0xf9d77e, 0.16);
    this.add.line(0, 0, dockX - 40, dockY - 34, dockX + 96, dockY - 92, 0xffd66e, 0.78).setLineWidth(4);

    this.line = this.add.line(0, 0, dockX + 96, dockY - 92, width * 0.58, height * 0.65, 0xbdefff, 0.72).setLineWidth(2);
    this.bobber = this.add.circle(width * 0.58, height * 0.65, 8, 0xffd66e, 1);
    this.fishGlow = this.add.circle(width * 0.62, height * 0.75, 28, 0x42ddff, 0);

    this.tweens.add({
      targets: this.bobber,
      y: this.bobber.y + 8,
      yoyo: true,
      repeat: -1,
      duration: 1300,
      ease: "Sine.inOut",
    });

    this.input.on("pointerdown", () => {
      this.bridge?.dispatch("cast");
    });
  }

  update() {
    const state = this.bridge?.getState?.();
    if (!state) return;

    if (state.phase !== this.lastPhase) {
      this.lastPhase = state.phase;
      this.renderPhase(state.phase);
    }

    if (state.phase === STARFISHING_PHASES.qte) {
      this.fishGlow.setAlpha(0.24 + Math.sin(this.time.now / 90) * 0.1);
      this.bobber.setFillStyle(0xff7fa9, 1);
    }
  }

  renderPhase(phase) {
    if (!this.bobber || !this.fishGlow) return;

    if (phase === STARFISHING_PHASES.waiting) {
      this.bobber.setFillStyle(0xffd66e, 1);
      this.fishGlow.setAlpha(0);
      return;
    }

    if (phase === STARFISHING_PHASES.qte) {
      this.fishGlow.setAlpha(0.3);
      this.tweens.add({
        targets: this.bobber,
        scaleX: 1.45,
        scaleY: 1.45,
        yoyo: true,
        duration: 180,
        repeat: 4,
      });
      return;
    }

    if (phase === STARFISHING_PHASES.caught) {
      this.bobber.setFillStyle(0x75e8a7, 1);
      this.fishGlow.setAlpha(0.48);
      this.cameras.main.flash(220, 117, 232, 167, false);
      return;
    }

    if (phase === STARFISHING_PHASES.escaped) {
      this.bobber.setFillStyle(0xa7b2c8, 1);
      this.fishGlow.setAlpha(0.05);
      this.cameras.main.shake(140, 0.004);
      return;
    }

    this.bobber.setFillStyle(0xffd66e, 1);
    this.fishGlow.setAlpha(0);
  }
}
