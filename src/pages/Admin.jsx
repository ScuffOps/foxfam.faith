import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, X, ShieldAlert, Handshake, Lightbulb, Cake, BarChart3, CalendarPlus, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import GlassCard from "../components/GlassCard";

const TABS = [
  { key: "ideas", label: "Ideas & Feedback", icon: Lightbulb },
  { key: "polls", label: "Polls", icon: BarChart3 },
  { key: "collabs", label: "Collab Requests", icon: Handshake },
  { key: "birthdays", label: "Birthdays", icon: Cake },
];

export default function Admin() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("ideas");
  const [data, setData] = useState({ ideas: [], polls: [], collabs: [], birthdays: [] });
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    try { const me = await base44.auth.me(); setUser(me); } catch {}
    const [posts, collabs, birthdays] = await Promise.all([
      base44.entities.CommunityPost.filter({ status: "pending" }),
      base44.entities.CollabRequest.filter({ status: "pending" }),
      base44.entities.Birthday.filter({ status: "pending" }),
    ]);
    setData({
      ideas: posts.filter((p) => p.type !== "poll"),
      polls: posts.filter((p) => p.type === "poll"),
      collabs,
      birthdays,
    });
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const isAdmin = user?.role === "admin" || user?.role === "mod";

  if (!loading && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ShieldAlert className="h-10 w-10 text-destructive mb-3" />
        <h2 className="font-heading text-lg font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-1">This page is for admins and mods only.</p>
      </div>
    );
  }

  const counts = {
    ideas: data.ideas.length,
    polls: data.polls.length,
    collabs: data.collabs.length,
    birthdays: data.birthdays.length,
  };
  const totalPending = Object.values(counts).reduce((a, b) => a + b, 0);

  // --- Action handlers ---
  const updatePost = async (id, update) => {
    await base44.entities.CommunityPost.update(id, update);
    loadAll();
  };
  const updateCollab = async (id, status) => {
    await base44.entities.CollabRequest.update(id, { status });
    loadAll();
  };
  const updateBirthday = async (id, status) => {
    await base44.entities.Birthday.update(id, { status });
    loadAll();
  };
  const convertToEvent = async (post) => {
    await base44.entities.Event.create({
      title: post.title,
      description: post.description || "",
      category: "community",
      start_date: new Date().toISOString(),
      status: "active",
    });
    await base44.entities.CommunityPost.update(post.id, { status: "converted" });
    loadAll();
  };
  const addToRoadmap = async (id) => {
    await base44.entities.CommunityPost.update(id, { status: "approved", roadmap_status: "planned" });
    loadAll();
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Admin Panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalPending > 0 ? `${totalPending} item${totalPending > 1 ? "s" : ""} awaiting review` : "All clear — nothing pending!"}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1 border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {counts[key] > 0 && (
              <span className="ml-1 rounded-full bg-primary/20 text-primary px-1.5 py-0.5 text-[10px] font-bold leading-none">
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <>
          {/* IDEAS & FEEDBACK */}
          {activeTab === "ideas" && (
            <Section
              items={data.ideas}
              empty="No pending ideas or feedback."
              renderItem={(post) => (
                <GlassCard key={post.id}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{post.title}</span>
                        <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground capitalize">{post.type}</span>
                      </div>
                      {post.description && <p className="text-xs text-muted-foreground mb-1">{post.description}</p>}
                      <p className="text-[10px] text-muted-foreground">by {post.submitted_by_name || "Anonymous"} · {post.upvotes || 0} upvotes</p>
                    </div>
                    <ApproveReject
                      onApprove={() => updatePost(post.id, { status: "approved" })}
                      onReject={() => updatePost(post.id, { status: "rejected" })}
                      extra={[
                        { label: "Convert to Event", icon: CalendarPlus, onClick: () => convertToEvent(post) },
                        { label: "Add to Roadmap", icon: Map, onClick: () => addToRoadmap(post.id) },
                      ]}
                    />
                  </div>
                </GlassCard>
              )}
            />
          )}

          {/* POLLS */}
          {activeTab === "polls" && (
            <Section
              items={data.polls}
              empty="No pending polls."
              renderItem={(post) => (
                <GlassCard key={post.id}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm mb-1">{post.title}</p>
                      {post.description && <p className="text-xs text-muted-foreground mb-2">{post.description}</p>}
                      {(post.poll_options || []).map((o) => (
                        <div key={o.id} className="text-xs text-muted-foreground flex items-center gap-2 mb-0.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/40 inline-block" />
                          {o.text}
                        </div>
                      ))}
                      <p className="text-[10px] text-muted-foreground mt-2">by {post.submitted_by_name || "Anonymous"}</p>
                    </div>
                    <ApproveReject
                      onApprove={() => updatePost(post.id, { status: "approved" })}
                      onReject={() => updatePost(post.id, { status: "rejected" })}
                    />
                  </div>
                </GlassCard>
              )}
            />
          )}

          {/* COLLABS */}
          {activeTab === "collabs" && (
            <Section
              items={data.collabs}
              empty="No pending collab requests."
              renderItem={(req) => (
                <GlassCard key={req.id}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{req.game_category}</span>
                        {req.estimated_duration && (
                          <span className="text-[10px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">{req.estimated_duration}</span>
                        )}
                        {req.shared_chat && (
                          <span className="text-[10px] rounded-full bg-accent/10 border border-accent/20 text-accent px-2 py-0.5">Shared Chat</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{req.description}</p>
                      {req.extra_info && <p className="text-xs text-muted-foreground/60 italic">"{req.extra_info}"</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">by {req.submitted_by_name || "Creator"}</p>
                    </div>
                    <ApproveReject
                      onApprove={() => updateCollab(req.id, "approved")}
                      onReject={() => updateCollab(req.id, "rejected")}
                    />
                  </div>
                </GlassCard>
              )}
            />
          )}

          {/* BIRTHDAYS */}
          {activeTab === "birthdays" && (
            <Section
              items={data.birthdays}
              empty="No pending birthday submissions."
              renderItem={(b) => (
                <GlassCard key={b.id}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{b.display_name}</p>
                      <p className="text-xs text-muted-foreground">{b.birthday_date}{b.is_private ? " (age private)" : ""}</p>
                      {b.note && <p className="text-xs text-muted-foreground/70 italic mt-0.5">"{b.note}"</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">submitted by {b.submitted_by_name || b.submitted_by_email || "member"}</p>
                    </div>
                    <ApproveReject
                      onApprove={() => updateBirthday(b.id, "approved")}
                      onReject={() => updateBirthday(b.id, "rejected")}
                    />
                  </div>
                </GlassCard>
              )}
            />
          )}
        </>
      )}
    </div>
  );
}

function Section({ items, empty, renderItem }) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/30 p-10 text-center">
        <p className="text-sm text-muted-foreground">{empty}</p>
      </div>
    );
  }
  return <div className="space-y-3">{items.map(renderItem)}</div>;
}

function ApproveReject({ onApprove, onReject, extra = [] }) {
  return (
    <div className="flex flex-col gap-1.5 items-end shrink-0">
      <div className="flex gap-1.5">
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-success hover:bg-success/10" onClick={onApprove}>
          <Check className="h-3 w-3" /> Approve
        </Button>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10" onClick={onReject}>
          <X className="h-3 w-3" /> Reject
        </Button>
      </div>
      {extra.map(({ label, icon: Icon, onClick }) => (
        <Button key={label} size="sm" variant="ghost" className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={onClick}>
          <Icon className="h-3 w-3" /> {label}
        </Button>
      ))}
    </div>
  );
}
