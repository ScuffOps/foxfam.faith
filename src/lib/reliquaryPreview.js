const DEFAULT_LINE_COUNT = 5;
const DEFAULT_CHARACTER_LIMIT = 220;

function getMeaningfulLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function clipText(value, characterLimit) {
  const text = String(value || "").trim();
  if (text.length <= characterLimit) return { text, hasMore: false };

  const clipped = text.slice(0, characterLimit).trimEnd();
  const lastSpace = clipped.lastIndexOf(" ");
  const safeClip = lastSpace > characterLimit * 0.6 ? clipped.slice(0, lastSpace) : clipped;
  return { text: `${safeClip}...`, hasMore: true };
}

export function getReliquaryPreview(value, lineCount = DEFAULT_LINE_COUNT, characterLimit = DEFAULT_CHARACTER_LIMIT) {
  const lines = getMeaningfulLines(value);
  if (lines.length === 0) return { text: "", hasMore: false };

  if (lines.length > 1) {
    return {
      text: lines.slice(0, lineCount).join("\n"),
      hasMore: lines.length > lineCount,
    };
  }

  return clipText(lines[0], characterLimit);
}
