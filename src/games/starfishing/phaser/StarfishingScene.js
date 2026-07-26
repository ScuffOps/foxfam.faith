import Phaser from "phaser";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { DEFAULT_FAMILIAR, FAMILIAR_COATS } from "@/games/shared/familiar/familiarCatalog";
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

function phaserColor(hex, fallback) {
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) return fallback;
  return Number.parseInt(hex.slice(1), 16);
}

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
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
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
      if (!this.reducedMotion) this.tweens.add({ targets: star, alpha: 0.35, yoyo: true, repeat: -1, duration: Phaser.Math.Between(1500, 2800) });
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

    this.drawObservatoryProps();
    this.drawCelestialFish();
  }

  drawObservatoryProps() {
    const { width, height } = this.scale;
    const props = this.add.graphics();

    // Brass telescope on the observatory bank.
    props.lineStyle(4, COLORS.ink, 1).fillStyle(COLORS.gold, 1);
    props.fillPoints([
      { x: width * 0.75, y: height * 0.27 },
      { x: width * 0.91, y: height * 0.19 },
      { x: width * 0.93, y: height * 0.24 },
      { x: width * 0.78, y: height * 0.32 },
    ], true);
    props.fillStyle(COLORS.rose, 1).fillCircle(width * 0.92, height * 0.215, 12);
    props.lineBetween(width * 0.81, height * 0.3, width * 0.77, height * 0.42);
    props.lineBetween(width * 0.81, height * 0.3, width * 0.87, height * 0.42);

    // A low lantern keeps the pier readable without a glow filter.
    props.fillStyle(COLORS.ink, 1).fillRoundedRect(width * 0.35, height * 0.62, 32, 48, 7);
    props.fillStyle(COLORS.gold, 1).fillRoundedRect(width * 0.355, height * 0.635, 24, 28, 5);
    props.lineStyle(3, COLORS.ink, 1).strokeCircle(width * 0.372, height * 0.615, 10);

    const sign = this.add.container(width * 0.1, height * 0.35);
    const board = this.add.rectangle(0, 0, 112, 36, COLORS.linen).setStrokeStyle(3, COLORS.ink);
    const post = this.add.rectangle(-42, 34, 7, 52, COLORS.wood).setStrokeStyle(2, COLORS.ink);
    const label = this.add.text(0, 0, "MOONWATER", {
      color: "#364152",
      fontFamily: "system-ui, sans-serif",
      fontSize: "11px",
      fontStyle: "bold",
    }).setOrigin(0.5);
    sign.add([post, board, label]);
  }

  drawCelestialFish() {
    const { width, height } = this.scale;
    const fish = this.add.graphics();
    const specimens = [
      [0.49, 0.63, 0.7, COLORS.pondLight, "mote"],
      [0.72, 0.55, 0.92, COLORS.linen, "koi"],
      [0.62, 0.73, 0.8, COLORS.gold, "ray"],
    ];

    specimens.forEach(([xRatio, yRatio, scale, color, kind]) => {
      const x = width * xRatio;
      const y = height * yRatio;
      fish.lineStyle(3, COLORS.ink, 0.75).fillStyle(color, 0.5);
      if (kind === "ray") {
        fish.fillPoints([
          { x: x - 23 * scale, y }, { x, y: y - 13 * scale },
          { x: x + 24 * scale, y }, { x, y: y + 12 * scale },
        ], true);
        fish.lineBetween(x + 20 * scale, y, x + 38 * scale, y + 9 * scale);
      } else {
        fish.fillEllipse(x, y, 44 * scale, 20 * scale);
        fish.fillTriangle(x + 18 * scale, y, x + 35 * scale, y - 12 * scale, x + 35 * scale, y + 12 * scale);
      }
      fish.fillStyle(COLORS.linen, 0.9).fillCircle(x - 7 * scale, y - 2 * scale, 2.5);
      fish.fillCircle(x + 5 * scale, y + 3 * scale, 2.2);
      fish.lineStyle(1.5, COLORS.linen, 0.9).lineBetween(x - 7 * scale, y - 2 * scale, x + 5 * scale, y + 3 * scale);
    });
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
    if (!this.reducedMotion) this.tweens.add({ targets: this.bobber, y: this.bobber.y + 6, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.inOut" });
  }

  createFamiliar() {
    const { width, height } = this.scale;
    const selection = this.bridge?.getFamiliar?.() || DEFAULT_FAMILIAR;
    const coat = FAMILIAR_COATS[selection.coat] || FAMILIAR_COATS.cream;
    const coatColor = phaserColor(coat.base, COLORS.linen);
    const detailColor = phaserColor(coat.detail, COLORS.rose);
    const x = width * 0.19;
    const y = height * 0.49;
    const familiar = this.add.container(x, y);
    const tail = selection.species === "moon-rabbit"
      ? this.add.circle(-25, 8, 13, coatColor).setStrokeStyle(3, COLORS.ink)
      : this.add.ellipse(-29, 6, 38, 21, detailColor).setAngle(22).setStrokeStyle(3, COLORS.ink);
    const body = this.add.ellipse(0, 6, 50, 45, detailColor).setStrokeStyle(4, COLORS.ink);
    const head = this.add.circle(4, -23, 28, coatColor).setStrokeStyle(4, COLORS.ink);
    const earHeight = selection.species === "moon-rabbit" ? 32 : 18;
    const earLeft = this.add.triangle(-11, -44, 0, earHeight, 10, 0, 18, earHeight, coatColor).setStrokeStyle(3, COLORS.ink);
    const earRight = this.add.triangle(18, -44, 0, earHeight, 10, 0, 18, earHeight, coatColor).setStrokeStyle(3, COLORS.ink);
    if (selection.species === "moon-rabbit") {
      earLeft.y -= 12;
      earRight.y -= 12;
    }
    const scarf = this.add.rectangle(2, 2, 35, 9, COLORS.pondLight).setAngle(-5).setStrokeStyle(2, COLORS.ink);
    const eyes = this.add.graphics().fillStyle(COLORS.ink, 1).fillCircle(-5, -25, 3).fillCircle(13, -25, 3);
    const marking = selection.markings === "none"
      ? null
      : this.add.star(4, -38, 4, 2, 5, detailColor, 1);
    familiar.add([tail, body, head, earLeft, earRight, scarf, eyes, marking].filter(Boolean));
    if (!this.reducedMotion) this.tweens.add({ targets: familiar, y: y - 4, yoyo: true, repeat: -1, duration: 1800, ease: "Sine.inOut" });
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
      if (!this.reducedMotion) this.tweens.add({ targets: this.bobber, scale: 1.5, yoyo: true, duration: 160, repeat: 3 });
    } else if (phase === STARFISHING_PHASES.caught) {
      this.reveal.setAlpha(0.92);
      if (!this.reducedMotion) {
        this.tweens.add({ targets: this.reveal, angle: 45, scale: 1.14, yoyo: true, duration: 420, repeat: 1 });
        this.cameras.main.flash(190, 250, 243, 235, false);
      }
    } else if (phase === STARFISHING_PHASES.escaped) {
      this.bobber.setFillStyle(COLORS.pondLight, 1);
      if (!this.reducedMotion) this.cameras.main.shake(120, 0.0025);
    }
  }
}
