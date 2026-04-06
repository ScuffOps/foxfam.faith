import { getCategoryColor } from "@/lib/categoryColors";

export default function CategoryBadge({ category }) {
  const { hex, bg, border } = getCategoryColor(category);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize"
      style={{ background: bg, borderColor: border, color: hex }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: hex }} />
      {category}
    </span>
  );
}