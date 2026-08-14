const point = (x, y) => Object.freeze({ x, y });

export const TIME_RUNNER_ART_PLANE = Object.freeze({
  width: 960,
  height: 540,
  aspect: "16:9",
});

// Anchors match the approved clocktower illustration. Values are normalized so
// every live layer stays registered to the art when Phaser scales the canvas.
export const TIME_RUNNER_APPROVED_ANCHORS = Object.freeze({
  familiar: point(0.286, 0.365),
  clock: Object.freeze({
    ...point(0.701, 0.217),
    radius: 0.2,
  }),
  hazardBaselineY: 0.44,
  landingChoices: Object.freeze([
    point(0.59, 0.515),
    point(0.85, 0.605),
  ]),
});
