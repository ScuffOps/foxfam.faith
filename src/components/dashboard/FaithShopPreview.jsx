import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Gem, LockKeyhole, Palette, ScrollText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "foxfam.favorShopPreview.v1";

const SHOP_ITEMS = [
  {
    id: "nameplate-glow",
    name: "Nameplate Glow",
    cost: 40,
    detail: "A soft aura around your display name.",
    icon: Sparkles,
    tone: "text-cyan-100 bg-cyan-300/15 border-cyan-200/30",
  },
  {
    id: "shrine-candle",
    name: "Shrine Candle Tint",
    cost: 25,
    detail: "A profile candle color for daily lights.",
    icon: Palette,
    tone: "text-violet-100 bg-violet-300/15 border-violet-200/30",
  },
  {
    id: "lore-title",
    name: "Lore Title",
    cost: 60,
    detail: "A small title line under your name.",
    icon: ScrollText,
    tone: "text-amber-100 bg-amber-300/15 border-amber-200/30",
  },
];

function loadWishlist() {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function FaithShopPreview() {
  const [wishlist, setWishlist] = useState(loadWishlist);
  const wished = useMemo(() => new Set(wishlist), [wishlist]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
  }, [wishlist]);

  function toggleWishlist(itemId) {
    setWishlist((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return [...next];
    });
  }

  return (
    <section className="foxcard flex h-full flex-col rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="dashboard-candle text-xs font-semibold uppercase tracking-widest text-violet-100/75">favor shop</p>
          <h2 className="font-heading text-lg font-bold text-foreground">Favor Shop Preview</h2>
          <p className="mt-1 text-sm text-muted-foreground">Wish-list future profile flex before Favor spending opens.</p>
        </div>
        <Badge variant="outline" className="border-violet-200/35 bg-violet-300/10 text-violet-100">
          sealed
        </Badge>
      </div>

      <div className="mt-4 space-y-2">
        {SHOP_ITEMS.map((item) => {
          const Icon = item.icon;
          const selected = wished.has(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleWishlist(item.id)}
              aria-pressed={selected}
              className="group flex w-full items-center gap-3 rounded-xl border border-border bg-slate-950/25 p-3 text-left transition hover:border-violet-200/35 hover:bg-violet-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${item.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-heading text-sm font-semibold text-foreground">{item.name}</span>
                <span className="block text-xs text-muted-foreground">{item.detail}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-100">
                  <Gem className="h-3.5 w-3.5" /> {item.cost} Favor
                </span>
                {selected ? <CheckCircle2 className="h-4 w-4 text-emerald-200" /> : <LockKeyhole className="h-4 w-4 text-muted-foreground" />}
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 rounded-xl border border-amber-200/20 bg-amber-300/10 px-3 py-2 text-xs leading-relaxed text-amber-50/85">
        Faith stays tied to MIU/Twitch. The portal can convert it later, roughly 100 Faith = 10 Favor.
      </p>

      <div className="mt-auto pt-4">
        <Button asChild variant="outline" className="w-full gap-2">
          <Link to="/profile">
            <Sparkles className="h-4 w-4" />
            Tune profile
          </Link>
        </Button>
      </div>
    </section>
  );
}
