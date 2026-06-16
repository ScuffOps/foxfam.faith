import { supabase } from "@/api/communityClient";

export async function sendToDiscord(payload) {
  if (!supabase) return { data: null, error: "Supabase is not configured" };

  const { data, error } = await supabase.functions.invoke("send-to-discord", {
    body: payload,
  });

  if (error) throw error;
  return { data };
}
