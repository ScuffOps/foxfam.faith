import { z } from "zod";
import { supabase } from "@/api/communityClient";
import { getPublicAvatar, getPublicDisplayName } from "@/lib/userIdentity";

const messageSchema = z.string().trim().min(1).max(1000);
const reactionSchema = z.enum(["praise", "heart", "flame"]);

function getClient() {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function groupReactions(reactions, userId) {
  return reactions.reduce((groups, reaction) => {
    const current = groups[reaction.message_id] || { counts: {}, mine: [] };
    current.counts[reaction.reaction] = (current.counts[reaction.reaction] || 0) + 1;
    if (reaction.user_id === userId) current.mine.push(reaction.reaction);
    groups[reaction.message_id] = current;
    return groups;
  }, {});
}

export async function loadForumChat(userId = "") {
  const client = getClient();
  const { data: messages, error: messageError } = await client
    .from("forum_chat_messages")
    .select("id,user_id,message,display_name,avatar_url,reply_to_id,is_deleted,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (messageError) throw messageError;

  const orderedMessages = [...(messages || [])].reverse();
  const messageIds = orderedMessages.map((message) => message.id);
  const reactionRequest = messageIds.length
    ? client
      .from("forum_chat_reactions")
      .select("message_id,user_id,reaction,created_at")
      .in("message_id", messageIds)
    : Promise.resolve({ data: [], error: null });
  const readRequest = userId
    ? client
      .from("forum_chat_reads")
      .select("last_read_at")
      .eq("user_id", userId)
      .maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const [{ data: reactions, error: reactionError }, { data: readState, error: readError }] = await Promise.all([
    reactionRequest,
    readRequest,
  ]);
  if (reactionError) throw reactionError;
  if (readError) throw readError;

  const reactionGroups = groupReactions(reactions || [], userId);
  return {
    messages: orderedMessages.map((message) => ({
      ...message,
      author_name: message.display_name,
      author_avatar_url: message.avatar_url,
      body: message.message,
      reactions: reactionGroups[message.id] || { counts: {}, mine: [] },
    })),
    lastReadAt: readState?.last_read_at || "",
  };
}

export async function sendForumChatMessage({ body, user }) {
  const client = getClient();
  if (!user?.id) throw new Error("Sign in to send a message.");
  const cleanBody = messageSchema.parse(body);
  const { data, error } = await client
    .from("forum_chat_messages")
    .insert({
      user_id: user.id,
      message: cleanBody,
      display_name: getPublicDisplayName(user, "Foxfam Member"),
      avatar_url: getPublicAvatar(user),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function toggleForumChatReaction({ emoji, messageId, userId, active }) {
  const client = getClient();
  if (!userId) throw new Error("Sign in to react.");
  const cleanEmoji = reactionSchema.parse(emoji);
  if (active) {
    const { error } = await client
      .from("forum_chat_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", userId)
      .eq("reaction", cleanEmoji);
    if (error) throw error;
    return;
  }

  const { error } = await client.from("forum_chat_reactions").insert({
    message_id: messageId,
    user_id: userId,
    reaction: cleanEmoji,
  });
  if (error && error.code !== "23505") throw error;
}

export async function removeForumChatMessage(messageId) {
  const client = getClient();
  const { error } = await client
    .from("forum_chat_messages")
    .update({ message: "Message removed.", is_deleted: true })
    .eq("id", messageId);
  if (error) throw error;
}

export async function markForumChatRead(userId) {
  if (!userId) return;
  const client = getClient();
  const { error } = await client.from("forum_chat_reads").upsert({
    user_id: userId,
    last_read_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export function subscribeToForumChat({ onChange, onPresence, onStatus, presence }) {
  const client = getClient();
  const guestId = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const presenceKey = presence?.key || `guest-${guestId}`;
  const channel = client.channel("foxfam-forum-chat", {
    config: { presence: { key: presenceKey } },
  });

  channel
    .on("postgres_changes", { event: "*", schema: "public", table: "forum_chat_messages" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "forum_chat_reactions" }, onChange)
    .on("presence", { event: "sync" }, () => onPresence?.(channel.presenceState()));

  if (presence?.key) {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "forum_chat_reads",
        filter: `user_id=eq.${presence.key}`,
      },
      onChange,
    );
  }

  channel.subscribe(async (status) => {
      onStatus?.(status);
      if (status === "SUBSCRIBED" && presence) {
        await channel.track({
          displayName: presence.displayName,
          avatarUrl: presence.avatarUrl,
          joinedAt: new Date().toISOString(),
        });
      }
  });

  return () => {
    client.removeChannel(channel);
  };
}
