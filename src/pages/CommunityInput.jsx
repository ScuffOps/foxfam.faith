import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { communityClient } from "@/api/communityClient";
import { Plus, Search, ArrowUp, TrendingUp, Clock, BarChart3, Mailbox, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import PostForm from "../components/community/PostForm";
import IdeaCard from "../components/community/IdeaCard";
import PollCard from "../components/community/PollCard";
import BugReportForm from "../components/community/BugReportForm";
import BugReportCard from "../components/community/BugReportCard";
import { BUG_REPORT_DESCRIPTION } from "@/lib/bugReport";
import SuggestionForm from "../components/community/SuggestionForm";
import SuggestionCard from "../components/community/SuggestionCard";
import ProgressionLoop from "../components/ProgressionLoop";
import { canModerate } from "@/lib/roles";
import { sortCommunityPosts } from "@/lib/communitySorting";
import { isPubliclyHiddenFeaturePost } from "@/lib/hiddenFeatures";

const TABS = [
  { key: "feedback", label: "Feedback & Ideas" },
  { key: "polls", label: "Polls" },
  { key: "updates", label: "Updates" },
  { key: "bugs", label: "Bug Reports" },
  { key: "suggestions", label: "Suggestion Box" },
];

const getValidTab = (tab, fallback = "feedback") => {
  if (TABS.some((item) => item.key === tab)) return tab;
  if (TABS.some((item) => item.key === fallback)) return fallback;
  return "feedback";
};

const SORT_OPTIONS = [
  { key: "top", label: "Top", icon: ArrowUp },
  { key: "new", label: "New", icon: Clock },
  { key: "trending", label: "Trending", icon: TrendingUp },
];

const CLOSED_POST_STATUSES = new Set(["closed", "archived", "converted", "rejected"]);
const CLOSED_BUG_STATUSES = new Set(["closed", "fixed", "cannot_reproduce"]);
const CLOSED_SUGGESTION_STATUSES = new Set(["archived", "implemented", "rejected"]);

function matchesBoardView(status, boardView, closedStatuses) {
  if (boardView === "all") return true;
  const closed = closedStatuses.has(status);
  return boardView === "closed" ? closed : !closed;
}

export default function CommunityInput({ defaultTab = "feedback" }) {
  const [searchParams] = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [bugReports, setBugReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBugForm, setShowBugForm] = useState(false);
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [activeTab, setActiveTab] = useState(() => getValidTab(searchParams.get("tab") || defaultTab));
  const [sort, setSort] = useState("top");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("approved");
  const [boardView, setBoardView] = useState("active");

  const loadData = async () => {
    setLoading(true);
    try { const me = await communityClient.auth.me(); setUser(me); } catch {}
    const [all, allSuggestions, allBugReports] = await Promise.all([
      communityClient.entities.CommunityPost.list("-created_date", 200).catch(() => []),
      communityClient.entities.Suggestion.list("-created_date", 200).catch(() => []),
      communityClient.entities.BugReport.list("-created_date", 100).catch(() => []),
    ]);
    setPosts(all);
    setSuggestions(allSuggestions);
    setBugReports(allBugReports);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const nextTab = getValidTab(searchParams.get("tab") || defaultTab);
    setActiveTab(nextTab);
  }, [defaultTab, searchParams]);

  const isAdmin = canModerate(user);
  const publicPosts = posts.filter((post) => !isPubliclyHiddenFeaturePost(post));
  const pendingCount = publicPosts.filter((p) => p.status === "pending").length;

  const filtered = sortCommunityPosts(
    publicPosts.filter((p) => {
      if (activeTab === "feedback" && (p.type === "poll" || p.type === "update")) return false;
      if (activeTab === "polls" && p.type !== "poll") return false;
      if (activeTab === "updates" && p.type !== "update") return false;
      if (statusFilter === "closed") {
        if (!CLOSED_POST_STATUSES.has(p.status)) return false;
      } else {
        if (!matchesBoardView(p.status, boardView, CLOSED_POST_STATUSES)) return false;
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
      }
      if (search && !p.title.toLowerCase().includes(search.toLowerCase()) &&
          !(p.description || "").toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }),
    sort,
  );

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Community</h1>
          <p className="mt-1 text-sm text-muted-foreground">Share ideas, feedback, and vote on what matters most</p>
        </div>
        {activeTab === "bugs" ? (
          <Button onClick={() => setShowBugForm(true)} className="gap-2">
            <Bug className="h-4 w-4" /> Report Bug
          </Button>
        ) : activeTab === "suggestions" ? (
          <Button onClick={() => setShowSuggestionForm(true)} className="gap-2">
            <Mailbox className="h-4 w-4" /> New Suggestion
          </Button>
        ) : (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Post
          </Button>
        )}
      </div>

      <div className="mb-5">
        <ProgressionLoop compact />
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Community sections">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Suggestion Box tab content */}
      {activeTab === "suggestions" && (
        <div>
          <ArchiveViewToggle value={boardView} onChange={setBoardView} />
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Mailbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No suggestions yet — be the first!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions
                .filter((s) => matchesBoardView(s.status, boardView, CLOSED_SUGGESTION_STATUSES))
                .filter((s) => !search || s.title.toLowerCase().includes(search.toLowerCase()) || (s.description || "").toLowerCase().includes(search.toLowerCase()))
                .map((s) => (
                  <SuggestionCard key={s.id} suggestion={s} isAdmin={isAdmin} onRefresh={loadData} />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Bug reports tab content */}
      {activeTab === "bugs" && (
        <div>
          <div className="mb-4 flex flex-col gap-2 rounded-xl border border-border bg-card/55 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-base font-semibold">Bug Reports</h2>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">{BUG_REPORT_DESCRIPTION}</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bugs..."
                className="h-8 w-full rounded-lg border border-border bg-secondary/50 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring sm:w-56"
              />
            </div>
          </div>
          <ArchiveViewToggle value={boardView} onChange={setBoardView} />
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          ) : bugReports.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Bug className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No bugs reported. Suspiciously peaceful.</p>
              <Button className="mt-4 gap-2" onClick={() => setShowBugForm(true)}>
                <Plus className="h-4 w-4" /> Report the first bug
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {bugReports
                .filter((report) => matchesBoardView(report.status || "open", boardView, CLOSED_BUG_STATUSES))
                .filter((report) => !search || report.title.toLowerCase().includes(search.toLowerCase()) || (report.description || "").toLowerCase().includes(search.toLowerCase()))
                .map((report) => (
                  <BugReportCard key={report.id} report={report} isAdmin={isAdmin} onRefresh={loadData} />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Toolbar — only for non-suggestion tabs */}
      {activeTab !== "suggestions" && activeTab !== "bugs" && <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        {/* Sort */}
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-0.5">
          {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSort(key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                sort === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 rounded-lg border border-border bg-secondary/50 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-40"
            />
          </div>

          {/* Status filter */}
          <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5">
            {[
              { key: "approved", label: "Approved" },
              ...(isAdmin ? [{ key: "pending", label: `Pending ${pendingCount > 0 ? `(${pendingCount})` : ""}` }] : []),
              { key: "closed", label: "Closed" },
              { key: "all", label: "All" },
            ].map((b) => (
              <button
                key={b.key}
                onClick={() => setStatusFilter(b.key)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === b.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>}

      {/* Posts — only for non-suggestion tabs */}
      {activeTab !== "suggestions" && activeTab !== "bugs" && (loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No posts found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) =>
            post.type === "poll" ? (
              <PollCard key={post.id} post={post} isAdmin={isAdmin} user={user} onRefresh={loadData} />
            ) : (
              <IdeaCard key={post.id} post={post} isAdmin={isAdmin} user={user} onRefresh={loadData} />
            )
          )}
        </div>
      ))}

      <PostForm open={showForm} onOpenChange={setShowForm} onCreated={loadData} isMod={isAdmin} />
      <BugReportForm open={showBugForm} onOpenChange={setShowBugForm} onCreated={loadData} />
      <SuggestionForm open={showSuggestionForm} onOpenChange={setShowSuggestionForm} onCreated={loadData} />
    </div>
  );
}

function ArchiveViewToggle({ value, onChange }) {
  const options = [
    { key: "active", label: "Active" },
    { key: "closed", label: "Closed / Archived" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="mb-4 flex w-fit rounded-lg border border-border bg-secondary/50 p-0.5">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === option.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
