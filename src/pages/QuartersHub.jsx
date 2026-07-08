import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, DoorOpen, Loader2, PackageOpen, Sparkles } from "lucide-react";
import HubDock from "@/components/quarters/HubDock";
import HubDoorCard from "@/components/quarters/HubDoorCard";
import QuartersScene from "@/components/quarters/QuartersScene";
import RelicStatusPanel from "@/components/quarters/RelicStatusPanel";
import { Button } from "@/components/ui/button";
import { communityClient } from "@/api/communityClient";
import { useAuth } from "@/lib/AuthContext";
import { getPrivateUserKey } from "@/lib/communityActor";
import { GAME_WORLD_KEYS, GAME_WORLD_ORDER, FORGE_MATERIALS } from "@/lib/gameHubCatalog";
import { DEFAULT_RELIC } from "@/lib/relicCharms";
import { loadRelicRollGate, loadUserRelicInventory } from "@/lib/relicService";

export default function QuartersHub() {
  const { openLogin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [user, setUser] = useState(null);
  const [level, setLevel] = useState(null);
  const [relicInventory, setRelicInventory] = useState({ relic: null, charms: [] });
  const [gate, setGate] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadQuarters() {
      setLoading(true);
      setNotice("");

      try {
        const me = await communityClient.auth.me().catch(() => null);
        const [inventory, loadedGate] = await Promise.all([
          me
            ? loadUserRelicInventory().catch(() => ({ relic: DEFAULT_RELIC, charms: [] }))
            : Promise.resolve({ relic: DEFAULT_RELIC, charms: [] }),
          loadRelicRollGate().catch(() => null),
        ]);
        const userKey = getPrivateUserKey(me);
        const levels = userKey ? await communityClient.entities.UserLevel.filter({ user_key: userKey }).catch(() => []) : [];

        if (!mounted) return;
        setUser(me);
        setRelicInventory(inventory);
        setGate(loadedGate);
        setLevel(levels[0] || null);
        if (!me) {
          setNotice("Guest preview: real Favor, forge grants, and saved decor unlock after sign-in.");
        }
      } catch (loadError) {
        if (!mounted) return;
        setRelicInventory({ relic: DEFAULT_RELIC, charms: [] });
        setGate(null);
        setNotice(loadError?.message || "Local preview: live Quarters storage is unavailable.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadQuarters();
    return () => {
      mounted = false;
    };
  }, []);

  const worlds = useMemo(() => GAME_WORLD_ORDER, []);
  const worldDoors = worlds.filter((world) => world.key !== GAME_WORLD_KEYS.quarters);
  const favor = Math.max(0, Number(level?.points || 0));
  const forgeOpen = Boolean(gate?.enabled);

  if (loading) {
    return (
      <div className="flex min-h-[28rem] items-center justify-center">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Opening your Quarters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="community-dashboard mx-auto max-w-7xl animate-fade-in">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-cyan-200/75">
            <DoorOpen className="h-4 w-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.28em]">Priory home base</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Shrine Quarters</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Charms, trophies, forge materials, and minigame doors all settle here.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-bold text-cyan-100">
          <Sparkles className="h-3.5 w-3.5" />
          {user?.display_name || "Foxfam"}'s room
        </div>
      </header>

      {notice && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/25 bg-amber-200/10 p-3 text-sm text-amber-100">
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {notice}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={openLogin}>
            Sign in
          </Button>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-5">
          <QuartersScene worlds={worlds} />
          <HubDock forgeOpen={forgeOpen} />

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Minigame gates">
            {worldDoors.map((world) => (
              <HubDoorCard key={world.key} world={world} />
            ))}
          </section>
        </div>

        <div className="min-w-0 space-y-5">
          <RelicStatusPanel
            favor={favor}
            forgeOpen={forgeOpen}
            gateReason={gate?.reason}
            relic={relicInventory.relic}
            charms={relicInventory.charms}
          />

          <section className="foxcard rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-cyan-100/65">Forge stores</p>
                <h2 className="mt-1 font-heading text-lg font-bold">Material families</h2>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-amber-200/25 bg-amber-200/10 text-amber-100">
                <PackageOpen className="h-4 w-4" />
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              {FORGE_MATERIALS.map((material) => (
                <article key={material.key} className="rounded-lg border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-foreground">{material.label}</h3>
                    <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                      {material.source}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{material.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
