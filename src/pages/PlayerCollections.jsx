import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Award, BookOpen, Gem, Loader2, RefreshCw, Sparkles, Star, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import RelicCharmIcon from "@/components/relics/RelicCharmIcon";
import { getCharmPresentation } from "@/components/relics/charmPresentation";
import { getAchievementPresentation, getTrophyPresentation } from "@/components/relics/trophyPresentation";
import {
  COLLECTIBLE_ART_KINDS,
  getApprovedCollectibleArtAsset,
} from "@/components/relics/collectibleArtManifest";
import { useAuth } from "@/lib/AuthContext";
import { RELIC_RARITY_META } from "@/lib/relicCharms";
import { loadUserRelicInventory } from "@/lib/relicService";
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
  const [collections, setCollections] = useState({ progression: null, charms: [] });

  const loadCollections = useCallback(async () => {
    setStatus("loading");
    try {
      const [progression, relicInventory] = await Promise.all([
        loadStarfishingProgression(),
        loadUserRelicInventory(),
      ]);
      setCollections({ progression, charms: relicInventory.charms || [] });
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
    Promise.all([loadStarfishingProgression(), loadUserRelicInventory()])
      .then(([progression, relicInventory]) => {
        if (!active) return;
        setCollections({ progression, charms: relicInventory.charms || [] });
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => { active = false; };
  }, [isAuthenticated, isLoadingAuth]);

  const { progression, charms } = collections;

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

          <CharmReliquary charms={charms} />

          <AchievementChronicle achievements={progression?.achievements || []} />

          <div className="grid gap-4 lg:grid-cols-2">
            <TrophyShelf trophies={progression?.trophies || []} />
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

function AchievementChronicle({ achievements }) {
  return (
    <section className="rounded-lg border-[3px] border-[#485365] bg-[#faf3eb] p-4 shadow-[0_6px_0_rgb(72_83_101_/_16%)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-[#485365] bg-[#d9e6ec]">
            <Award className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase text-[#657080]">Every world remembered</p>
            <h2 className="font-heading text-lg font-black">Achievement Chronicle</h2>
          </div>
        </div>
        <span className="rounded-md border-2 border-[#485365] bg-[#eaeee0] px-3 py-1.5 text-xs font-black">
          {achievements.length} earned
        </span>
      </header>

      {achievements.length ? (
        <ol className="mt-4 divide-y-2 divide-[#a8a4a0] border-y-2 border-[#a8a4a0]">
          {achievements.map((achievement) => {
            const presentation = getAchievementPresentation(achievement);
            return (
              <li key={achievement.achievementKey} className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black">{presentation.title}</p>
                  <p className="mt-0.5 text-xs font-bold text-[#657080]">{presentation.gameLabel}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase text-[#707989]">{presentation.provenanceLabel}</p>
                </div>
                <time className="text-right text-[10px] font-bold uppercase text-[#707989]" dateTime={achievement.unlockedAt}>
                  {presentation.unlockedLabel}
                </time>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-4 rounded-md border-2 border-dashed border-[#9a8f8a] bg-[#eee8e8] p-5 text-center text-sm text-[#657080]">
          Your first achievement will be written here.
        </p>
      )}
    </section>
  );
}

function CharmReliquary({ charms }) {
  return (
    <section className="rounded-lg border-[3px] border-[#485365] bg-[#faf3eb] p-4 shadow-[0_6px_0_rgb(72_83_101_/_16%)]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-[#485365] bg-[#dfd8ab]">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase text-[#657080]">Equippable keepsakes</p>
            <h2 className="font-heading text-lg font-black">Charm Reliquary</h2>
          </div>
        </div>
        <span className="rounded-md border-2 border-[#485365] bg-[#d9e6ec] px-3 py-1.5 text-xs font-black">
          {charms.length} owned
        </span>
      </header>

      {charms.length ? (
        <div className="mt-4 divide-y-2 divide-[#a8a4a0] border-y-2 border-[#a8a4a0]">
          {charms.map((charm) => (
            <CharmCollectionRow key={charm.id || charm.instance_id || charm.charm_key} charm={charm} />
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md border-2 border-dashed border-[#9a8f8a] bg-[#eee8e8] p-5 text-center text-sm text-[#657080]">
          No charms have reached the reliquary yet.
        </p>
      )}
    </section>
  );
}

function TrophyShelf({ trophies }) {
  return (
    <section className="rounded-lg border-[3px] border-[#485365] bg-[#faf3eb] p-4 shadow-[0_6px_0_rgb(72_83_101_/_16%)]">
      <header className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-md border-2 border-[#485365] bg-[#f8e6e6]">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase text-[#657080]">Permanent milestones</p>
          <h2 className="font-heading text-lg font-black">Trophy Shelf</h2>
        </div>
      </header>
      {trophies.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {trophies.map((trophy) => <TrophyCard key={trophy.id || trophy.trophyKey} trophy={trophy} />)}
        </div>
      ) : (
        <p className="mt-4 rounded-md border-2 border-dashed border-[#9a8f8a] bg-[#eee8e8] p-5 text-center text-sm text-[#657080]">
          No trophies have reached the shelf yet.
        </p>
      )}
    </section>
  );
}

function TrophyCard({ trophy }) {
  const presentation = getTrophyPresentation(trophy);
  const trophyKey = trophy.trophyKey || trophy.trophy_key;
  const approvedAsset = getApprovedCollectibleArtAsset(COLLECTIBLE_ART_KINDS.trophy, trophyKey);
  return (
    <article className="grid min-h-28 grid-cols-[3.25rem_minmax(0,1fr)] gap-3 rounded-md border-2 border-[#707989] bg-[#eaeee0] p-3">
      <span className="flex h-12 w-12 items-center justify-center rounded-md border-2 border-[#485365] bg-[#dfd8ab] text-[#485365]" aria-hidden="true">
        {approvedAsset ? (
          <img className="h-10 w-10 object-contain" src={approvedAsset} alt="" data-trophy-art={trophyKey} data-art-source="approved" />
        ) : (
          <Trophy className="h-6 w-6" data-art-source="fallback" />
        )}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="truncate text-sm font-black">{presentation.title}</h3>
          <span className="rounded border border-[#707989] bg-[#faf3eb] px-1.5 py-0.5 text-[9px] font-black uppercase text-[#53606d]">Permanent</span>
        </div>
        <p className="mt-1 text-xs font-black text-[#53606d]">{presentation.gameLabel}</p>
        <p className="mt-1 text-xs leading-5 text-[#657080]">{presentation.achievementLabel}</p>
        <p className="mt-1 text-[10px] font-bold uppercase text-[#707989]">Awarded {presentation.acquiredLabel}</p>
      </div>
    </article>
  );
}

function CharmCollectionRow({ charm }) {
  const presentation = getCharmPresentation(charm);
  const rarity = RELIC_RARITY_META[charm.rarity] || RELIC_RARITY_META.common;

  return (
    <article className="grid min-h-24 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
      <span className="flex h-16 w-16 items-center justify-center rounded-md border-2 border-[#707989] bg-[#eaeee0]">
        <RelicCharmIcon charm={charm} className="h-14 w-14" />
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-sm font-black">{charm.name}</h3>
          <span className="rounded border border-[#707989] bg-[#eee8e8] px-1.5 py-0.5 text-[10px] font-black uppercase text-[#53606d]">
            {rarity.label}
          </span>
          {charm.equipped ? (
            <span className="rounded border border-[#547b69] bg-[#dce8d8] px-1.5 py-0.5 text-[10px] font-black uppercase text-[#355745]">
              Equipped
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs font-bold text-[#657080]">{presentation.provenance} · {presentation.tier}</p>
        {presentation.effectLabels.length ? (
          <p className="mt-1 text-xs leading-5 text-[#657080]">{presentation.effectLabels.join(" · ")}</p>
        ) : null}
      </div>
      <div className="col-start-2 flex items-center gap-1 sm:col-start-auto" aria-label={`${presentation.star} of 3 forge stars`}>
        {[1, 2, 3].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= presentation.star ? "fill-[#dfc982] text-[#485365]" : "text-[#a8a4a0]"}`}
            aria-hidden="true"
          />
        ))}
      </div>
    </article>
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
