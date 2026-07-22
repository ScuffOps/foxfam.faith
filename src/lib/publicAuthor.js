import { getPublicAvatar, getPublicDisplayName } from "@/lib/userIdentity";

export function buildPublicAuthorSnapshot(user, payload = {}) {
  if (payload.is_anonymous === true) {
    return { author_name: "Guest", author_key: "", author_avatar_url: "" };
  }

  const name = payload.author_name
    || payload.submitted_by_name
    || payload.creator_name
    || getPublicDisplayName(user, "Guest");

  return {
    author_name: name,
    author_key: user?.id ? `user:${user.id}` : "",
    author_avatar_url: getPublicAvatar(user),
  };
}

export function getRecordAuthorName(record, fallback = "Guest") {
  return record?.author_name
    || record?.submitted_by_name
    || record?.creator_name
    || record?.display_name
    || fallback;
}

export function getRecordAuthorAvatar(record) {
  return record?.author_avatar_url
    || record?.submitted_by_avatar_url
    || record?.creator_avatar_url
    || record?.avatar_url
    || "";
}
