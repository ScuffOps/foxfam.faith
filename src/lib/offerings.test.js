import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOfferingPayload,
  getPublicOfferings,
  getVisibleOfferings,
  OFFERING_STATUS,
} from "./offerings.js";

test("offering submissions default to pending moderation", () => {
  const payload = buildOfferingPayload({
    title: "Moonlit Veri sketch",
    kind: "fanart",
    creatorName: "Luma",
    description: "soft blue lantern study",
    fileUrl: "https://example.com/sketch.png",
  });

  assert.equal(payload.status, OFFERING_STATUS.pending);
  assert.equal(payload.creator_name, "Luma");
  assert.equal(payload.kind, "fanart");
});

test("offering creator names never expose email addresses", () => {
  const payload = buildOfferingPayload({
    title: "A song for Veri",
    kind: "song",
    creatorName: "artist@example.com",
    externalUrl: "https://example.com/song",
  });

  assert.equal(payload.creator_name, "Guest");
});

test("public offering lists show approved items only, with featured first", () => {
  const offerings = [
    { title: "Pending", status: "pending", featured: true, created_date: "2026-06-14T09:00:00Z" },
    { title: "Older Approved", status: "approved", featured: false, created_date: "2026-06-13T09:00:00Z" },
    { title: "Featured Approved", status: "approved", featured: true, created_date: "2026-06-12T09:00:00Z" },
  ];

  assert.deepEqual(getPublicOfferings(offerings).map((offering) => offering.title), [
    "Featured Approved",
    "Older Approved",
  ]);
});

test("staff offering lists include pending moderation items", () => {
  const offerings = [
    { title: "Pending", status: "pending", created_date: "2026-06-14T09:00:00Z" },
    { title: "Approved", status: "approved", created_date: "2026-06-13T09:00:00Z" },
  ];

  assert.deepEqual(getVisibleOfferings(offerings, true).map((offering) => offering.title), [
    "Pending",
    "Approved",
  ]);
});
