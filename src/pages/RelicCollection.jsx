import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dice5, Hammer, Layers3, Loader2, LogIn, Sparkles } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import ProfileCharmShelf from "@/components/relics/ProfileCharmShelf";
import RelicPreview from "@/components/relics/RelicPreview";
import { useAuth } from "@/lib/AuthContext";
import { RELIC_RARITY_META } from "@/lib/relicCharms";
import { loadCharmRollEligibility, loadUserRelicInventory, rollUserRelicCharm, setEquippedCharm } from "@/lib/relicService";

const MODES = [
  { key: "collection", label: "Collection", path: "/relics", icon: Layers3 },
  { key: "forge", label: "Forge", path: "/relics/forge", icon: Hammer },
  { key: "draw", label: "Charm Draw", path: "/relics/draw", icon: Dice5 },
];

export default function RelicCollection({ mode = "collection" }) {
  const { openLogin } = useAuth();
  const { toast } = useToast();
  const [inventory, setInventory] = useState({ relic: null, charms: [] });
  const [eligibility, setEligibility] = useState({ canRoll: false, reason: "Checking the forge gate..." });
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [equippingId, setEquippingId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([communityClient.auth.me(), loadUserRelicInventory(), loadCharmRollEligibility()])
      .then(([, loadedInventory, loadedEligibility]) => {
        if (!active) return;
        setInventory(loadedInventory);
        setEligibility(loadedEligibility);
      })
      .catch((loadError) => active && setError(loadError?.message || "Your relic collection could not be loaded."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const handleRoll = async () => {
    setRolling(true);
    try {
      const charm = await rollUserRelicCharm();
      setInventory((current) => ({ ...current, charms: [charm, ...current.charms] }));
      toast({ title: `${RELIC_RARITY_META[charm.rarity]?.label || "New"} charm acquired`, description: charm.name });
    } catch (rollError) {
      toast({ title: "Charm draw failed", description: rollError?.message || "Refresh and try again.", variant: "destructive" });
    } finally {
      setRolling(false);
    }
  };

  const handleToggle = async (charm) => {
    setEquippingId(charm.id);
    try {
      const charms = await setEquippedCharm(charm, inventory.charms, !charm.equipped);
      setInventory((current) => ({ ...current, charms }));
    } catch (toggleError) {
      toast({ title: "Charm could not be equipped", description: toggleError?.message || "Refresh and try again.", variant: "destructive" });
    } finally {
      setEquippingId("");
    }
  };

  if (loading) return <Loader2 className="mx-auto mt-24 h-8 w-8 animate-spin text-primary" />;
  if (error) return (
    <div className="mx-auto mt-16 max-w-xl rounded-xl border border-border bg-card p-6 text-center">
      <LogIn className="mx-auto h-7 w-7 text-primary" />
      <h1 className="mt-3 font-heading text-2xl font-bold">Relic Collection</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      <Button className="mt-4" onClick={openLogin}>Sign in</Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-5">
      <header>
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-primary">Relic Archive</p>
        <h1 className="mt-1 font-heading text-3xl font-bold">Relic Collection</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Your profile relic, Quarters finds, charm stacks, and future rewards now live in one collection.</p>
      </header>
      <nav className="flex flex-wrap gap-2" aria-label="Relic collection sections">
        {MODES.map(({ key, label, path, icon: Icon }) => (
          <Button key={key} asChild variant={mode === key ? "default" : "outline"} className="gap-2">
            <Link to={path}><Icon className="h-4 w-4" /> {label}</Link>
          </Button>
        ))}
      </nav>

      {mode === "draw" && (
        <section className="rounded-xl border border-border bg-card/85 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">Charm Draw</p>
              <h2 className="mt-1 font-heading text-xl font-bold">Call a charm from the archive</h2>
              <p className="mt-1 text-sm text-muted-foreground">{eligibility.reason}</p>
            </div>
            <Button onClick={handleRoll} disabled={rolling || !eligibility.canRoll} className="h-12 min-w-40 gap-2">
              {rolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dice5 className="h-4 w-4" />}
              {rolling ? "Drawing..." : eligibility.canRoll ? "Draw Charm" : "Draw Locked"}
            </Button>
          </div>
        </section>
      )}

      {mode === "collection" && <RelicPreview relic={inventory.relic} charms={inventory.charms} />}
      <ProfileCharmShelf charms={inventory.charms} equippingId={equippingId} onToggleCharm={handleToggle} />
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> Quarters rewards will enter this same shelf instead of creating another inventory.</p>
    </div>
  );
}
