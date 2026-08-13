export const BIRTHDAY_WISH_MAX_LENGTH = 355;

export function getMonthDay(value) {
  const match = String(value || "").match(/(?:^|-)\b(\d{2})-(\d{2})$/);
  return match ? `${match[1]}-${match[2]}` : "";
}

export function isBirthdayToday(value, now = new Date()) {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return getMonthDay(value) === `${month}-${day}`;
}

export function validateBirthdayWish(message) {
  const cleaned = String(message || "").trim();
  if (!cleaned) throw new Error("Write a short birthday message first.");
  if (cleaned.length > BIRTHDAY_WISH_MAX_LENGTH) {
    throw new Error(`Birthday messages must be ${BIRTHDAY_WISH_MAX_LENGTH} characters or fewer.`);
  }
  return cleaned;
}

export async function setBirthdayMessageVisibility(messageId, visible) {
  const { supabase } = await import("@/api/communityClient");
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data, error } = await supabase.rpc("set_birthday_message_visibility", {
    target_message_id: messageId,
    visible,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    id: row.id,
    user_id: row.user_id || "",
    created_date: row.created_at,
    updated_date: row.updated_at,
    ...(row.data || {}),
  };
}
