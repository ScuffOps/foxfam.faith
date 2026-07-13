import Phaser from "phaser";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { STARFISHING_PHASES } from "@/games/starfishing/simulation/starfishingRules";

const COLORS = {
  sky: 0xd9e6ec,
  linen: 0xfaf3eb,
  ink: 0x485365,
  pond: 0x80adbc,
  pondLight: 0xb4c6dc,
  grass: 0xeaeee0,
  rose: 0xd5a1a3,
  gold: 0xdfd8ab,
  wood: 0xcab08b,
};

export default class StarfishingScene extends Phaser.Scene {
  constructor({ bridge } = {}) {
    super("StarfishingScene");
    this.bridge = bridge;
    this.lastPhase = "";
    this.line = null;
    this.bobber = null;
    this.shadow = null;
    this.reveal = null;
    this.ripples = [];
  }

  create() {
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.drawWorld();
    this.createFishingRig();
    this.createFamiliar();

    this.input.on("pointerdown", (pointer, gameObjects) => {
      if (gameObjects.length) return;
      this.bridge?.dispatch(GAME_ACTIONS.primary);
    });
  }

  drawWorld() {
    const { width, height } = this.scale;
    const centerX = width * 0.55;
    const centerY = height * 0.56;
    this.add.rectangle(width / 2, height / 2, width, height, COLORS.sky);

    const hills = this.add.graphics();
    hills.fillStyle(COLORS.linen, 1).lineStyle(3, COLORS.ink, 1);
    hills.fillTriangle(0, height * 0.48, width * 0.32, height * 0.16, width * 0.62, height * 0.48);
    hills.fillTriangle(width * 0.35, height * 0.48, width * 0.68, height * 0.12, width, height * 0.48);
    for (let index = 0; index < 12; index += 1) {
      const star = this.add.star(Phaser.Math.Between(20, width - 20), Phaser.Math.Between(18, height * 0.34), 4, 2, 5, COLORS.linen, 0.9);
      star.setStrokeStyle(1, COLORS.ink, 0.55);
      this.tweens.add({ targets: star, alpha: 0.35, yoyo: true, repeat: -1, duration: Phaser.Math.Between(1500, 2800) });
    }

    const ground = this.add.graphics();
    ground.fillStyle(COLORS.grass, 1).lineStyle(4, COLORS.ink, 1);
    ground.fillPoints([{ x: 0, y: height * 0.43 }, { x: width * 0.5, y: height * 0.28 }, { x: width, y: height * 0.47 }, { x: width * 0.48, y: height * 0.86 }], true);

    const pond = this.add.graphics();
    pond.fillStyle(COLORS.pond, 1).lineStyle(5, COLORS.ink, 1);
    pond.fillEllipse(centerX, centerY, width * 0.64, height * 0.43);
    pond.lineStyle(2, COLORS.linen, 0.72);
    pond.strokeEllipse(centerX, centerY - 3, width * 0.53, height * 0.32);
    pond.lineStyle(2, COLORS.pondLight, 0.65);
    pond.strokeEllipse(centerX, centerY - 5, width * 0.35, height * 0.19);

    const dock = this.add.graphics();
    dock.fillStyle(COLORS.wood, 1).lineStyle(4, COLORS.ink, 1);
    dock.fillPoints([
      { x: width * 0.04, y: height * 0.57 }, { x: width * 0.29, y: height * 0.47 },
      { x: width * 0.43, y: height * 0.61 }, { x: width * 0.18, y: height * 0.73 },
    ], true);
    for (let index = 0; index < 5; index += 1) {
      dock.lineStyle(2, COLORS.ink, 0.55);
      dock.lineBetween(width * (0.09 + index * 0.055), height * (0.575 + index * 0.006), width * (0.23 + index * 0.05), height * (0.69 - index * 0.014));
    }

    const plants = this.add.graphics();
    plants.lineStyle(4, COLORS.ink, 1).fillStyle(COLORS.rose, 1);
    for (const [x, y] of [[0.73, 0.42], [0.79, 0.46], [0.84, 0.43], [0.68, 0.75], [0.76, 0.77]]) {
      plants.lineBetween(width * x, height * (y + 0.08), width * x, height * y);
      plants.fillCircle(width * x, height * y, 7);
    }
  }

  createFishingRig() {
    const { width, height } = this.scale;
    const rodStart = { x: width * 0.24, y: height * 0.47 };
    const rodEnd = { x: width * 0.43, y: height * 0.35 };
    this.add.line(0, 0, rodStart.x, rodStart.y, rodEnd.x, rodEnd.y, COLORS.ink, 1).setLineWidth(7);
    this.line = this.add.line(0, 0, rodEnd.x, rodEnd.y, width * 0.6, height * 0.55, COLORS.linen, 0.95).setLineWidth(3);
    this.bobber = this.add.circle(width * 0.6, height * 0.55, 9, COLORS.gold, 1).setStrokeStyle(3, COLORS.ink, 1);
    this.shadow = this.add.ellipse(width * 0.66, height * 0.65, 74, 24, COLORS.ink, 0).setAngle(-12);
    this.reveal = this.add.star(width * 0.66, height * 0.61, 8, 26, 52, COLORS.gold, 0).setStrokeStyle(4, COLORS.ink, 1);
    this.ripples = [1, 2, 3].map((scale) => this.add.ellipse(this.bobber.x, this.bobber.y + 5, 24 * scale, 9 * scale, COLORS.linen, 0).setStrokeStyle(2, COLORS.linen, 0.55));
    this.tweens.add({ targets: this.bobber, y: this.bobber.y + 6, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.inOut" });
  }

  createFamiliar() {
    const { width, height } = this.scale;
    const x = width * 0.19;
    const y = height * 0.49;
    const familiar = this.add.container(x, y);
    const tail = this.add.ellipse(-29, 6, 38, 21, COLORS.rose).setAngle(22).setStrokeStyle(3, COLORS.ink);
    const body = this.add.ellipse(0, 6, 50, 45, COLORS.linen).setStrokeStyle(4, COLORS.ink);
    const head = this.add.circle(4, -23, 28, COLORS.linen).setStrokeStyle(4, COLORS.ink);
    const earLeft = this.add.triangle(-11, -44, 0, 18, 10, 0, 18, 19, COLORS.linen).setStrokeStyle(3, COLORS.ink);
    const earRight = this.add.triangle(18, -44, 0, 18, 10, 0, 18, 19, COLORS.linen).setStrokeStyle(3, COLORS.ink);
    const scarf = this.add.rectangle(2, 2, 35, 9, COLORS.rose).setAngle(-5).setStrokeStyle(2, COLORS.ink);
    const eyes = this.add.graphics().fillStyle(COLORS.ink, 1).fillCircle(-5, -25, 3).fillCircle(13, -25, 3);
    familiar.add([tail, body, head, earLeft, earRight, scarf, eyes]);
    this.tweens.add({ targets: familiar, y: y - 4, yoyo: true, repeat: -1, duration: 1800, ease: "Sine.inOut" });
  }

  update() {
    const state = this.bridge?.getState?.();
    if (!state) return;
    if (state.phase !== this.lastPhase) {
      this.lastPhase = state.phase;
      this.renderPhase(state.phase);
    }
    if (state.phase === STARFISHING_PHASES.qte) {
      const pulse = 0.45 + Math.sin(this.time.now / 85) * 0.18;
      this.shadow.setAlpha(pulse);
      this.line.setStrokeStyle(5, COLORS.rose, 1);
    }
  }

  renderPhase(phase) {
    this.shadow.setAlpha(0);
    this.reveal.setAlpha(0);
    this.ripples.forEach((ripple) => ripple.setAlpha(0));
    this.line.setStrokeStyle(3, COLORS.linen, 0.95);
    this.bobber.setFillStyle(COLORS.gold, 1);

    if (phase === STARFISHING_PHASES.waiting) {
      this.shadow.setAlpha(0.18);
      this.ripples.forEach((ripple, index) => ripple.setAlpha(0.16 - index * 0.03));
    } else if (phase === STARFISHING_PHASES.qte) {
      this.shadow.setAlpha(0.45);
      this.bobber.setFillStyle(COLORS.rose, 1);
      this.tweens.add({ targets: this.bobber, scale: 1.5, yoyo: true, duration: 160, repeat: 3 });
    } else if (phase === STARFISHING_PHASES.caught) {
      this.reveal.setAlpha(0.92);
      this.tweens.add({ targets: this.reveal, angle: 45, scale: 1.14, yoyo: true, duration: 420, repeat: 1 });
      this.cameras.main.flash(190, 250, 243, 235, false);
    } else if (phase === STARFISHING_PHASES.escaped) {
      this.bobber.setFillStyle(COLORS.pondLight, 1);
      this.cameras.main.shake(120, 0.0025);
    }
  }
}
