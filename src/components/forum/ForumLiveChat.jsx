import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MessageCircle, MoreVertical, Volume2, VolumeX } from "lucide-react";
import ForumChatPanel from "@/components/forum/ForumChatPanel";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForumChat } from "@/hooks/useForumChat";

const STORAGE_KEY = "foxfam.forumChat.preferences.v1";
const DEFAULT_PREFERENCES = { edge: "right", offset: 0.82, quiet: false };

function loadPreferences() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      edge: ["top", "right", "bottom", "left"].includes(parsed.edge) ? parsed.edge : DEFAULT_PREFERENCES.edge,
      offset: Number.isFinite(parsed.offset) ? Math.min(0.92, Math.max(0.08, parsed.offset)) : DEFAULT_PREFERENCES.offset,
      quiet: Boolean(parsed.quiet),
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function getSealStyle(preferences) {
  const offset = `${preferences.offset * 100}%`;
  if (preferences.edge === "top") return { top: 16, left: offset, transform: "translateX(-50%)" };
  if (preferences.edge === "bottom") return { bottom: 16, left: offset, transform: "translateX(-50%)" };
  if (preferences.edge === "left") return { left: 16, top: offset, transform: "translateY(-50%)" };
  return { right: 16, top: offset, transform: "translateY(-50%)" };
}

function nearestEdge(x, y) {
  const distances = [
    ["left", x],
    ["right", window.innerWidth - x],
    ["top", y],
    ["bottom", window.innerHeight - y],
  ].sort((a, b) => a[1] - b[1]);
  const edge = distances[0][0];
  const offset = edge === "left" || edge === "right" ? y / window.innerHeight : x / window.innerWidth;
  return { edge, offset: Math.min(0.92, Math.max(0.08, offset)) };
}

export default function ForumLiveChat({
  initialOpen = false,
  onPresenceChange,
  popoutMode = false,
  user,
}) {
  const [open, setOpen] = useState(initialOpen || popoutMode);
  const [preferences, setPreferences] = useState(loadPreferences);
  const [dragging, setDragging] = useState(false);
  const moved = useRef(false);
  const chat = useForumChat({ open, user });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    onPresenceChange?.(chat.presence);
  }, [chat.presence, onPresenceChange]);

  const sealStyle = useMemo(() => getSealStyle(preferences), [preferences]);

  function move(edge, delta = 0) {
    setPreferences((current) => ({
      ...current,
      edge,
      offset: Math.min(0.92, Math.max(0.08, current.offset + delta)),
    }));
  }

  function beginDrag(event) {
    if (event.button !== 0) return;
    moved.current = false;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function dragSeal(event) {
    if (!dragging) return;
    moved.current = true;
    const next = nearestEdge(event.clientX, event.clientY);
    setPreferences((current) => ({ ...current, ...next }));
  }

  function endDrag(event) {
    if (!dragging) return;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
    if (!moved.current) setOpen(true);
  }

  function openPopout() {
    window.open("/forum?chat=popout", "foxfam-live-chat", "popup,width=390,height=720");
  }

  if (popoutMode) {
    return (
      <div className="forum-chat-popout">
        <ForumChatPanel chat={chat} onClose={() => window.close()} onQuietChange={(quiet) => setPreferences((current) => ({ ...current, quiet }))} quiet={preferences.quiet} user={user} />
      </div>
    );
  }

  return (
    <>
      {!open ? (
        <div className="forum-chat-seal-wrap" style={sealStyle}>
          <button
            type="button"
            className={`forum-chat-seal ${chat.unreadCount ? "has-unread" : ""} ${preferences.quiet ? "is-quiet" : ""}`}
            onPointerDown={beginDrag}
            onPointerMove={dragSeal}
            onPointerUp={endDrag}
            onDoubleClick={openPopout}
            aria-label={`Open Foxfam live chat${chat.unreadCount ? `, ${chat.unreadCount} unread` : ""}`}
            title="Open live chat. Drag to dock."
          >
            <span aria-hidden="true">S</span>
            {chat.unreadCount > 0 ? (
              <span className={`forum-chat-unread ${chat.unreadCount > 99 ? "is-dot" : ""}`}>
                {chat.unreadCount > 99 ? "" : chat.unreadCount}
              </span>
            ) : null}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="forum-chat-seal-menu" aria-label="Live chat position and quiet mode">
                <MoreVertical className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end">
              <DropdownMenuItem onSelect={() => move("left")}><ArrowLeft /> Dock left</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => move("right")}><ArrowRight /> Dock right</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => move("top")}><ArrowUp /> Dock top</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => move("bottom")}><ArrowDown /> Dock bottom</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={preferences.quiet} onCheckedChange={(quiet) => setPreferences((current) => ({ ...current, quiet }))}>
                {preferences.quiet ? <VolumeX className="mr-2 h-4 w-4" /> : <Volume2 className="mr-2 h-4 w-4" />}
                Quiet mode
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <div className="forum-chat-window">
          <ForumChatPanel
            chat={chat}
            onClose={() => setOpen(false)}
            onPopout={openPopout}
            onQuietChange={(quiet) => setPreferences((current) => ({ ...current, quiet }))}
            quiet={preferences.quiet}
            user={user}
          />
        </div>
      )}
      <span className="sr-only" aria-live="polite">
        {chat.connection === "reconnecting" ? "Live chat reconnecting" : ""}
      </span>
      {!open && chat.error ? (
        <span className="fixed bottom-3 right-3 hidden"><MessageCircle />{chat.error}</span>
      ) : null}
    </>
  );
}
