import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadForumChat,
  markForumChatRead,
  removeForumChatMessage,
  sendForumChatMessage,
  subscribeToForumChat,
  toggleForumChatReaction,
} from "@/services/forumChatService";
import { getPublicAvatar, getPublicDisplayName } from "@/lib/userIdentity";

export function useForumChat({ open, user }) {
  const userId = user?.id || "";
  const displayName = getPublicDisplayName(user, "Guest");
  const avatarUrl = getPublicAvatar(user);
  const [messages, setMessages] = useState([]);
  const [lastReadAt, setLastReadAt] = useState("");
  const [connection, setConnection] = useState("connecting");
  const [presence, setPresence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refreshTimer = useRef(null);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const result = await loadForumChat(userId);
      setMessages(result.messages);
      setLastReadAt(result.lastReadAt);
      setError("");
    } catch (loadError) {
      setError(loadError?.message || "Live chat is unavailable.");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [userId]);

  const scheduleRefresh = useCallback(() => {
    window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => refresh({ quiet: true }), 120);
  }, [refresh]);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setConnection("idle");
      setMessages([]);
      setError("");
      return undefined;
    }
    refresh();
    const unsubscribe = subscribeToForumChat({
      onChange: scheduleRefresh,
      onPresence: (state) => {
        const people = Object.values(state || {}).flat().filter(Boolean);
        setPresence(people);
      },
      onStatus: (status) => {
        if (status === "SUBSCRIBED") setConnection("connected");
        else if (status === "CLOSED" || status === "CHANNEL_ERROR" || status === "TIMED_OUT") setConnection("reconnecting");
        else setConnection("connecting");
      },
      presence: {
        key: userId || undefined,
        displayName,
        avatarUrl,
      },
    });
    return () => {
      window.clearTimeout(refreshTimer.current);
      unsubscribe();
    };
  }, [avatarUrl, displayName, refresh, scheduleRefresh, userId]);

  useEffect(() => {
    if (!open || !userId || messages.length === 0) return;
    const latest = messages[messages.length - 1];
    markForumChatRead(userId)
      .then(() => setLastReadAt(new Date().toISOString()))
      .catch(() => null);
  }, [messages, open, userId]);

  const unreadCount = useMemo(() => {
    if (open) return 0;
    const readTime = lastReadAt ? new Date(lastReadAt).getTime() : 0;
    return messages.filter((message) => new Date(message.created_at).getTime() > readTime && message.user_id !== userId).length;
  }, [lastReadAt, messages, open, userId]);

  const sendMessage = useCallback(async (body) => {
    await sendForumChatMessage({ body, user });
    await refresh({ quiet: true });
  }, [refresh, user]);

  const toggleReaction = useCallback(async (messageId, emoji, active) => {
    await toggleForumChatReaction({ messageId, emoji, active, userId });
    await refresh({ quiet: true });
  }, [refresh, userId]);

  const removeMessage = useCallback(async (messageId) => {
    await removeForumChatMessage(messageId);
    await refresh({ quiet: true });
  }, [refresh]);

  return {
    connection,
    error,
    loading,
    messages,
    presence,
    removeMessage,
    sendMessage,
    toggleReaction,
    unreadCount,
  };
}
