import { communityClient } from "@/api/communityClient";

export async function createUserNotification({
  recipientUserId,
  actorKey = "",
  actorName = "",
  type = "activity",
  title,
  message = "",
  favorPoints = 0,
  sourceType = "",
  sourceId = "",
}) {
  if (!recipientUserId || !title) return null;

  try {
    return await communityClient.entities.UserNotification.create({
      recipient_user_id: recipientUserId,
      actor_key: actorKey,
      actor_name: actorName,
      type,
      title,
      message,
      favor_points: favorPoints,
      source_type: sourceType,
      source_id: sourceId,
      read: false,
    });
  } catch {
    return null;
  }
}
