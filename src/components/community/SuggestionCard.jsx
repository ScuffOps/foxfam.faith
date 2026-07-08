import { useState } from "react";
import { communityClient } from "@/api/communityClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit3, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import GlassCard from "../GlassCard";
import { canEditCommunityRecord } from "@/lib/editPermissions";

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
  approved:       { label: "Approved",       color: "text-primary bg-primary/15" },
  planned:        { label: "Planned",        color: "text-chart-3 bg-chart-3/15" },
  implemented:    { label: "Implemented",    color: "text-success bg-success/15" },
  archived:       { label: "Archived",       color: "text-muted-foreground bg-muted" },
  rejected:       { label: "Rejected",       color: "text-destructive bg-destructive/15" },
};

const STATUS_OPTIONS = Object.entries(STATUS_META).map(([value, { label }]) => ({ value, label }));

export default function SuggestionCard({ suggestion, isAdmin, user, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: suggestion.title || "",
    description: suggestion.description || "",
    category: suggestion.category || "other_feedback",
  });
  const cat = CATEGORY_META[suggestion.category] || CATEGORY_META.other_feedback;
  const stat = STATUS_META[suggestion.status] || STATUS_META.pending_review;
  const canEdit = canEditCommunityRecord(user, suggestion);

  const handleSaveEdit = async () => {
    if (!editForm.title.trim()) return;
    await communityClient.entities.Suggestion.update(suggestion.id, {
      title: editForm.title.trim(),
      description: editForm.description,
      category: editForm.category,
      edited_at: new Date().toISOString(),
    });
    setEditing(false);
    onRefresh();
  };

  const handleStatusChange = async (newStatus) => {
    await communityClient.entities.Suggestion.update(suggestion.id, { status: newStatus });
    onRefresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this suggestion?")) return;
    await communityClient.entities.Suggestion.delete(suggestion.id);
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
        {(canEdit || isAdmin) && (
          <div className="flex shrink-0 gap-1">
            {canEdit && !editing && (
              <button onClick={() => setEditing(true)} className="text-muted-foreground transition-colors hover:text-foreground" aria-label="Edit suggestion">
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            )}
            {isAdmin && (
              <button onClick={handleDelete} className="text-muted-foreground hover:text-destructive transition-colors" aria-label="Delete suggestion">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <Input value={editForm.title} onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} className="bg-secondary/60" />
          <Select value={editForm.category} onValueChange={(value) => setEditForm((current) => ({ ...current, category: value }))}>
            <SelectTrigger className="bg-secondary/60"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_META).map(([value, meta]) => (
                <SelectItem key={value} value={value}>{meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className="min-h-24 bg-secondary/60 text-sm" />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setEditForm({ title: suggestion.title || "", description: suggestion.description || "", category: suggestion.category || "other_feedback" }); }}>Cancel</Button>
            <Button size="sm" onClick={handleSaveEdit} disabled={!editForm.title.trim()}>Save</Button>
          </div>
        </div>
      ) : (
        <>
          <h4 className="font-medium leading-snug">{suggestion.title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{suggestion.description}</p>
        </>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground">
          by {suggestion.is_anonymous ? "Guest" : (suggestion.submitted_by_name || "Guest")}
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
