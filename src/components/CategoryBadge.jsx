const categoryConfig = {
  personal: { bg: "bg-chart-1/15", text: "text-chart-1", border: "border-chart-1/20", dot: "bg-chart-1" },
  community: { bg: "bg-chart-2/15", text: "text-chart-2", border: "border-chart-2/20", dot: "bg-chart-2" },
  collabs: { bg: "bg-chart-4/15", text: "text-chart-4", border: "border-chart-4/20", dot: "bg-chart-4" },
  birthdays: { bg: "bg-chart-5/15", text: "text-chart-5", border: "border-chart-5/20", dot: "bg-chart-5" },
};

export default function CategoryBadge({ category }) {
  const config = categoryConfig[category] || categoryConfig.personal;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${config.bg} ${config.text} ${config.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {category}
    </span>
  );
}