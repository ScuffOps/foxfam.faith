export function isNotificationRead(note) {
  return Boolean(note?.read || note?.read_at);
}

export function markNotificationRead(note) {
  return {
    ...note,
    read: true,
    read_at: note?.read_at || new Date().toISOString(),
  };
}
