import { supabase } from "../../api/communityClient.js";
import {
  DEFAULT_QUARTERS_DECOR,
  decorLayoutFromRow,
  decorRowFromLayout,
} from "./quartersDecorCatalog.js";

const DECOR_SELECT = "user_id,rug_key,wall_key,shelf_key,nook_key,created_at,updated_at";

function requireClient(client) {
  if (!client?.auth?.getUser || !client?.from) throw new Error("Quarters decor persistence is unavailable.");
  return client;
}

async function requireViewer(client) {
  const { data, error } = await requireClient(client).auth.getUser();
  if (error || !data?.user?.id) throw new Error("Sign in to open saved Quarters decor.", { cause: error });
  return data.user.id;
}

export async function loadQuartersDecor(profileUserId = "", client = supabase) {
  const viewerId = await requireViewer(client);
  const ownerId = profileUserId || viewerId;
  const { data, error } = await client
    .from("user_quarters_decor")
    .select(DECOR_SELECT)
    .eq("user_id", ownerId)
    .maybeSingle();
  if (error) throw new Error("Quarters decor could not be loaded.", { cause: error });
  return data ? decorLayoutFromRow(data) : { ...DEFAULT_QUARTERS_DECOR };
}

export async function saveQuartersDecor(layout, client = supabase) {
  const ownerId = await requireViewer(client);
  const payload = decorRowFromLayout(layout);
  const { data, error } = await client
    .from("user_quarters_decor")
    .upsert(payload, { onConflict: "user_id" })
    .select(DECOR_SELECT)
    .single();
  if (error) throw new Error("Quarters decor could not be saved.", { cause: error });
  if (data?.user_id !== ownerId) throw new Error("Quarters decor ownership verification failed.");
  return decorLayoutFromRow(data);
}
