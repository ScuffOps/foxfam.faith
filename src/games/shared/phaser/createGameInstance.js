import Phaser from "phaser";

const SCALE_MODES = Object.freeze({
  fit: Phaser.Scale.FIT,
  resize: Phaser.Scale.RESIZE,
});

export function createGameInstance({
  parent,
  width = 960,
  height = 540,
  scene,
  backgroundColor = "#070b1c",
  scaleMode = "resize",
}) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor,
    scene,
    scale: {
      mode: SCALE_MODES[scaleMode] || SCALE_MODES.resize,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height,
    },
    render: {
      antialias: true,
      transparent: false,
    },
    audio: {
      noAudio: true,
    },
  });
}
