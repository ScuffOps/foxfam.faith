function pad(value) {
  return String(value).padStart(2, "0");
}

function toUtcStamp(value) {
  const date = new Date(value);
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "T",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
    "Z",
  ].join("");
}

function escapeIcsText(value = "") {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

export function createIcsContent(event) {
  const start = toUtcStamp(event.start_date);
  const end = toUtcStamp(event.end_date || event.start_date);
  const now = toUtcStamp(new Date().toISOString());
  const uid = `${event.id || `${event.title}-${start}`}@foxfam.faith`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Foxfam Faith//Community Calendar//EN",
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeIcsText(event.description)}` : null,
    event.location ? `LOCATION:${escapeIcsText(event.location)}` : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
}

export function createGoogleCalendarUrl(event) {
  const url = new URL("https://calendar.google.com/calendar/render");
  url.searchParams.set("action", "TEMPLATE");
  url.searchParams.set("text", event.title || "Foxfam event");
  url.searchParams.set("dates", `${toUtcStamp(event.start_date)}/${toUtcStamp(event.end_date || event.start_date)}`);
  if (event.description) url.searchParams.set("details", event.description);
  if (event.location) url.searchParams.set("location", event.location);
  return url;
}

export function downloadIcsFile(event) {
  const blob = new Blob([createIcsContent(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(event.title || "foxfam-event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function saveEventReminder(event, minutesBefore = 30) {
  const key = "commhub_event_reminders";
  const reminders = JSON.parse(localStorage.getItem(key) || "[]");
  const reminder = {
    event_id: event.id,
    title: event.title,
    start_date: event.start_date,
    minutes_before: minutesBefore,
    saved_at: new Date().toISOString(),
  };
  const next = reminders.filter((item) => item.event_id !== event.id);
  next.push(reminder);
  localStorage.setItem(key, JSON.stringify(next));
  return reminder;
}
