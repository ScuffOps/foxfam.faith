import { canModerate, canModerateForum } from "@/lib/roles";

export function isRecordOwner(user, record) {
  if (!user?.id || !record) return false;
  return record.user_id === user.id || record.author_key === `user:${user.id}`;
}

export function canEditCommunityRecord(user, record, { forum = false } = {}) {
  if (forum ? canModerateForum(user) : canModerate(user)) return true;
  return isRecordOwner(user, record);
}
