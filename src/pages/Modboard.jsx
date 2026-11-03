import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { communityClient, supabase } from "@/api/communityClient";
import "./modboard.css";

const snapshotSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(), board: z.enum(["crew", "veri"]), phase: z.string(),
    label: z.string(), detail: z.string(), done: z.boolean(), actor_label: z.string().nullable(),
  })),
  reflection: z.object({ complete: z.number().int(), total: z.number().int(), nextPhase: z.string().nullable() }),
});
const phases = ["Pre-stream", "Overlays", "Live", "Wrap-up"];
function streamToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function StreamBoard({ date }) {
  const [snapshot, setSnapshot] = useState(null);
  const [tab, setTab] = useState("crew");
  const [error, setError] = useState("");
  const [denied, setDenied] = useState(false);
  const [live, setLive] = useState(false);
  const [saving, setSaving] = useState(false);
  const refresh = useRef(null);
  const busy = useRef(false);
  useEffect(() => {
    let active = true;
    let generation = 0;
    async function read() {
      const request = ++generation;
      try {
        const { data, error } = await supabase.rpc("modboard_snapshot", { stream_day: date });
        if (!active || request !== generation) return;
        if (error?.code === "42501") { setSnapshot(null); setDenied(true); return; }
        if (error) throw error;
        setSnapshot(snapshotSchema.parse(data)); setDenied(false); setError("");
      } catch {
        if (active && request === generation) setError("Couldn’t refresh this stream. Retry to see the latest checks.");
      }
    }
    refresh.current = read;
    void read();
    const channel = supabase.channel("modboard-" + date + "-" + crypto.randomUUID())
      .on("postgres_changes", { event: "*", schema: "public", table: "modboard_updates", filter: "stream_date=eq." + date }, read)
      .subscribe(status => { if (active) { setLive(status === "SUBSCRIBED"); if (status === "SUBSCRIBED") void read(); } });
    function catchUp() { if (!document.hidden) void read(); }
    const timer = window.setInterval(catchUp, 30000);
    window.addEventListener("focus", catchUp);
    return () => { active = false; refresh.current = null; clearInterval(timer); window.removeEventListener("focus", catchUp); void supabase.removeChannel(channel); };
  }, [date]);

  async function toggle(task) {
    if (busy.current) return;
    busy.current = true; setSaving(true);
    try {
      const { error } = await supabase.rpc("modboard_set_task", { stream_day: date, item: task.id, checked: !task.done });
      if (error) throw error;
      await refresh.current?.();
    } catch { setError("Couldn’t confirm that change. Refresh before trying again."); }
    finally { busy.current = false; setSaving(false); }
  }
  if (denied) return <p role="status">This desk is for Foxfam mods, lead mods, and admins.</p>;
  const tasks = snapshot?.tasks.filter(t => t.board === tab) ?? [];
  return <>
    {error && <p role="alert">{error} <button onClick={() => refresh.current?.()}>Refresh</button></p>}
    {!snapshot && !error && <p role="status">Loading this stream’s checks…</p>}
    {snapshot && <>
      <div className="mb-status"><span>{live ? "● Live updates" : "Periodic updates"}</span><span>{tasks.filter(t => t.done).length} / {tasks.length} checked</span></div>
      <aside className="mb-reflect"><strong>Veri’s prep</strong> · {snapshot.reflection.complete} of {snapshot.reflection.total} complete · {snapshot.reflection.nextPhase ? "Next phase: " + snapshot.reflection.nextPhase : "Ready for stream"}</aside>
      {snapshot.tasks.some(t => t.board === "veri") && <div className="mb-switch">{[["crew","Crew checklist"],["veri","My private checklist"]].map(([id,label]) => <button key={id} aria-pressed={tab===id} onClick={() => setTab(id)}>{label}</button>)}</div>}
      {phases.map(phase => {
        const items = tasks.filter(t => t.phase === phase);
        return items.length > 0 && <section className="mb-phase" key={phase}><h2>{phase}</h2><div className="mb-cards">{items.map(t =>
          <label key={t.id} className="mb-card" data-done={t.done}><input type="checkbox" checked={t.done} disabled={saving || !!error} onChange={() => toggle(t)} /><span><strong>{t.label}</strong><small>{t.detail}</small>{t.done && <small className="mb-by">Checked by {t.actor_label}</small>}</span></label>
        )}</div></section>;
      })}
    </>}
  </>;
}
export default function Modboard() {
  const [date, setDate] = useState(streamToday);
  const [identity, setIdentity] = useState(undefined);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) { setError("Portal sign-in is unavailable."); return; }
    const { data } = supabase.auth.onAuthStateChange((_event,session) => setIdentity(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  async function login() {
    try { await communityClient.auth.signInWithProvider("twitch", { redirectTo: location.origin + "/modboard" }); }
    catch { setError("Twitch sign-in couldn’t start. Please try again."); }
  }
  return <main className="mb-shell"><a href="https://foxfam.faith/">← Foxfam portal</a><header><small>FOXFAM / STAFF OPS</small><h1>Modboarding</h1><p>One checklist for the crew. Pick the stream date to see where the last shift left off.</p></header>
    {error && <p role="alert">{error}</p>}
    {identity === undefined && !error && <p role="status">Checking your portal session…</p>}
    {identity === null && <button onClick={login}>Continue with Twitch ↗</button>}
    {identity && <><label className="mb-date">Stream date <input type="date" value={date} onChange={e=>{if(e.target.value && e.target.validity.valid) setDate(e.target.value);}} /></label><StreamBoard key={identity + date} date={date}/></>}
    <footer><a href="https://veri-modboarding-hq.scuffox.chatgpt.site" target="_blank" rel="noopener noreferrer">Open the original HQ tools ↗</a></footer>
  </main>;
}
