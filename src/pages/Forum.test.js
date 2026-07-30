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
const chatSource = readFileSync(join(srcDir, "services", "forumChatService.js"), "utf8");
const liveChatSource = readFileSync(join(srcDir, "components", "forum", "ForumLiveChat.jsx"), "utf8");

test("forum is standalone and separated from community tabs", () => {
  assert.ok(appSource.includes('<Route path="/forum" element={<Forum />} />'));
  assert.match(forumSource, /FORUM_SECTIONS/);
  assert.match(forumSource, /activeSection/);
  assert.ok(sidebarSource.includes('{ path: "/forum", label: "Forum", icon: MessageSquare }'));
  assert.doesNotMatch(communitySource, /key: "forum"/);
  assert.doesNotMatch(communitySource, /ForumThreadCard/);
});

test("forum includes dockable realtime chat using the live Supabase contract", () => {
  assert.match(forumSource, /ForumLiveChat/);
  assert.match(liveChatSource, /foxfam\.forumChat\.preferences\.v1/);
  assert.match(liveChatSource, /chat=popout/);
  assert.match(chatSource, /forum_chat_messages/);
  assert.match(chatSource, /display_name/);
  assert.match(chatSource, /avatar_url/);
  assert.match(chatSource, /forum_chat_reads/);
});

test("start here and staff resources have durable routes", () => {
  assert.ok(appSource.includes('<Route path="/start" element={<StartHere />} />'));
  assert.ok(appSource.includes('<Route path="/ops/resources" element={<StaffOps defaultTab="resources" />} />'));
  assert.ok(sidebarSource.includes('{ path: "/start", label: "Start Here", icon: Compass }'));
  assert.ok(sidebarSource.includes('{ path: "/ops/resources", label: "Resources", icon: FolderOpen }'));
});
