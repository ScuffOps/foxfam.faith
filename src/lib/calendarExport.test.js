import test from "node:test";
import assert from "node:assert/strict";
import { createGoogleCalendarUrl, createIcsContent } from "./calendarExport.js";

const event = {
  title: "Foxfam Stream Night",
  description: "Bring snacks & good vibes",
  location: "Twitch",
  start_date: "2026-08-02T20:00:00.000Z",
  end_date: "2026-08-02T22:00:00.000Z",
};

test("createIcsContent exports the event fields in calendar format", () => {
  const ics = createIcsContent(event);

  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /SUMMARY:Foxfam Stream Night/);
  assert.match(ics, /DESCRIPTION:Bring snacks & good vibes/);
  assert.match(ics, /LOCATION:Twitch/);
  assert.match(ics, /DTSTART:20260802T200000Z/);
  assert.match(ics, /DTEND:20260802T220000Z/);
});

test("createGoogleCalendarUrl builds a shareable calendar URL", () => {
  const url = createGoogleCalendarUrl(event);

  assert.equal(url.origin, "https://calendar.google.com");
  assert.equal(url.searchParams.get("action"), "TEMPLATE");
  assert.equal(url.searchParams.get("text"), "Foxfam Stream Night");
  assert.equal(url.searchParams.get("dates"), "20260802T200000Z/20260802T220000Z");
});
