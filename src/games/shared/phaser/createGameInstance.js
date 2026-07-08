import Phaser from "phaser";

export function createGameInstance({ parent, width = 960, height = 540, scene, backgroundColor = "#070b1c" }) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width,
    height,
    backgroundColor,
    scene,
    scale: {
      mode: Phaser.Scale.RESIZE,
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
