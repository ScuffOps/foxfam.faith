import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOfferingPayload,
  getOfferingFileValidationError,
  getPublicOfferings,
  getVisibleOfferings,
  OFFERING_STATUS,
} from "./offerings.js";

test("offering uploads accept common media, documents, and safe creative files", () => {
  const safeFiles = [
    { name: "art.png", type: "image/png" },
    { name: "song.mp3", type: "audio/mpeg" },
    { name: "edit.mp4", type: "video/mp4" },
    { name: "story.pdf", type: "application/pdf" },
    { name: "project.blend", type: "application/octet-stream" },
  ];

  for (const file of safeFiles) {
    assert.equal(getOfferingFileValidationError(file), "", file.name);
  }
});

test("offering uploads reject installers, executables, and scripts", () => {
  const dangerousFiles = [
    { name: "installer.exe", type: "application/octet-stream" },
    { name: "portal.apk", type: "application/vnd.android.package-archive" },
    { name: "totally-art.png.sh", type: "text/plain" },
    { name: "setup", type: "application/x-msdownload" },
  ];

  for (const file of dangerousFiles) {
    assert.match(getOfferingFileValidationError(file), /cannot be uploaded/i, file.name);
  }
});

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
