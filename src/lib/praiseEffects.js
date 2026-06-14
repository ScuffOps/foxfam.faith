export const PRAISE_BURST_DURATION_MS = 2400;
export const PRAISE_REFRESH_DELAY_MS = 2100;
export const PRAISE_OVERLAY_Z_INDEX = 9999;
const PRAISE_OVERLAY_EDGE_PADDING = 16;

export const MAGICAL_PRAISE_TONES = [
  { frequency: 659.25, delay: 0, type: "sine" },
  { frequency: 987.77, delay: 0.035, type: "triangle" },
  { frequency: 1318.51, delay: 0.08, type: "sine" },
  { frequency: 1975.53, delay: 0.15, type: "triangle" },
  { frequency: 2637.02, delay: 0.24, type: "sine" },
];

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function getPraiseBurstOverlayStyle(rect, viewport) {
  if (!rect || !viewport) return null;

  const maximumX = Math.max(PRAISE_OVERLAY_EDGE_PADDING, viewport.width - PRAISE_OVERLAY_EDGE_PADDING);
  const maximumY = Math.max(PRAISE_OVERLAY_EDGE_PADDING, viewport.height - PRAISE_OVERLAY_EDGE_PADDING);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  return {
    left: `${Math.round(clamp(centerX, PRAISE_OVERLAY_EDGE_PADDING, maximumX))}px`,
    top: `${Math.round(clamp(centerY, PRAISE_OVERLAY_EDGE_PADDING, maximumY))}px`,
    zIndex: PRAISE_OVERLAY_Z_INDEX,
  };
}
