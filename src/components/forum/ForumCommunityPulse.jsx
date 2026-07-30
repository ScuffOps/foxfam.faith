import { Activity, MessageSquare, Sparkles, Users } from "lucide-react";
import PublicAvatar from "@/components/PublicAvatar";

export default function ForumCommunityPulse({ activeUsers, threads }) {
  const topThreads = [...threads]
    .sort((a, b) => ((b.reactions || 0) + (b.comment_count || 0)) - ((a.reactions || 0) + (a.comment_count || 0)))
    .slice(0, 3);
  const totalReplies = threads.reduce((sum, thread) => sum + (thread.comment_count || 0), 0);

  return (
    <aside className="forum-pulse" aria-label="Community pulse">
      <div className="forum-pulse-heading"><Activity className="h-4 w-4" /> Community Pulse</div>
      <section>
        <div className="forum-pulse-label"><Users className="h-3.5 w-3.5" /> Active now</div>
        {activeUsers.length ? (
          <div className="mt-2 flex -space-x-2">
            {activeUsers.slice(0, 7).map((person, index) => (
              <PublicAvatar key={`${person.displayName}-${index}`} src={person.avatarUrl} name={person.displayName} size="xs" className="ring-2 ring-card" />
            ))}
            {activeUsers.length > 7 ? <span className="forum-pulse-more">+{activeUsers.length - 7}</span> : null}
          </div>
        ) : <p className="mt-2 text-[11px] text-muted-foreground">The room is listening quietly.</p>}
      </section>
      <section>
        <div className="forum-pulse-label"><Sparkles className="h-3.5 w-3.5" /> Most active</div>
        <div className="mt-2 space-y-2">
          {topThreads.map((thread) => (
            <div key={thread.id} className="min-w-0">
              <p className="truncate text-xs font-medium text-foreground">{thread.title}</p>
              <p className="text-[10px] text-muted-foreground">{thread.comment_count || 0} replies · {thread.reactions || 0} praised</p>
            </div>
          ))}
          {topThreads.length === 0 ? <p className="text-[11px] text-muted-foreground">No pulse yet.</p> : null}
        </div>
      </section>
      <section>
        <div className="forum-pulse-label"><MessageSquare className="h-3.5 w-3.5" /> Forum milestones</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div><strong>{threads.length}</strong><span>threads</span></div>
          <div><strong>{totalReplies}</strong><span>replies</span></div>
        </div>
      </section>
    </aside>
  );
}
