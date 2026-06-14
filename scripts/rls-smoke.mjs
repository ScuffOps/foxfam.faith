import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  try {
    const source = readFileSync(path, "utf8");
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // Env files are optional in CI.
  }
}

loadEnvFile(".env.local");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const uploadBucket = process.env.VITE_SUPABASE_UPLOAD_BUCKET || "community-uploads";
const shouldTestStorage = process.env.RLS_SMOKE_STORAGE === "1";

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY/VITE_SUPABASE_ANON_KEY.");
}

const client = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const runId = `rls-smoke-${Date.now()}`;
const createdRows = [];

async function expectPass(label, action) {
  const result = await action();
  if (result?.error) {
    throw new Error(`${label} failed: ${result.error.message}`);
  }
  console.log(`PASS ${label}`);
  return result;
}

async function expectFail(label, action) {
  const result = await action();
  if (!result?.error) {
    throw new Error(`${label} unexpectedly succeeded`);
  }
  console.log(`PASS ${label} rejected (${result.error.code || "error"})`);
  return result;
}

async function createRow(table, data) {
  const result = await expectPass(`anon insert ${table}`, () =>
    client
      .from(table)
      .insert({
        user_id: null,
        created_by: null,
        data: {
          ...data,
          __rls_smoke: runId,
        },
      })
      .select("id,data,created_at,updated_at")
      .single(),
  );
  createdRows.push({ table, id: result.data.id });
  return result.data;
}

await expectPass("anon read public portal rows", () =>
  client.from("community_posts").select("id,data,created_at,updated_at").limit(1),
);

await expectFail("anon cannot select ownership metadata", () =>
  client.from("community_posts").select("id,created_by").limit(1),
);

await expectFail("anon invalid bug report is blocked", () =>
  client.from("bug_reports").insert({
    data: {
      title: `${runId} invalid`,
      __rls_smoke: runId,
    },
  }),
);

await createRow("birthdays", {
  display_name: "RLS Smoke Guest",
  birthday_date: "06-10",
  status: "pending",
});

await createRow("bug_reports", {
  title: "RLS smoke bug",
  description: "Automated RLS smoke test report.",
  status: "open",
});

const post = await createRow("community_posts", {
  title: "RLS smoke idea",
  description: "Automated RLS smoke test post.",
  type: "idea",
  status: "pending",
  upvotes: 0,
  upvoted_by: [],
});

await expectPass("anon can update allowed community interaction fields", () =>
  client
    .from("community_posts")
    .update({
      data: {
        ...post.data,
        upvotes: 1,
        upvoted_by: [`guest:${runId}`],
      },
    })
    .eq("id", post.id)
    .select("id,data")
    .single(),
);

await expectFail("anon cannot rewrite community post content", () =>
  client
    .from("community_posts")
    .update({
      data: {
        ...post.data,
        title: "RLS smoke rewrite attempt",
      },
    })
    .eq("id", post.id),
);

const prayer = await createRow("prayers", {
  message: "Automated RLS smoke test prayer.",
  author_name: "RLS Smoke Guest",
  support_count: 0,
  is_read: false,
});

await expectPass("anon can support a prayer", () =>
  client
    .from("prayers")
    .update({
      data: {
        ...prayer.data,
        support_count: 1,
      },
    })
    .eq("id", prayer.id)
    .select("id,data")
    .single(),
);

await expectFail("anon cannot mark a prayer cherished", () =>
  client
    .from("prayers")
    .update({
      data: {
        ...prayer.data,
        is_read: true,
        cherished_at: new Date().toISOString(),
      },
    })
    .eq("id", prayer.id),
);

if (shouldTestStorage) {
  await expectPass("anon can upload bug-report screenshot prefix", () =>
    client.storage
      .from(uploadBucket)
      .upload(`bug-reports/${runId}.png`, new Blob(["rls-smoke"], { type: "image/png" }), {
        contentType: "image/png",
        upsert: false,
      }),
  );

  await expectFail("anon cannot upload arbitrary prefix", () =>
    client.storage
      .from(uploadBucket)
      .upload(`uploads/${runId}.png`, new Blob(["rls-smoke"], { type: "image/png" }), {
        contentType: "image/png",
        upsert: false,
      }),
  );
} else {
  console.log("SKIP storage upload checks; set RLS_SMOKE_STORAGE=1 to test them.");
}

console.log(`RLS smoke complete: ${runId}`);
console.log(
  `Created test rows: ${createdRows.map((row) => `${row.table}:${row.id}`).join(", ")}`,
);
