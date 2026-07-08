import { canModerate, canModerateForum } from "@/lib/roles";

export function isRecordOwner(user, record) {
  return Boolean(user?.id && record?.user_id && user.id === record.user_id);
}

export function canEditCommunityRecord(user, record, { forum = false } = {}) {
  if (forum ? canModerateForum(user) : canModerate(user)) return true;
  return isRecordOwner(user, record);
}
