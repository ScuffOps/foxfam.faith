const statusConfig = {
  pending: "bg-warning/15 text-warning border-warning/20",
  approved: "bg-success/15 text-success border-success/20",
  rejected: "bg-destructive/15 text-destructive border-destructive/20",
  converted: "bg-primary/15 text-primary border-primary/20",
  active: "bg-success/15 text-success border-success/20",
  cancelled: "bg-muted text-muted-foreground border-border",
  completed: "bg-accent/15 text-accent border-accent/20",
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${config}`}>
      {status}
    </span>
  );
}