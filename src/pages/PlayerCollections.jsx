import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Gem, Loader2, RefreshCw, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import FishpediaPanel from "@/games/starfishing/ui/FishpediaPanel";
import { loadStarfishingProgression } from "@/games/starfishing/api/starfishingProgressionClient";
import "@/games/starfishing/ui/starfishing.css";

function titleFromKey(value) {
  return String(value || "Unknown keepsake")
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export default function PlayerCollections() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth, openLogin } = useAuth();
  const [status, setStatus] = useState("loading");
  const [progression, setProgression] = useState(null);

  const loadCollections = useCallback(async () => {
    setStatus("loading");
    try {
      setProgression(await loadStarfishingProgression());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    if (isLoadingAuth) return undefined;
    if (!isAuthenticated) {
      setStatus("signed-out");
      return undefined;
    }
    let active = true;
    loadStarfishingProgression()
      .then((nextProgression) => {
        if (!active) return;
        setProgression(nextProgression);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => { active = false; };
  }, [isAuthenticated, isLoadingAuth]);

  return (
    <section className="mx-auto w-full max-w-6xl animate-fade-in space-y-4 text-[#364152]" aria-labelledby="collections-heading">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border-[3px] border-[#485365] bg-[#faf3eb] p-4 shadow-[0_7px_0_rgb(72_83_101_/_18%)]">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="icon" onClick={() => navigate("/quarters")} aria-label="Return to Quarters" title="Return to Quarters">
            <ArrowLeft aria-hidden="true" />
          </Button>
          <span className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-[#485365] bg-[#dfd8ab]">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase text-[#657080]">Personal archive</p>
            <h1 id="collections-heading" className="font-heading text-2xl font-black">Collections</h1>
          </div>
        </div>
        {status === "ready" ? (
          <span className="rounded-md border-2 border-[#485365] bg-[#d9e6ec] px-3 py-2 text-sm font-black">
            {progression?.favorBalance || 0} Favor
          </span>
        ) : null}
      </header>

      {status === "loading" ? (
        <section className="flex min-h-72 items-center justify-center rounded-lg border-[3px] border-[#485365] bg-[#faf3eb]" role="status">
          <div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" aria-hidden="true" /><p className="mt-3 font-bold">Opening your archive...</p></div>
        </section>
      ) : null}

      {status === "error" ? (
        <section className="rounded-lg border-[3px] border-[#485365] bg-[#faf3eb] p-7 text-center" role="alert">
          <BookOpen className="mx-auto h-8 w-8 text-[#80adbc]" aria-hidden="true" />
          <h2 className="mt-3 font-heading text-xl font-black">The archive is resting</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[#657080]">Your collection is still safe. The Priory could not read it just now.</p>
          <Button type="button" className="mt-5 border-2 border-[#485365] bg-[#80adbc] text-[#24303d]" onClick={loadCollections}>
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" /> Retry
          </Button>
        </section>
      ) : null}

      {status === "signed-out" ? (
        <section className="rounded-lg border-[3px] border-[#485365] bg-[#faf3eb] p-7 text-center" role="status">
          <BookOpen className="mx-auto h-8 w-8 text-[#80adbc]" aria-hidden="true" />
          <h2 className="mt-3 font-heading text-xl font-black">Your archive is sealed</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[#657080]">Sign in to reveal your Fishpedia records, permanent trophies, and forge materials.</p>
          <Button type="button" className="mt-5 min-h-11 border-2 border-[#485365] bg-[#80adbc] px-6 text-[#24303d]" onClick={openLogin}>Sign in</Button>
        </section>
      ) : null}

      {status === "ready" ? (
        <>
          <section className="overflow-hidden rounded-lg border-[3px] border-[#485365] shadow-[0_7px_0_rgb(72_83_101_/_18%)]">
            <FishpediaPanel authoritativeRows={progression?.fishpedia || []} />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <CollectionList
              icon={Trophy}
              eyebrow="Permanent milestones"
              title="Trophy Shelf"
              empty="No trophies have reached the shelf yet."
              items={(progression?.trophies || []).map((trophy) => ({
                key: trophy.id,
                title: trophy.data?.title || titleFromKey(trophy.trophyKey),
                detail: trophy.sourceAchievementKey
                  ? `Achievement: ${titleFromKey(trophy.sourceAchievementKey)}`
                  : "Priory keepsake",
              }))}
            />
            <CollectionList
              icon={Gem}
              eyebrow="Forge inventory"
              title="Materials"
              empty="No forge materials gathered yet."
              items={(progression?.materials || []).map((material) => ({
                key: material.materialKey,
                title: titleFromKey(material.materialKey),
                detail: `${material.balance} available`,
              }))}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

function CollectionList({ icon: Icon, eyebrow, title, empty, items }) {
  return (
    <section className="rounded-lg border-[3px] border-[#485365] bg-[#faf3eb] p-4 shadow-[0_6px_0_rgb(72_83_101_/_16%)]">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-[#485365] bg-[#f8e6e6]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
        <div><p className="text-[10px] font-black uppercase text-[#657080]">{eyebrow}</p><h2 className="font-heading text-lg font-black">{title}</h2></div>
      </header>
      {items.length ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <article key={item.key} className="min-w-0 rounded-md border-2 border-[#707989] bg-[#eaeee0] p-3">
              <h3 className="truncate text-sm font-black">{item.title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#657080]">{item.detail}</p>
            </article>
          ))}
        </div>
      ) : <p className="mt-4 rounded-md border-2 border-dashed border-[#9a8f8a] bg-[#eee8e8] p-5 text-center text-sm text-[#657080]">{empty}</p>}
    </section>
  );
}
