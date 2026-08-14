import Phaser from "phaser";
import { getApprovedGameArtAsset } from "@/games/shared/art/gameArtManifest";
import { TIME_RUNNER_PHASES, TIME_RUNNER_POSTURES } from "@/games/timeRunner/simulation/timeRunnerRules";
import { DEFAULT_FAMILIAR, FAMILIAR_COATS } from "@/games/shared/familiar/familiarCatalog";
import {
  getApprovedTimeRunnerProductionArt,
  getTimeRunnerRunnerFrame,
  TIME_RUNNER_RUNNER_ATLAS,
  TIME_RUNNER_SHARD_ATLAS,
} from "@/games/timeRunner/art/timeRunnerProductionArt";
import { TIME_RUNNER_APPROVED_ANCHORS } from "./timeRunnerArtPlane";

const COLORS = {
  linen: 0xfaf3eb,
  petal: 0xf8e6e6,
  blue: 0xd9e6ec,
  bell: 0xb4c6dc,
  teal: 0x80adbc,
  rose: 0xd5a1a3,
  gold: 0xdfd8ab,
  brass: 0xcab08b,
  green: 0xeaeee0,
  ink: 0x364152,
  outline: 0x485365,
  wood: 0xa97f67,
  deepWood: 0x795b54,
};

const DIAL_NUMERALS = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
const PROCEDURAL_ROUTE = [
  [0.08, 0.76], [0.23, 0.68], [0.39, 0.75], [0.55, 0.62], [0.72, 0.7], [0.9, 0.59],
];
const TIME_RUNNER_ENVIRONMENT_ASSET = getApprovedGameArtAsset("time-runner.clocktower");
const TIME_RUNNER_PRODUCTION_ART = getApprovedTimeRunnerProductionArt();
const RUNNER_TEXTURE_KEY = "time-runner-authored-runner";
const SHARD_TEXTURE_KEY = "time-runner-authored-shards";

function phaserColor(hex, fallback) {
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) return fallback;
  return Number.parseInt(hex.slice(1), 16);
}

export default class TimeRunnerScene extends Phaser.Scene {
  constructor({ bridge } = {}) {
    super("TimeRunnerScene");
    this.bridge = bridge;
    this.environmentGraphics = null;
    this.environmentImage = null;
    this.routeGraphics = null;
    this.actionGraphics = null;
    this.runnerSprite = null;
    this.shardSprites = new Map();
    this.labels = [];
    this.landingButtons = new Map();
    this.lastSize = { width: 0, height: 0 };
  }

  preload() {
    if (TIME_RUNNER_ENVIRONMENT_ASSET) {
      this.load.image("time-runner-environment", TIME_RUNNER_ENVIRONMENT_ASSET);
    }
    if (TIME_RUNNER_PRODUCTION_ART) {
      this.load.image(RUNNER_TEXTURE_KEY, TIME_RUNNER_PRODUCTION_ART.runner);
      this.load.image(SHARD_TEXTURE_KEY, TIME_RUNNER_PRODUCTION_ART.shards);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor("#D9E6EC");
    this.environmentGraphics = this.add.graphics()
      .setName("time-runner-environment-layer")
      .setDepth(0)
      .setData("sceneLayer", "environment");
    this.routeGraphics = this.add.graphics()
      .setName("time-runner-route-layer")
      .setDepth(10)
      .setData("sceneLayer", "route");
    this.actionGraphics = this.add.graphics()
      .setName("time-runner-actor-layer")
      .setDepth(20)
      .setData("sceneLayer", "actors");
    this.createAuthoredProductionArt();
    this.drawWorld();
    this.scale.on("resize", () => this.drawWorld());
  }

  update() {
    const state = this.bridge?.getState?.();
    if (!state || !this.actionGraphics) return;
    const { width, height } = this.scale;
    if (width !== this.lastSize.width || height !== this.lastSize.height) this.drawWorld();
    this.syncLandingButtons(state);
    this.syncAuthoredShardSprites(state);
    this.drawActionLayer(state);
  }

  drawWorld() {
    const { width, height } = this.scale;
    this.lastSize = { width, height };
    this.environmentGraphics.clear();
    this.routeGraphics.clear();
    this.labels.forEach((label) => label.destroy());
    this.labels = [];
    const g = this.environmentGraphics;

    if (this.usesApprovedEnvironment()) {
      if (!this.environmentImage) {
        this.environmentImage = this.add.image(width / 2, height / 2, "time-runner-environment")
          .setName("time-runner-approved-environment-layer")
          .setDepth(0)
          .setData("sceneLayer", "environment");
      }
      this.environmentImage.setPosition(width / 2, height / 2).setDisplaySize(width, height).setVisible(true);
      return;
    }

    this.environmentImage?.setVisible(false);

    g.fillStyle(COLORS.blue, 1).fillRect(0, 0, width, height);
    this.drawSkyline(g, width, height);
    this.drawTowerRoom(g, width, height);
    this.drawMainClock(g, width * 0.76, height * 0.27, Math.min(width, height) * 0.23);
    this.drawRoute(this.routeGraphics, width, height);
    this.drawForeground(g, width, height);
  }

  drawSkyline(g, width, height) {
    const skyY = height * 0.22;
    g.fillStyle(COLORS.linen, 1).fillCircle(width * 0.13, skyY * 0.72, Math.max(24, height * 0.065));
    g.fillStyle(COLORS.bell, 1);
    [0.03, 0.24, 0.43, 0.91].forEach((ratio, index) => {
      const towerWidth = Math.max(42, width * (index % 2 ? 0.08 : 0.06));
      const towerHeight = height * (0.15 + index * 0.018);
      g.fillRect(width * ratio, skyY - towerHeight, towerWidth, towerHeight);
      g.fillTriangle(width * ratio - 5, skyY - towerHeight, width * ratio + towerWidth / 2, skyY - towerHeight - 28, width * ratio + towerWidth + 5, skyY - towerHeight);
    });
    g.lineStyle(3, COLORS.outline, 1).lineBetween(0, skyY, width, skyY);
  }

  drawTowerRoom(g, width, height) {
    const floorY = height * 0.82;
    g.fillStyle(COLORS.green, 1).fillRect(0, height * 0.22, width, floorY - height * 0.22);
    g.fillStyle(COLORS.brass, 1).fillTriangle(0, floorY, width, floorY, width, height);
    g.lineStyle(4, COLORS.outline, 1).lineBetween(0, floorY, width, floorY);

    const beamWidth = Math.max(28, width * 0.045);
    [0.035, 0.46, 0.93].forEach((ratio) => {
      const x = width * ratio;
      g.fillStyle(COLORS.deepWood, 1).fillRect(x, height * 0.19, beamWidth, floorY - height * 0.19);
      g.lineStyle(3, COLORS.outline, 1).strokeRect(x, height * 0.19, beamWidth, floorY - height * 0.19);
    });
    g.fillStyle(COLORS.wood, 1).fillRect(0, height * 0.2, width, Math.max(24, height * 0.055));
    g.lineStyle(4, COLORS.outline, 1).strokeRect(-2, height * 0.2, width + 4, Math.max(24, height * 0.055));

    [0.3, 0.52].forEach((ratio, index) => {
      const x = width * ratio;
      const top = height * (0.25 + index * 0.05);
      const bob = height * (0.48 + index * 0.05);
      g.lineStyle(5, COLORS.deepWood, 1).lineBetween(x, top, x, bob);
      g.fillStyle(index ? COLORS.rose : COLORS.gold, 1).fillCircle(x, bob, Math.max(15, height * 0.028));
      g.lineStyle(3, COLORS.outline, 1).strokeCircle(x, bob, Math.max(15, height * 0.028));
    });
  }

  drawMainClock(g, cx, cy, radius) {
    g.fillStyle(COLORS.deepWood, 1).fillCircle(cx, cy + 5, radius + 14);
    g.lineStyle(4, COLORS.outline, 1).strokeCircle(cx, cy + 5, radius + 14);
    g.fillStyle(COLORS.gold, 1).fillCircle(cx, cy, radius + 5);
    g.lineStyle(4, COLORS.outline, 1).strokeCircle(cx, cy, radius + 5);
    g.fillStyle(COLORS.linen, 1).fillCircle(cx, cy, radius - 5);
    g.lineStyle(3, COLORS.outline, 1).strokeCircle(cx, cy, radius - 5);
    g.lineStyle(2, COLORS.brass, 1).strokeCircle(cx, cy, radius * 0.78);

    DIAL_NUMERALS.forEach((numeral, index) => {
      const angle = index * (Math.PI / 6) - Math.PI / 2;
      const label = this.add.text(cx + Math.cos(angle) * radius * 0.66, cy + Math.sin(angle) * radius * 0.66, numeral, {
        fontFamily: "Georgia, serif",
        fontSize: `${Math.max(10, radius * 0.095)}px`,
        color: "#485365",
        fontStyle: "bold",
      }).setOrigin(0.5).setDepth(5).setData("sceneLayer", "environment");
      this.labels.push(label);
      const tickStart = radius * 0.81;
      g.lineStyle(2, COLORS.outline, 1).lineBetween(
        cx + Math.cos(angle) * tickStart,
        cy + Math.sin(angle) * tickStart,
        cx + Math.cos(angle) * radius * 0.88,
        cy + Math.sin(angle) * radius * 0.88,
      );
    });
  }

  drawRoute(g, width, height) {
    PROCEDURAL_ROUTE.forEach(([px, py], index) => {
      const x = width * px;
      const y = height * py;
      const next = PROCEDURAL_ROUTE[index + 1];
      if (next) {
        g.lineStyle(Math.max(10, height * 0.022), COLORS.outline, 1).lineBetween(x, y, width * next[0], height * next[1]);
        g.lineStyle(Math.max(6, height * 0.013), index % 2 ? COLORS.rose : COLORS.brass, 1).lineBetween(x, y - 2, width * next[0], height * next[1] - 2);
      }
      g.fillStyle(COLORS.outline, 1).fillCircle(x, y + 4, Math.max(14, height * 0.032));
      g.fillStyle(index % 3 === 0 ? COLORS.gold : index % 3 === 1 ? COLORS.bell : COLORS.petal, 1).fillCircle(x, y, Math.max(12, height * 0.028));
      g.lineStyle(3, COLORS.outline, 1).strokeCircle(x, y, Math.max(12, height * 0.028));
      g.fillStyle(COLORS.brass, 1).fillCircle(x, y, 4);
    });
  }

  drawForeground(g, width, height) {
    const floorY = height * 0.82;
    for (let index = 0; index < 8; index += 1) {
      const x = (width / 7) * index - 20;
      g.lineStyle(2, COLORS.deepWood, 1).lineBetween(x, floorY, x + width * 0.12, height);
    }
    g.fillStyle(COLORS.wood, 1).fillRect(0, height - Math.max(18, height * 0.04), width, Math.max(18, height * 0.04));
    g.lineStyle(3, COLORS.outline, 1).lineBetween(0, height - Math.max(18, height * 0.04), width, height - Math.max(18, height * 0.04));
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
      if (state.phase !== TIME_RUNNER_PHASES.running) return;
      const point = this.usesApprovedEnvironment()
        ? TIME_RUNNER_APPROVED_ANCHORS.landingChoices[index === 0 ? 0 : 1]
        : { x: PROCEDURAL_ROUTE[index === 0 ? 3 : 4][0], y: PROCEDURAL_ROUTE[index === 0 ? 3 : 4][1] };
      const x = this.scale.width * point.x;
      const y = this.scale.height * point.y;
      const existingButton = this.landingButtons.get(landing.id);
      if (existingButton) {
        existingButton.setPosition(x, y);
        return;
      }
      const button = this.add.circle(x, y, 21, index === 0 ? COLORS.gold : COLORS.rose, 1)
        .setStrokeStyle(4, COLORS.outline, 1)
        .setDepth(30)
        .setInteractive(new Phaser.Geom.Circle(21, 21, 60), Phaser.Geom.Circle.Contains)
        .setData("landingId", landing.id)
        .setData("sceneLayer", "interaction")
        .on("pointerdown", () => this.bridge?.dispatch("select-landing", { landingId: landing.id }))
        .on("pointerover", () => button.setScale(1.12))
        .on("pointerout", () => button.setScale(1));
      button.input.cursor = "pointer";
      this.landingButtons.set(landing.id, button);
    });
  }

  drawActionLayer(state) {
    const g = this.actionGraphics;
    const { width, height } = this.scale;
    g.clear();
    this.drawHands(g, state, width, height);
    state.hazards.forEach((hazard) => this.drawHazard(g, hazard, width, height));
    const familiarAnchor = this.usesApprovedEnvironment()
      ? TIME_RUNNER_APPROVED_ANCHORS.familiar
      : { x: 0.18, y: 0.68 };
    if (this.usesApprovedProductionArt()) {
      this.drawAuthoredRunner(state, width * familiarAnchor.x, height * familiarAnchor.y);
    } else {
      this.runnerSprite?.setVisible(false);
      this.drawFamiliar(g, state, width * familiarAnchor.x, height * familiarAnchor.y);
    }
    const progress = state.phase === TIME_RUNNER_PHASES.ready ? 0 : Math.min(1, state.elapsedMs / 45000);
    const meterWidth = width * 0.35;
    g.fillStyle(COLORS.linen, 1).fillRoundedRect(width * 0.055, height * 0.055, meterWidth, 16, 7);
    g.lineStyle(2, COLORS.outline, 1).strokeRoundedRect(width * 0.055, height * 0.055, meterWidth, 16, 7);
    g.fillStyle(COLORS.teal, 1).fillRoundedRect(width * 0.055 + 3, height * 0.055 + 3, Math.max(1, (meterWidth - 6) * progress), 10, 4);
  }

  drawHands(g, state, width, height) {
    const approvedClock = this.usesApprovedEnvironment() ? TIME_RUNNER_APPROVED_ANCHORS.clock : null;
    const cx = width * (approvedClock?.x ?? 0.76);
    const cy = height * (approvedClock?.y ?? 0.27);
    const ratio = Math.min(1, state.elapsedMs / 45000);
    const minuteAngle = ratio * Math.PI * 4 - Math.PI / 2;
    const hourAngle = ratio * Math.PI - Math.PI / 2;
    const radius = Math.min(width, height) * (approvedClock?.radius ?? 0.23);
    this.drawClockHand(g, cx, cy, minuteAngle, radius * 0.82, 8, COLORS.brass);
    this.drawClockHand(g, cx, cy, hourAngle, radius * 0.56, 11, COLORS.rose);
    g.fillStyle(COLORS.outline, 1).fillCircle(cx, cy, 9);
    g.fillStyle(COLORS.gold, 1).fillCircle(cx, cy, 4);
  }

  drawClockHand(g, cx, cy, angle, length, thickness, color) {
    const tipX = cx + Math.cos(angle) * length;
    const tipY = cy + Math.sin(angle) * length;
    g.lineStyle(thickness + 5, COLORS.outline, 1).lineBetween(cx, cy, tipX, tipY);
    g.lineStyle(thickness, color, 1).lineBetween(cx, cy, tipX, tipY);
    g.fillStyle(COLORS.outline, 1).fillCircle(tipX, tipY, thickness * 0.68);
    g.fillStyle(COLORS.gold, 1).fillCircle(tipX, tipY, thickness * 0.35);
  }

  drawFamiliar(g, state, x, baseY) {
    const familiar = this.bridge?.getFamiliar?.() || DEFAULT_FAMILIAR;
    const coat = FAMILIAR_COATS[familiar.coat] || FAMILIAR_COATS.cream;
    const coatColor = phaserColor(coat.base, COLORS.linen);
    const detailColor = phaserColor(coat.detail, COLORS.rose);
    const jumping = state.posture === TIME_RUNNER_POSTURES.jump;
    const ducking = state.posture === TIME_RUNNER_POSTURES.duck;
    const focus = state.posture === TIME_RUNNER_POSTURES.focus;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const bob = reducedMotion ? 0 : Math.sin(this.time.now / 130) * 2;
    const y = baseY - (jumping ? 58 : ducking ? 4 : 23) + bob;
    const bodyWidth = ducking ? 60 : 44;
    const bodyHeight = ducking ? 29 : 50;

    if (focus) {
      g.fillStyle(COLORS.gold, 1).fillCircle(x, y + 8, 48);
      g.lineStyle(3, COLORS.outline, 1).strokeCircle(x, y + 8, 48);
    }

    this.drawTail(g, x - bodyWidth * 0.42, y + 18, ducking, familiar.species, coatColor, detailColor);
    g.fillStyle(detailColor, 1).fillEllipse(x, y + 21, bodyWidth, bodyHeight);
    g.lineStyle(4, COLORS.outline, 1).strokeEllipse(x, y + 21, bodyWidth, bodyHeight);
    g.fillStyle(coatColor, 1).fillCircle(x, y - 6, 25);
    g.lineStyle(4, COLORS.outline, 1).strokeCircle(x, y - 6, 25);
    const earLift = familiar.species === "moon-rabbit" ? 16 : 0;
    this.drawEar(g, x - 18, y - 24, x - 11, y - 46 - earLift, x - 2, y - 27, coatColor, detailColor);
    this.drawEar(g, x + 2, y - 27, x + 13, y - 46 - earLift, x + 21, y - 22, coatColor, detailColor);
    g.fillStyle(COLORS.bell, 1).fillRoundedRect(x - 23, y + 6, 46, 13, 5);
    g.lineStyle(3, COLORS.outline, 1).strokeRoundedRect(x - 23, y + 6, 46, 13, 5);
    g.fillStyle(COLORS.gold, 1).fillCircle(x, y + 19, 6);
    g.lineStyle(2, COLORS.outline, 1).strokeCircle(x, y + 19, 6);
    g.fillStyle(COLORS.ink, 1).fillCircle(x - 8, y - 8, 3).fillCircle(x + 8, y - 8, 3);
    g.fillStyle(COLORS.deepWood, 1).fillTriangle(x - 3, y, x + 3, y, x, y + 4);
    g.lineStyle(2, COLORS.deepWood, 1).lineBetween(x, y + 4, x - 5, y + 7).lineBetween(x, y + 4, x + 5, y + 7);

    const footY = y + (ducking ? 34 : 48);
    g.fillStyle(COLORS.deepWood, 1).fillEllipse(x - 13, footY, 20, 9).fillEllipse(x + 13, footY, 20, 9);
    g.lineStyle(2, COLORS.outline, 1).strokeEllipse(x - 13, footY, 20, 9).strokeEllipse(x + 13, footY, 20, 9);
  }

  drawEar(g, ax, ay, bx, by, cx, cy, coatColor, detailColor) {
    g.fillStyle(coatColor, 1).fillTriangle(ax, ay, bx, by, cx, cy);
    g.lineStyle(4, COLORS.outline, 1).lineBetween(ax, ay, bx, by).lineBetween(bx, by, cx, cy);
    g.fillStyle(detailColor, 1).fillTriangle((ax + bx) / 2, (ay + by) / 2 + 2, bx, by + 7, (bx + cx) / 2, (by + cy) / 2 + 3);
  }

  drawTail(g, x, y, ducking, species, coatColor, detailColor) {
    const tipX = x - (ducking ? 28 : 35);
    const tipY = y - (ducking ? 2 : 22);
    if (species === "moon-rabbit") {
      g.fillStyle(coatColor, 1).fillCircle(x - 18, y + 2, 14);
      g.lineStyle(4, COLORS.outline, 1).strokeCircle(x - 18, y + 2, 14);
      return;
    }
    g.lineStyle(18, COLORS.outline, 1).lineBetween(x, y, tipX, tipY);
    g.lineStyle(12, detailColor, 1).lineBetween(x, y, tipX, tipY);
    g.fillStyle(coatColor, 1).fillCircle(tipX, tipY, 7);
    g.lineStyle(2, COLORS.outline, 1).strokeCircle(tipX, tipY, 7);
  }

  drawHazard(g, hazard, width, height) {
    const x = width * (hazard.x / 100);
    const y = height * (this.usesApprovedEnvironment() ? TIME_RUNNER_APPROVED_ANCHORS.hazardBaselineY : 0.76);
    if (hazard.kind === "hand-sweep") {
      g.lineStyle(15, COLORS.outline, 1).lineBetween(x - 44, y, x + 50, y - 42);
      g.lineStyle(9, COLORS.brass, 1).lineBetween(x - 44, y, x + 50, y - 42);
      g.fillStyle(COLORS.gold, 1).fillCircle(x + 50, y - 42, 10);
      g.lineStyle(3, COLORS.outline, 1).strokeCircle(x + 50, y - 42, 10);
    } else if (hazard.kind === "roman-gate") {
      this.drawRomanGate(g, x, y);
    } else if (!this.usesApprovedProductionArt()) {
      this.drawClockBrass(g, x, y - 56);
    }
  }

  createAuthoredProductionArt() {
    if (!this.usesApprovedProductionArt()) return;

    this.registerAtlasFrames(RUNNER_TEXTURE_KEY, TIME_RUNNER_RUNNER_ATLAS, "runner");
    this.registerAtlasFrames(SHARD_TEXTURE_KEY, TIME_RUNNER_SHARD_ATLAS, "shard");
    this.runnerSprite = this.add.sprite(0, 0, RUNNER_TEXTURE_KEY, "runner-0")
      .setName("time-runner-authored-runner")
      .setOrigin(0.5, 1)
      .setDepth(24)
      .setData("sceneLayer", "actors");
  }

  registerAtlasFrames(textureKey, atlas, prefix) {
    const texture = this.textures.get(textureKey);
    const source = texture.getSourceImage();
    const frameWidth = Math.floor(source.width / atlas.columns);
    const frameHeight = Math.floor(source.height / atlas.rows);

    for (let row = 0; row < atlas.rows; row += 1) {
      for (let column = 0; column < atlas.columns; column += 1) {
        const index = row * atlas.columns + column;
        const frameName = `${prefix}-${index}`;
        if (!texture.has(frameName)) {
          texture.add(frameName, 0, column * frameWidth, row * frameHeight, frameWidth, frameHeight);
        }
      }
    }
  }

  drawAuthoredRunner(state, x, baseY) {
    if (!this.runnerSprite) return;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const bob = reducedMotion ? 0 : Math.sin(this.time.now / 130) * 2;
    const jumping = state.posture === TIME_RUNNER_POSTURES.jump;
    const ducking = state.posture === TIME_RUNNER_POSTURES.duck;
    const frame = getTimeRunnerRunnerFrame(state);
    const height = Math.max(62, this.scale.height * 0.16);

    this.runnerSprite
      .setFrame(`runner-${frame}`)
      .setPosition(x, baseY - (jumping ? 42 : ducking ? 2 : 18) + bob)
      .setDisplaySize(height, height)
      .setVisible(true);
  }

  syncAuthoredShardSprites(state) {
    if (!this.usesApprovedProductionArt()) {
      this.shardSprites.forEach((sprite) => sprite.destroy());
      this.shardSprites.clear();
      return;
    }

    const activeShards = new Set(
      state.hazards.filter((hazard) => hazard.kind === "clock-shard").map((hazard) => hazard.id),
    );
    this.shardSprites.forEach((sprite, id) => {
      if (!activeShards.has(id)) {
        sprite.destroy();
        this.shardSprites.delete(id);
      }
    });

    state.hazards.forEach((hazard) => {
      if (hazard.kind !== "clock-shard") return;
      const x = this.scale.width * (hazard.x / 100);
      const y = this.scale.height * (this.usesApprovedEnvironment() ? TIME_RUNNER_APPROVED_ANCHORS.hazardBaselineY : 0.76) - 56;
      let sprite = this.shardSprites.get(hazard.id);
      if (!sprite) {
        sprite = this.add.sprite(x, y, SHARD_TEXTURE_KEY, `shard-${TIME_RUNNER_SHARD_ATLAS.frames.clockShard}`)
          .setName("time-runner-authored-clock-shard")
          .setDepth(23)
          .setData("sceneLayer", "actors");
        this.shardSprites.set(hazard.id, sprite);
      }
      const size = Math.max(34, this.scale.height * 0.075);
      sprite.setPosition(x, y).setDisplaySize(size, size).setVisible(true);
    });
  }

  drawRomanGate(g, x, y) {
    const left = x - 34;
    const top = y - 104;
    g.fillStyle(COLORS.outline, 1).fillRoundedRect(left - 4, top - 4, 76, 98, 8);
    g.fillStyle(COLORS.petal, 1).fillRoundedRect(left, top, 68, 90, 6);
    g.fillStyle(COLORS.green, 1).fillRoundedRect(left + 15, top + 25, 38, 65, 18);
    g.lineStyle(3, COLORS.outline, 1).strokeRoundedRect(left + 15, top + 25, 38, 65, 18);
    g.fillStyle(COLORS.brass, 1).fillRect(left + 7, top + 9, 54, 21);
    g.lineStyle(2, COLORS.outline, 1).strokeRect(left + 7, top + 9, 54, 21);
    g.lineStyle(3, COLORS.ink, 1);
    [-14, -7, 7, 14].forEach((offset) => g.lineBetween(x + offset, top + 13, x + offset, top + 25));
  }

  drawClockBrass(g, x, y) {
    g.fillStyle(COLORS.outline, 1).fillTriangle(x, y - 24, x + 22, y + 18, x - 20, y + 15);
    g.fillStyle(COLORS.gold, 1).fillTriangle(x, y - 18, x + 16, y + 12, x - 14, y + 10);
    g.lineStyle(3, COLORS.brass, 1).lineBetween(x - 7, y + 4, x + 8, y - 8);
    g.fillStyle(COLORS.linen, 1).fillCircle(x + 3, y, 4);
  }

  usesApprovedEnvironment() {
    return Boolean(TIME_RUNNER_ENVIRONMENT_ASSET && this.textures.exists("time-runner-environment"));
  }

  usesApprovedProductionArt() {
    return Boolean(
      TIME_RUNNER_PRODUCTION_ART
      && this.textures.exists(RUNNER_TEXTURE_KEY)
      && this.textures.exists(SHARD_TEXTURE_KEY),
    );
  }
}
