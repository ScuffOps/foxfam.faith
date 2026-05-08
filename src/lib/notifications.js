import { base44 } from "@/api/base44Client";

export async function createUserNotification({
  recipientEmail,
  actorEmail = "",
  actorName = "",
  type = "activity",
  title,
  message = "",
  favorPoints = 0,
  sourceType = "",
  sourceId = "",
}) {
  if (!recipientEmail || !title) return null;

  try {
    return await base44.entities.UserNotification.create({
      recipient_email: recipientEmail,
      actor_email: actorEmail,
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
