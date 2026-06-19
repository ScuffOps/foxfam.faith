import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const pageDir = dirname(fileURLToPath(import.meta.url));
const srcDir = join(pageDir, "..");
const forumSource = readFileSync(join(pageDir, "Forum.jsx"), "utf8");
const communitySource = readFileSync(join(pageDir, "CommunityInput.jsx"), "utf8");
const appSource = readFileSync(join(srcDir, "App.jsx"), "utf8");
const sidebarSource = readFileSync(join(srcDir, "components", "Sidebar.jsx"), "utf8");

test("forum is standalone and separated from community tabs", () => {
  assert.ok(appSource.includes('<Route path="/forum" element={<Forum />} />'));
  assert.match(forumSource, /FORUM_SECTIONS/);
  assert.match(forumSource, /activeSection/);
  assert.ok(sidebarSource.includes('{ path: "/forum", label: "Forum", icon: MessageSquare }'));
  assert.doesNotMatch(communitySource, /key: "forum"/);
  assert.doesNotMatch(communitySource, /ForumThreadCard/);
});
