import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, MessageCircle, Minus, Send, Sparkles, Trash2, Volume2, VolumeX } from "lucide-react";
import PublicAvatar from "@/components/PublicAvatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { canModerateForum } from "@/lib/roles";

const REACTIONS = [
  { key: "praise", symbol: "✦", label: "Praise" },
  { key: "heart", symbol: "♥", label: "Heart" },
  { key: "flame", symbol: "♨", label: "Flame" },
];

export default function ForumChatPanel({
  chat,
  onClose,
  onPopout,
  onQuietChange,
  quiet,
  user,
}) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);
  const isModerator = canModerateForum(user);

  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [chat.messages.length]);

  async function submitMessage(event) {
    event.preventDefault();
    if (!message.trim() || !user?.id || sending) return;
    setSending(true);
    try {
      await chat.sendMessage(message);
      setMessage("");
    } catch (error) {
      toast({ title: "Message not sent", description: error?.message || "Try again in a moment.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function toggleReaction(messageId, reaction, active) {
    try {
      await chat.toggleReaction(messageId, reaction, active);
    } catch (error) {
      toast({ title: "Reaction not saved", description: error?.message || "Sign in and try again.", variant: "destructive" });
    }
  }

  async function removeMessage(messageId) {
    try {
      await chat.removeMessage(messageId);
    } catch (error) {
      toast({ title: "Message not removed", description: error?.message || "Staff permissions may need attention.", variant: "destructive" });
    }
  }

  return (
    <section className="forum-chat-panel" aria-label="Foxfam live chat">
      <header className="forum-chat-header">
        <span className="forum-chat-mark" aria-hidden="true">S</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-heading text-sm font-semibold">Foxfam Live Chat</h2>
            <span className={`h-1.5 w-1.5 rounded-full ${
              chat.connection === "connected"
                ? "bg-emerald-400"
                : chat.connection === "idle"
                  ? "bg-muted-foreground"
                  : "bg-amber-300"
            }`} />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {chat.connection === "connected"
              ? `${chat.presence.length || 1} present`
              : chat.connection === "idle"
                ? "Sign in to connect"
                : "Reconnecting…"}
          </p>
        </div>
        <button type="button" className="forum-chat-icon-button" onClick={() => onQuietChange(!quiet)} aria-label={quiet ? "Turn chat sounds on" : "Turn chat sounds off"} title={quiet ? "Quiet mode on" : "Quiet mode off"}>
          {quiet ? <VolumeX /> : <Volume2 />}
        </button>
        {onPopout ? (
          <button type="button" className="forum-chat-icon-button hidden sm:inline-flex" onClick={onPopout} aria-label="Open chat in a separate window" title="Pop out chat">
            <ExternalLink />
          </button>
        ) : null}
        <button type="button" className="forum-chat-icon-button" onClick={onClose} aria-label="Minimize chat" title="Minimize to seal">
          <Minus />
        </button>
      </header>

      <div ref={scrollRef} className="forum-chat-messages" role="log" aria-live="polite" aria-relevant="additions">
        {chat.loading && chat.messages.length === 0 ? (
          <div className="flex min-h-52 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : chat.error && chat.messages.length === 0 ? (
          <div className="forum-chat-empty">
            <MessageCircle className="h-6 w-6" />
            <p>Chat is resting.</p>
            <span>{chat.error}</span>
          </div>
        ) : chat.messages.length === 0 ? (
          <div className="forum-chat-empty">
            <Sparkles className="h-6 w-6" />
            <p>Quiet shrine, fresh timeline.</p>
            <span>Start the first live conversation.</span>
          </div>
        ) : (
          chat.messages.map((chatMessage) => (
            <article key={chatMessage.id} className="forum-chat-message">
              <PublicAvatar src={chatMessage.author_avatar_url} name={chatMessage.author_name} size="xs" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-xs font-semibold text-foreground">{chatMessage.author_name}</span>
                  <time className="text-[9px] text-muted-foreground">{new Date(chatMessage.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>
                  {isModerator && !chatMessage.is_deleted ? (
                    <button type="button" onClick={() => removeMessage(chatMessage.id)} className="ml-auto text-muted-foreground hover:text-destructive" aria-label={`Remove message from ${chatMessage.author_name}`}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  ) : null}
                </div>
                <p className={`mt-0.5 whitespace-pre-wrap break-words text-xs leading-5 ${chatMessage.is_deleted ? "italic text-muted-foreground" : "text-foreground/85"}`}>
                  {chatMessage.is_deleted ? "Message removed by the shrine keepers." : chatMessage.body}
                </p>
                {!chatMessage.is_deleted ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {REACTIONS.map((reaction) => {
                      const active = chatMessage.reactions.mine.includes(reaction.key);
                      const count = chatMessage.reactions.counts[reaction.key] || 0;
                      if (!user?.id && count === 0) return null;
                      return (
                        <button
                          key={reaction.key}
                          type="button"
                          disabled={!user?.id}
                          onClick={() => toggleReaction(chatMessage.id, reaction.key, active)}
                          aria-label={`${reaction.label}${count ? `, ${count}` : ""}`}
                          aria-pressed={active}
                          className={`forum-chat-reaction ${active ? "is-active" : ""}`}
                        >
                          <span aria-hidden="true">{reaction.symbol}</span>
                          {count > 0 ? <span>{count}</span> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      {chat.connection !== "connected" && chat.messages.length > 0 ? (
        <p className="border-t border-border/70 px-3 py-1.5 text-center text-[10px] text-amber-200">Reconnecting… recent messages remain visible.</p>
      ) : null}

      <form className="forum-chat-composer" onSubmit={submitMessage}>
        {user?.id ? (
          <>
            <label className="sr-only" htmlFor="forum-live-message">Message Foxfam</label>
            <textarea
              id="forum-live-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) submitMessage(event);
              }}
              maxLength={1000}
              rows={1}
              placeholder="Message Foxfam…"
            />
            <Button type="submit" size="icon" disabled={!message.trim() || sending} aria-label="Send message">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </>
        ) : (
          <p className="w-full text-center text-xs leading-5 text-muted-foreground">Sign in with Twitch or Discord to open and join live chat.</p>
        )}
      </form>
    </section>
  );
}
