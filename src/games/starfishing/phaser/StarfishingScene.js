import Phaser from "phaser";
import { GAME_ACTIONS } from "@/games/shared/input/actions";
import { getApprovedGameArtAsset } from "@/games/shared/art/gameArtManifest";
import { DEFAULT_FAMILIAR, FAMILIAR_SPECIES } from "@/games/shared/familiar/familiarCatalog";
import { STARFISHING_PHASES } from "@/games/starfishing/simulation/starfishingRules";
import {
  STARFISHING_ART_ANCHORS,
  STARFISHING_ART_ASSETS,
  STARFISHING_ART_LAYERS,
} from "./starfishingArtPlane";

const COLORS = {
  sky: 0xd9e6ec,
  linen: 0xfaf3eb,
  ink: 0x485365,
  pond: 0x80adbc,
  pondLight: 0xb4c6dc,
  rose: 0xd5a1a3,
  gold: 0xdfd8ab,
};

const STARFISHING_ENVIRONMENT_ASSET = getApprovedGameArtAsset(
  STARFISHING_ART_ASSETS.environment.slotId,
);
const STARFISHING_FOREGROUND_ASSET = getApprovedGameArtAsset(
  STARFISHING_ART_ASSETS.foreground.slotId,
);
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

  preload() {
    const selection = this.bridge?.getFamiliar?.() || DEFAULT_FAMILIAR;
    const species = FAMILIAR_SPECIES[selection.species] || FAMILIAR_SPECIES[DEFAULT_FAMILIAR.species];
    this.familiarAssetKey = `starfishing-familiar-${selection.species}`;
    if (STARFISHING_ENVIRONMENT_ASSET) {
      this.load.image(
        STARFISHING_ART_ASSETS.environment.textureKey,
        STARFISHING_ENVIRONMENT_ASSET,
      );
    }
    if (STARFISHING_FOREGROUND_ASSET) {
      this.load.image(
        STARFISHING_ART_ASSETS.foreground.textureKey,
        STARFISHING_FOREGROUND_ASSET,
      );
    }
    this.load.image(this.familiarAssetKey, species.asset);
  }

  create() {
    this.reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
    this.cameras.main.setBackgroundColor(COLORS.sky);
    this.drawWorld();
    this.createFishingRig();
    this.createFamiliar();
    this.createForeground();

    this.input.on("pointerdown", (pointer, gameObjects) => {
      if (gameObjects.length) return;
      this.bridge?.dispatch(GAME_ACTIONS.primary);
    });
  }

  drawWorld() {
    const { width, height } = this.scale;
    if (STARFISHING_ENVIRONMENT_ASSET
      && this.textures.exists(STARFISHING_ART_ASSETS.environment.textureKey)) {
      this.environment = this.add.image(
        width / 2,
        height / 2,
        STARFISHING_ART_ASSETS.environment.textureKey,
      )
        .setDisplaySize(width, height)
        .setName("starfishing-environment-layer")
        .setDepth(STARFISHING_ART_LAYERS.environment)
        .setData("sceneLayer", STARFISHING_ART_ASSETS.environment.sceneLayer);
      return;
    }

    this.environment = this.drawAuthoredEnvironment(width, height);
  }

  createForeground() {
    const { width, height } = this.scale;
    if (!STARFISHING_FOREGROUND_ASSET
      || !this.textures.exists(STARFISHING_ART_ASSETS.foreground.textureKey)) return;

    this.foreground = this.add.image(
      width / 2,
      height / 2,
      STARFISHING_ART_ASSETS.foreground.textureKey,
    )
      .setDisplaySize(width, height)
      .setName("starfishing-foreground-layer")
      .setDepth(STARFISHING_ART_LAYERS.foreground)
      .setData("sceneLayer", STARFISHING_ART_ASSETS.foreground.sceneLayer);
  }

  drawAuthoredEnvironment(width, height) {
    const art = this.add.graphics()
      .setName("starfishing-authored-environment-layer")
      .setDepth(STARFISHING_ART_LAYERS.environment)
      .setData("sceneLayer", "environment");

    art.fillStyle(COLORS.sky, 1).fillRect(0, 0, width, height);
    art.lineStyle(5, COLORS.ink, 1);

    const point = (x, y) => ({ x, y });
    const ground = [
      point(width * 0.02, height * 0.34),
      point(width * 0.5, height * 0.1),
      point(width * 0.98, height * 0.34),
      point(width * 0.5, height * 0.94),
    ];
    art.fillStyle(0xc5d7c2, 1).fillPoints(ground, true).strokePoints(ground, true);

    art.fillStyle(0x9ca9ad, 1).fillEllipse(width * 0.58, height * 0.55, width * 0.68, height * 0.58);
    art.strokeEllipse(width * 0.58, height * 0.55, width * 0.68, height * 0.58);
    art.fillStyle(COLORS.pond, 1).fillEllipse(width * 0.58, height * 0.53, width * 0.62, height * 0.5);
    art.strokeEllipse(width * 0.58, height * 0.53, width * 0.62, height * 0.5);

    const dockTop = [
      point(width * 0.04, height * 0.57),
      point(width * 0.32, height * 0.45),
      point(width * 0.48, height * 0.51),
      point(width * 0.19, height * 0.64),
    ];
    art.fillStyle(0xcab08b, 1).fillPoints(dockTop, true).strokePoints(dockTop, true);
    art.fillStyle(0xb58d6f, 1).fillPoints([
      dockTop[3], dockTop[2],
      point(width * 0.48, height * 0.56),
      point(width * 0.19, height * 0.69),
    ], true).strokePoints([
      dockTop[3], dockTop[2],
      point(width * 0.48, height * 0.56),
      point(width * 0.19, height * 0.69),
    ], true);

    art.lineStyle(3, COLORS.linen, 1);
    art.beginPath();
    art.moveTo(width * 0.46, height * 0.39);
    art.lineTo(width * 0.55, height * 0.48);
    art.lineTo(width * 0.65, height * 0.42);
    art.lineTo(width * 0.76, height * 0.53);
    art.lineTo(width * 0.86, height * 0.47);
    art.strokePath();
    for (const [x, y] of [[0.46, 0.39], [0.55, 0.48], [0.65, 0.42], [0.76, 0.53], [0.86, 0.47]]) {
      art.fillStyle(COLORS.gold, 1).fillCircle(width * x, height * y, 6);
      art.lineStyle(3, COLORS.ink, 1).strokeCircle(width * x, height * y, 6);
    }

    return art;
  }

  createFishingRig() {
    const { width, height } = this.scale;
    const rodStart = scaleAnchor(STARFISHING_ART_ANCHORS.rodStart, width, height);
    const rodEnd = scaleAnchor(STARFISHING_ART_ANCHORS.rodEnd, width, height);
    const bobber = scaleAnchor(STARFISHING_ART_ANCHORS.bobber, width, height);
    const catchShadow = scaleAnchor(STARFISHING_ART_ANCHORS.catchShadow, width, height);
    const catchPoint = scaleAnchor(STARFISHING_ART_ANCHORS.catch, width, height);
    this.rod = this.add.line(0, 0, rodStart.x, rodStart.y, rodEnd.x, rodEnd.y, COLORS.ink, 1)
      .setLineWidth(7).setName("starfishing-rod-layer").setDepth(STARFISHING_ART_LAYERS.rig).setData("sceneLayer", "rig");
    this.line = this.add.line(0, 0, rodEnd.x, rodEnd.y, bobber.x, bobber.y, COLORS.linen, 0.95)
      .setLineWidth(3).setName("starfishing-line-layer").setDepth(STARFISHING_ART_LAYERS.rig + 1).setData("sceneLayer", "rig");
    this.bobber = this.add.circle(bobber.x, bobber.y, 9, COLORS.gold, 1)
      .setStrokeStyle(3, COLORS.ink, 1).setName("starfishing-bobber-layer").setDepth(STARFISHING_ART_LAYERS.rig + 2).setData("sceneLayer", "interaction");
    this.shadow = this.add.ellipse(catchShadow.x, catchShadow.y, 74, 24, COLORS.ink, 0)
      .setAngle(-12).setName("starfishing-catch-shadow-layer").setDepth(STARFISHING_ART_LAYERS.underwater).setData("sceneLayer", "catch");
    this.reveal = this.add.star(catchPoint.x, catchPoint.y, 8, 26, 52, COLORS.gold, 0)
      .setStrokeStyle(4, COLORS.ink, 1).setName("starfishing-reveal-layer").setDepth(STARFISHING_ART_LAYERS.reveal).setData("sceneLayer", "reveal");
    this.ripples = [1, 2, 3].map((scale) => this.add.ellipse(this.bobber.x, this.bobber.y + 5, 24 * scale, 9 * scale, COLORS.linen, 0)
      .setStrokeStyle(2, COLORS.linen, 0.55).setDepth(STARFISHING_ART_LAYERS.rig + 3).setData("sceneLayer", "interaction"));
    if (!this.reducedMotion) this.tweens.add({ targets: this.bobber, y: this.bobber.y + 6, yoyo: true, repeat: -1, duration: 1100, ease: "Sine.inOut" });
  }

  createFamiliar() {
    const { width, height } = this.scale;
    const { x, y } = scaleAnchor(STARFISHING_ART_ANCHORS.familiar, width, height);
    const targetWidth = Math.min(width * 0.16, height * 0.28);
    if (!this.textures.exists(this.familiarAssetKey)) {
      this.drawProceduralFamiliar(x, y, targetWidth);
      return;
    }
    const familiar = this.add.image(x, y, this.familiarAssetKey)
      .setOrigin(0.5, 1)
      .setName("starfishing-familiar-layer")
      .setDepth(STARFISHING_ART_LAYERS.familiar)
      .setData("sceneLayer", "familiar");
    familiar.setScale(targetWidth / familiar.width);
    if (!this.reducedMotion) this.tweens.add({ targets: familiar, y: y - 4, yoyo: true, repeat: -1, duration: 1800, ease: "Sine.inOut" });
  }

  drawProceduralFamiliar(x, y, targetWidth) {
    const size = targetWidth;
    const familiar = this.add.graphics()
      .setName("starfishing-familiar-fallback-layer")
      .setDepth(STARFISHING_ART_LAYERS.familiar)
      .setData("sceneLayer", "familiar");
    familiar.fillStyle(COLORS.ink, 1).fillCircle(x, y - size * 0.3, size * 0.31);
    familiar.fillTriangle(x - size * 0.3, y - size * 0.48, x - size * 0.12, y - size * 0.82, x - size * 0.01, y - size * 0.48);
    familiar.fillTriangle(x + size * 0.3, y - size * 0.48, x + size * 0.12, y - size * 0.82, x + size * 0.01, y - size * 0.48);
    familiar.fillStyle(COLORS.linen, 1).fillCircle(x, y - size * 0.32, size * 0.26);
    familiar.fillStyle(COLORS.rose, 1).fillCircle(x, y - size * 0.25, size * 0.035);
    familiar.fillStyle(COLORS.ink, 1).fillCircle(x - size * 0.09, y - size * 0.36, size * 0.025);
    familiar.fillCircle(x + size * 0.09, y - size * 0.36, size * 0.025);
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

function scaleAnchor(anchor, width, height) {
  return { x: width * anchor.x, y: height * anchor.y };
}
