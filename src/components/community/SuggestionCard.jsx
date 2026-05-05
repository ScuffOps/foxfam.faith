import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import GlassCard from "../GlassCard";

const CATEGORY_META = {
  bug_report:          { label: "Bug Report",          icon: "🐛", color: "text-destructive bg-destructive/15" },
  feature_request:     { label: "Feature Request",     icon: "✨", color: "text-chart-4 bg-chart-4/15" },
  community_event_idea:{ label: "Community Event Idea",icon: "🎉", color: "text-chart-3 bg-chart-3/15" },
  general_question:    { label: "General Question",    icon: "❓", color: "text-chart-2 bg-chart-2/15" },
  content_idea:        { label: "Content Idea",        icon: "📝", color: "text-primary bg-primary/15" },
  design_feedback:     { label: "Design Feedback",     icon: "🎨", color: "text-chart-5 bg-chart-5/15" },
  other_feedback:      { label: "Other Feedback",      icon: "💬", color: "text-muted-foreground bg-muted" },
};

const STATUS_META = {
  pending_review: { label: "Pending Review", color: "text-muted-foreground bg-muted" },
  under_review:   { label: "Under Review",   color: "text-chart-4 bg-chart-4/15" },
  planned:        { label: "Planned",        color: "text-chart-3 bg-chart-3/15" },
  implemented:    { label: "Implemented",    color: "text-success bg-success/15" },
  archived:       { label: "Archived",       color: "text-muted-foreground bg-muted" },
  rejected:       { label: "Rejected",       color: "text-destructive bg-destructive/15" },
};

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, { label }]) => ({ value, label }));

export default function SuggestionCard({ suggestion, isAdmin, onRefresh }) {
  const cat = CATEGORY_META[suggestion.category] || CATEGORY_META.other_feedback;
  const stat = STATUS_META[suggestion.status] || STATUS_META.pending_review;

  const handleStatusChange = async (newStatus) => {
    await base44.entities.Suggestion.update(suggestion.id, { status: newStatus });
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this suggestion?")) return;
    await base44.entities.Suggestion.delete(suggestion.id);
    onRefresh();
  };

  return (
    <GlassCard className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${cat.color}`}>
            {cat.icon} {cat.label}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${stat.color}`}>
            {stat.label}
          </span>
        </div>
        {isAdmin && (
          <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <h4 className="font-medium leading-snug">{suggestion.title}</h4>
      <p className="text-sm text-muted-foreground leading-relaxed">{suggestion.description}</p>

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">
          by {suggestion.is_anonymous ? "Anonymous" : (suggestion.submitted_by_name || "Unknown")}
        </span>
        {isAdmin && (
          <Select value={suggestion.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-7 w-36 text-xs bg-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </GlassCard>
  );
}