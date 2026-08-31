import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Bug, CalendarPlus, Feather, HeartHandshake, Lightbulb, MessageSquarePlus, Plus, ScrollText, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { canCreateForumThread, canModerate, canPublishShrinePosts } from "@/lib/roles";
import { OPEN_CREATE_EVENT, SUBMISSION_RECEIPT_EVENT } from "@/lib/userFlow";
import SubmissionReceiptDialog from "@/components/flow/SubmissionReceiptDialog";

const PostForm = lazy(() => import("@/components/community/PostForm"));
const ForumThreadForm = lazy(() => import("@/components/community/ForumThreadForm"));
const SuggestionForm = lazy(() => import("@/components/community/SuggestionForm"));
const BugReportForm = lazy(() => import("@/components/community/BugReportForm"));
const OfferingForm = lazy(() => import("@/components/offerings/OfferingForm"));
const ReliquaryForm = lazy(() => import("@/components/reliquary/ReliquaryForm"));
const BlessingForm = lazy(() => import("@/components/blessings/BlessingForm"));
const EventFormDialog = lazy(() => import("@/components/calendar/EventFormDialog"));

const BASE_ACTIONS = [
  { key: "post", label: "Community post", description: "Share an idea, feedback, update, or poll.", icon: MessageSquarePlus },
  { key: "offering", label: "Offering", description: "Share art, music, writing, video, or files.", icon: HeartHandshake },
  { key: "suggestion", label: "Suggestion", description: "Offer feedback or a portal idea.", icon: Lightbulb },
  { key: "bug", label: "Bug report", description: "Document something broken or confusing.", icon: Bug },
];

const CREATE_ACTION_BY_PATH = {
  "/community": "post",
  "/polls": "post",
  "/feedback": "post",
  "/forum": "forum",
  "/offerings": "offering",
  "/reliquary": "reliquary",
  "/suggestions": "suggestion",
  "/bugs": "bug",
  "/blessings": "blessing",
  "/events": "event",
};

export default function GlobalCreate() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeForm, setActiveForm] = useState("");
  const [receipt, setReceipt] = useState(null);
  const actions = useMemo(() => {
    const available = [...BASE_ACTIONS];
    if (canCreateForumThread(user)) {
      available.splice(1, 0, { key: "forum", label: "Forum thread", description: "Start a longer community discussion.", icon: ScrollText });
    }
    if (canPublishShrinePosts(user)) {
      available.push(
        { key: "reliquary", label: "Reliquary entry", description: "Leave poetry, lore, stories, or memories.", icon: Feather },
        { key: "blessing", label: "Blessing", description: "Add a small piece of community care.", icon: Sparkles },
      );
    }
    if (canModerate(user)) {
      available.push({ key: "event", label: "Calendar event", description: "Add a community or staff event.", icon: CalendarPlus });
    }
    return available;
  }, [user]);
  const routeAction = CREATE_ACTION_BY_PATH[location.pathname] || "";
  const routeActionConfig = actions.find((action) => action.key === routeAction);
  const showCreateButton = location.pathname === "/" || Boolean(routeActionConfig);

  useEffect(() => {
    const openCreate = (event) => {
      const action = event.detail?.action || "";
      if (action) setActiveForm(action);
      else setMenuOpen(true);
    };
    const showReceipt = (event) => setReceipt(event.detail || {});
    window.addEventListener(OPEN_CREATE_EVENT, openCreate);
    window.addEventListener(SUBMISSION_RECEIPT_EVENT, showReceipt);
    return () => {
      window.removeEventListener(OPEN_CREATE_EVENT, openCreate);
      window.removeEventListener(SUBMISSION_RECEIPT_EVENT, showReceipt);
    };
  }, []);

  const chooseAction = (action) => {
    setMenuOpen(false);
    setActiveForm(action);
  };
  const openCreate = () => {
    if (routeActionConfig) chooseAction(routeActionConfig.key);
    else setMenuOpen(true);
  };
  const closeForm = () => setActiveForm("");
  const refreshCurrentPage = () => window.dispatchEvent(new CustomEvent("foxfam:content-created"));
  const formProps = { open: true, onOpenChange: (open) => !open && closeForm() };
  const activeComposer = (() => {
    switch (activeForm) {
      case "post": return <PostForm {...formProps} onCreated={refreshCurrentPage} isMod={canModerate(user)} />;
      case "forum": return <ForumThreadForm {...formProps} user={user} onCreated={refreshCurrentPage} />;
      case "suggestion": return <SuggestionForm {...formProps} onCreated={refreshCurrentPage} />;
      case "bug": return <BugReportForm {...formProps} onCreated={refreshCurrentPage} />;
      case "offering": return <OfferingForm {...formProps} user={user} onCreated={refreshCurrentPage} />;
      case "reliquary": return canPublishShrinePosts(user) ? <ReliquaryForm {...formProps} user={user} onSaved={refreshCurrentPage} /> : null;
      case "blessing": return canPublishShrinePosts(user) ? <BlessingForm {...formProps} user={user} onCreated={refreshCurrentPage} /> : null;
      case "event": return canModerate(user) ? <EventFormDialog {...formProps} event={null} onSaved={refreshCurrentPage} /> : null;
      default: return null;
    }
  })();

  return (
    <>
      {showCreateButton ? (
        <Button
          type="button"
          onClick={openCreate}
          className="fixed bottom-5 right-5 z-[60] h-12 gap-2 rounded-full px-5 shadow-[0_14px_36px_rgba(0,0,0,0.45)] md:bottom-7 md:right-7"
          aria-label={routeActionConfig ? `Create ${routeActionConfig.label.toLowerCase()}` : "Create a new contribution"}
        >
          <Plus className="h-5 w-5" /> <span>New</span>
        </Button>
      ) : null}

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          className="!bottom-0 !top-auto max-h-[76dvh] w-[calc(100%-1rem)] !translate-y-0 overflow-hidden rounded-t-xl border-border bg-[#090b18] p-0 sm:!bottom-auto sm:!top-1/2 sm:max-h-[88vh] sm:max-w-xl sm:!-translate-y-1/2 sm:rounded-lg"
        >
          <div className="sticky top-0 z-10 border-b border-border bg-[#090b18] px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
            <DialogHeader>
              <DialogTitle className="font-heading">Add to Foxfam</DialogTitle>
              <DialogDescription>Choose where your next contribution belongs. The portal will keep unfinished text safe locally.</DialogDescription>
            </DialogHeader>
          </div>
          <div className="grid overflow-y-auto px-3 py-3 sm:grid-cols-2 sm:px-6 sm:pb-6 sm:pt-2">
            {actions.map(({ key, label, description, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => chooseAction(key)}
                className="flex min-h-[4.5rem] items-center gap-3 border-b border-border/70 bg-[#111426] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[#181c32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:m-1 sm:min-h-24 sm:items-start sm:rounded-lg sm:border sm:p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Icon className="h-4 w-4" /></span>
                <span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span></span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate("/prayer"); }}
              className="flex min-h-[4.5rem] items-center gap-3 border-b border-border/70 bg-[#111426] px-3 py-2.5 text-left transition-colors last:border-b-0 hover:bg-[#181c32] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:m-1 sm:min-h-24 sm:items-start sm:rounded-lg sm:border sm:p-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Sparkles className="h-4 w-4" /></span>
              <span><span className="block text-sm font-semibold">Prayer</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Leave a prayer or word of light on the wall.</span></span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        {activeComposer}
      </Suspense>

      <SubmissionReceiptDialog receipt={receipt} onOpenChange={(open) => !open && setReceipt(null)} />
    </>
  );
}
