import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Gem, Loader2, LogIn, Settings, Shield, Sparkles, WandSparkles } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import RankBadge from "@/components/RankBadge";
import ProgressionLoop from "@/components/ProgressionLoop";
import { getPrivateUserKey } from "@/lib/communityActor";
import { useAuth } from "@/lib/AuthContext";
import { getRoleLabel } from "@/lib/roles";
import { getPublicAvatar, getPublicDisplayName } from "@/lib/userIdentity";
import PublicAvatar from "@/components/PublicAvatar";
import { loadUserRelicInventory } from "@/lib/relicService";
import { getProfileRelicTeaser } from "@/lib/profileRelicTeasers";
import BirthdayWishInbox from "@/components/birthdays/BirthdayWishInbox";

function getRelicLoadMessage(error) {
  if (error?.status === 401 || error?.message === "Authentication required") {
    return "Sign in to claim your relic.";
  }
  if (error?.message?.includes("Supabase is not configured")) {
    return "Relic storage is not configured in this local preview.";
  }
  return "Profile relics could not be loaded.";
}

export default function Profile() {
  const { openLogin } = useAuth();
  const [user, setUser] = useState(null);
  const [level, setLevel] = useState(null);
  const [charms, setCharms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = async () => {
    setError("");
    setLoading(true);
    try {
      const me = await communityClient.auth.me();
      const [levels, inventory] = await Promise.all([
        communityClient.entities.UserLevel.filter({ user_key: getPrivateUserKey(me) }).catch(() => []),
        loadUserRelicInventory(),
      ]);
      setUser(me);
      setLevel(levels[0] || null);
      setCharms(inventory.charms);
    } catch (loadError) {
      setUser(null);
      setError(getRelicLoadMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const equippedCount = charms.filter((charm) => charm.equipped).length;
  const relicTeaser = useMemo(() => user ? getProfileRelicTeaser(user) : null, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl animate-fade-in rounded-xl border border-border bg-card p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <LogIn className="h-6 w-6" />
        </div>
        <h1 className="mt-4 font-heading text-2xl font-bold">Claim Your Profile Relic</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error || "Sign in to save your relic, roll charms, and attach collectibles."}</p>
        <Button className="mt-5 gap-2" onClick={openLogin}>
          <LogIn className="h-4 w-4" /> Sign in
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <PublicAvatar src={getPublicAvatar(user)} name={getPublicDisplayName(user, "Profile")} size="lg" className="rounded-xl" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Profile</p>
              <h1 className="mt-1 truncate font-heading text-2xl font-bold">{getPublicDisplayName(user, "Profile")}</h1>
              <p className="text-sm text-muted-foreground">{getRoleLabel(user.role)}</p>
              {user.profile_status && <p className="mt-2 text-sm text-primary">{user.profile_status}</p>}
              {user.bio && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{user.bio}</p>}
            </div>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/settings"><Settings className="h-4 w-4" /> Settings</Link>
            </Button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)]">
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <RankBadge
                points={level?.points || 0}
                showProgress
                isFavored={Boolean(level?.is_favored)}
                favoredTitle={level?.favored_title}
              />
              <div className="mt-4">
                <ProgressionLoop
                  points={level?.points || 0}
                  compact
                  framed={false}
                  isFavored={Boolean(level?.is_favored)}
                  favoredTitle={level?.favored_title}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <ProfileStat icon={Gem} label="Owned charms" value={charms.length} />
              <ProfileStat icon={Shield} label="Attached" value={equippedCount} />
              <ProfileStat icon={Sparkles} label="Favor" value={level?.points || 0} />
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="relative min-h-44 bg-[radial-gradient(circle_at_50%_15%,rgba(69,70,255,0.28),transparent_48%),linear-gradient(145deg,rgba(7,20,36,0.96),rgba(18,16,35,0.98))] p-5">
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/55 to-transparent" />
            <img
              src={relicTeaser?.image}
              alt=""
              className="mx-auto h-28 w-28 object-contain opacity-80 drop-shadow-[0_0_28px_rgba(56,189,248,0.35)]"
            />
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Profile Relic</p>
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                {relicTeaser?.stage}
              </span>
            </div>
            <h2 className="mt-2 font-heading text-xl font-bold">{relicTeaser?.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{relicTeaser?.omen}</p>
            <div className="mt-4 rounded-lg border border-border bg-secondary/25 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Seal ID</p>
              <p className="mt-1 font-heading text-lg font-semibold text-primary">{relicTeaser?.code}</p>
            </div>
            <Button disabled className="mt-4 w-full gap-2">
              <WandSparkles className="h-4 w-4" /> Forge Opens Soon
            </Button>
          </div>
        </div>
      </section>

      <BirthdayWishInbox userId={user.id} />

      <section className="rounded-xl border border-border bg-card/85 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Relic Archive</p>
            <h2 className="mt-1 font-heading text-xl font-bold">Your collection has its own room now</h2>
            <p className="mt-1 text-sm text-muted-foreground">Open the shelf to inspect stacks, equip charms, forge your relic, or visit the separate Charm Draw.</p>
          </div>
          <Button asChild className="gap-2">
            <Link to="/relics"><Gem className="h-4 w-4" /> Open Collection</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
