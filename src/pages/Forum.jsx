import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Clock, MessageSquare, Plus, Search, Sparkles, TrendingUp } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { communityClient } from "@/api/communityClient";
import ForumThreadCard from "@/components/community/ForumThreadCard";
import ForumThreadForm from "@/components/community/ForumThreadForm";
import ForumCommunityPulse from "@/components/forum/ForumCommunityPulse";
import ForumLiveChat from "@/components/forum/ForumLiveChat";
import { FORUM_SECTIONS, getForumSection, normalizeForumCategory } from "@/lib/forumSections";
import { canModerateForum } from "@/lib/roles";
import { useContentCreatedRefresh } from "@/hooks/useContentCreatedRefresh";

const SORT_OPTIONS = [
  { key: "latest", label: "Latest", icon: Clock },
  { key: "active", label: "Active", icon: TrendingUp },
  { key: "praised", label: "Praised", icon: Sparkles },
];

const ALL_SECTION = {
  id: "all",
  label: "All Threads",
  description: "Every subforum, newest movement first.",
};

export default function Forum() {
  const [searchParams] = useSearchParams();
  const requestedSection = normalizeForumCategory(searchParams.get("section"));
  const popoutMode = searchParams.get("chat") === "popout";
  const [threads, setThreads] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showThreadForm, setShowThreadForm] = useState(searchParams.get("compose") === "1");
  const [activeSection, setActiveSection] = useState(
    searchParams.has("section") ? requestedSection : "all"
  );
  const [sort, setSort] = useState("latest");
  const [search, setSearch] = useState("");
  const [activeUsers, setActiveUsers] = useState([]);
  const deferredSearch = useDeferredValue(search);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [me, allThreads] = await Promise.all([
        communityClient.auth.me().catch(() => null),
        communityClient.entities.CommunityThread.list("-created_date", 200).catch(() => []),
      ]);
      setUser(me);
      setThreads(allThreads);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useContentCreatedRefresh(loadData);

  const isForumModerator = canModerateForum(user);
  const sectionOptions = [ALL_SECTION, ...FORUM_SECTIONS];
  const selectedDefaultCategory = activeSection === "all" ? "general" : activeSection;

  const sectionCounts = useMemo(() => threads.reduce((counts, thread) => {
    const category = normalizeForumCategory(thread.category);
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {}), [threads]);

  const filteredThreads = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    const filtered = threads.filter((thread) => {
      const section = getForumSection(thread.category);
      if (activeSection !== "all" && section.id !== activeSection) return false;
      if (!needle) return true;
      return [
        thread.title,
        thread.body,
        thread.author_name,
        section.label,
        ...(thread.tags || []),
      ].join(" ").toLowerCase().includes(needle);
    });

    return filtered.sort((a, b) => {
      if (sort === "active") {
        const scoreA = (a.comment_count || 0) * 2 + (a.reactions || 0);
        const scoreB = (b.comment_count || 0) * 2 + (b.reactions || 0);
        if (scoreA !== scoreB) return scoreB - scoreA;
      }
      if (sort === "praised") {
        const praiseDelta = (b.reactions || 0) - (a.reactions || 0);
        if (praiseDelta !== 0) return praiseDelta;
      }
      return new Date(b.created_date || b.created_at || 0)
        - new Date(a.created_date || a.created_at || 0);
    });
  }, [activeSection, deferredSearch, sort, threads]);

  if (popoutMode) {
    return <ForumLiveChat initialOpen popoutMode user={user} />;
  }

  return (
    <div className="forum-page animate-fade-in">
      <header className="forum-hero">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Forum</h1>
          <p>Threads, replies, praise, and earned recognition. Mildly parasocial, lovingly supervised.</p>
        </div>
        <div className="forum-hero-actions">
          <label className="forum-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Search forum</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search forum..."
            />
          </label>
          <Button onClick={() => setShowThreadForm(true)} className="gap-2">
            <Plus className="h-4 w-4" /> New Thread
          </Button>
        </div>
      </header>

      <nav className="forum-category-strip" aria-label="Forum sections">
        {sectionOptions.map((section) => {
          const count = section.id === "all" ? threads.length : sectionCounts[section.id] || 0;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              aria-pressed={activeSection === section.id}
              className="forum-category-tab"
            >
              <span>{section.label}</span>
              <span className="forum-category-count">{count}</span>
            </button>
          );
        })}
      </nav>

      <div className="forum-toolbar">
        <div className="forum-sort-group" aria-label="Sort threads">
          {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSort(key)}
              aria-pressed={sort === key}
              className="forum-sort-button"
            >
              <Icon aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
        <p className="forum-result-count" aria-live="polite">
          {filteredThreads.length} {filteredThreads.length === 1 ? "thread" : "threads"}
        </p>
      </div>

      <div className="forum-content-grid">
        <section className="forum-thread-list" aria-label="Forum threads">
          {loading ? (
            <div className="forum-loading" aria-label="Loading forum">
              <div className="h-7 w-7 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="forum-empty">
              <MessageSquare aria-hidden="true" />
              <p>No threads here yet. Suspiciously peaceful.</p>
              <Button className="mt-4 gap-2" onClick={() => setShowThreadForm(true)}>
                <Plus className="h-4 w-4" /> Start the first thread
              </Button>
            </div>
          ) : (
            filteredThreads.map((thread) => (
              <ForumThreadCard
                key={thread.id}
                thread={thread}
                user={user}
                isAdmin={isForumModerator}
                onRefresh={loadData}
              />
            ))
          )}
        </section>
        <ForumCommunityPulse activeUsers={activeUsers} threads={threads} />
      </div>

      <ForumThreadForm
        open={showThreadForm}
        onOpenChange={setShowThreadForm}
        user={user}
        onCreated={loadData}
        defaultCategory={selectedDefaultCategory}
      />
      <ForumLiveChat user={user} onPresenceChange={setActiveUsers} />
    </div>
  );
}
