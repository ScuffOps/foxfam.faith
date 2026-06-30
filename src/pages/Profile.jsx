import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Dice5, Gem, Loader2, LogIn, Settings, Shield, Sparkles, WandSparkles } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import RelicPreview from "@/components/relics/RelicPreview";
import ProfileCharmShelf from "@/components/relics/ProfileCharmShelf";
import RankBadge from "@/components/RankBadge";
import ProgressionLoop from "@/components/ProgressionLoop";
import { getPrivateUserKey } from "@/lib/communityActor";
import { useAuth } from "@/lib/AuthContext";
import { getRoleLabel } from "@/lib/roles";
import { getPublicAvatar, getPublicDisplayName } from "@/lib/userIdentity";
import { loadCharmRollEligibility, loadUserRelicInventory, rollUserRelicCharm, setEquippedCharm } from "@/lib/relicService";
import { groupCharmsByRarity, RELIC_RARITY_META } from "@/lib/relicCharms";
import { getProfileRelicTeaser } from "@/lib/profileRelicTeasers";

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
  const { profileId } = useParams();
  const { openLogin } = useAuth();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [level, setLevel] = useState(null);
  const [relic, setRelic] = useState(null);
  const [charms, setCharms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rolling, setRolling] = useState(false);
  const [equippingId, setEquippingId] = useState("");
  const [rollEligibility, setRollEligibility] = useState({ canRoll: false, reason: "Checking stream status..." });
  const [error, setError] = useState("");

  const loadProfile = async () => {
    setError("");
    setLoading(true);
    try {
      let me = null;
      try {
        me = await communityClient.auth.me();
      } catch (authError) {
        if (!profileId) throw authError;
      }

      let profile = me;
      if (profileId && profileId !== me?.id) {
        const profiles = await communityClient.entities.User.list();
        profile = profiles.find((item) => item.id === profileId) || null;
        if (!profile) throw new Error("Profile not found.");
      }

      const isOwner = Boolean(me?.id && profile?.id === me.id);
      setViewer(me);
      setUser(profile);

      if (isOwner) {
        const [levels, inventory] = await Promise.all([
          communityClient.entities.UserLevel.filter({ user_key: getPrivateUserKey(me) }).catch(() => []),
          loadUserRelicInventory(),
        ]);
        const eligibility = await loadCharmRollEligibility();
        setLevel(levels[0] || null);
        setRelic(inventory.relic);
        setCharms(inventory.charms);
        setRollEligibility(eligibility);
      } else {
        setLevel(null);
        setRelic(null);
        setCharms([]);
        setRollEligibility({ canRoll: false, reason: "Charm rolls are only available on your own profile." });
      }
    } catch (loadError) {
      setUser(null);
      setViewer(null);
      setError(profileId ? loadError?.message || "Profile could not be loaded." : getRelicLoadMessage(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [profileId]);

  const groupedCharms = useMemo(() => groupCharmsByRarity(charms), [charms]);
  const equippedCount = charms.filter((charm) => charm.equipped).length;
  const relicTeaser = useMemo(() => user ? getProfileRelicTeaser(user) : null, [user]);
  const isOwnProfile = Boolean(viewer?.id && user?.id === viewer.id);

  const handleRollCharm = async () => {
    setRolling(true);
    try {
      const charm = await rollUserRelicCharm();
      setCharms((current) => [charm, ...current]);
      const rarity = RELIC_RARITY_META[charm.rarity]?.label || "Charm";
      toast({ title: `${rarity} charm acquired`, description: charm.name });
    } catch (rollError) {
      toast({
        title: "Charm roll failed",
        description: rollError?.message || "The relic table rejected the draw. Try again after refreshing.",
        variant: "destructive",
      });
    } finally {
      setRolling(false);
    }
  };

  const handleToggleCharm = async (charm) => {
    setEquippingId(charm.id);
    try {
      const updatedCharms = await setEquippedCharm(charm, charms, !charm.equipped);
      setCharms(updatedCharms);
      toast({ title: charm.equipped ? "Charm detached" : "Charm attached", description: charm.name });
    } catch {
      toast({ title: "Charm could not be equipped", description: "Refresh and try again.", variant: "destructive" });
    } finally {
      setEquippingId("");
    }
  };

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
        {!profileId && (
          <Button className="mt-5 gap-2" onClick={openLogin}>
            <LogIn className="h-4 w-4" /> Sign in
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-6">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar avatar={getPublicAvatar(user)} name={getPublicDisplayName(user, "Profile")} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Profile</p>
              <h1 className="mt-1 truncate font-heading text-2xl font-bold">{getPublicDisplayName(user, "Profile")}</h1>
              <p className="text-sm text-muted-foreground">{getRoleLabel(user.role)}</p>
            </div>
            {isOwnProfile ? (
              <Button asChild variant="outline" className="gap-2">
                <Link to="/settings"><Settings className="h-4 w-4" /> Settings</Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="gap-2">
                <Link to="/profile"><Shield className="h-4 w-4" /> My profile</Link>
              </Button>
            )}
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
            {isOwnProfile ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <ProfileStat icon={Gem} label="Owned charms" value={charms.length} />
                <ProfileStat icon={Shield} label="Attached" value={equippedCount} />
                <ProfileStat icon={Sparkles} label="Favor" value={level?.points || 0} />
              </div>
            ) : (
              <PublicProfileMeta user={user} relicTeaser={relicTeaser} />
            )}
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

      {isOwnProfile ? (
        <>
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <RelicPreview relic={relic} charms={charms} />

            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Charm Draw</p>
                    <h2 className="mt-1 font-heading text-lg font-bold">Relic charm roll</h2>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Weighted rarity draw. Duplicates are still collectible instances.</p>
                  </div>
                  <Dice5 className="h-5 w-5 text-primary" />
                </div>
                <Button onClick={handleRollCharm} disabled={rolling || !rollEligibility.canRoll} className="mt-4 w-full gap-2">
                  {rolling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dice5 className="h-4 w-4" />}
                  {rolling ? "Drawing..." : rollEligibility.canRoll ? "Roll Charm" : "Locked"}
                </Button>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{rollEligibility.reason}</p>
              </div>
            </div>
          </section>

          <ProfileCharmShelf
            charms={charms}
            groupedCharms={groupedCharms}
            equippingId={equippingId}
            onToggleCharm={handleToggleCharm}
          />
        </>
      ) : (
        <PublicTrophyCase user={user} relicTeaser={relicTeaser} />
      )}
    </div>
  );
}

function PublicProfileMeta({ user, relicTeaser }) {
  return (
    <div className="grid gap-3">
      <ProfileStat icon={Sparkles} label="Relic signal" value={relicTeaser?.stage || "Sealed"} />
      <ProfileStat icon={BookOpen} label="Favorite shrine" value={user.favorite_shrine || "Unchosen"} />
      <ProfileStat icon={Shield} label="Member since" value={user.created_date ? new Date(user.created_date).getFullYear() : "Soon"} />
    </div>
  );
}

function PublicTrophyCase({ user, relicTeaser }) {
  const displayName = getPublicDisplayName(user, "Profile");

  return (
    <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Public Signal</p>
        <h2 className="mt-2 font-heading text-xl font-bold">{user.profile_status || `${displayName} has not set a status yet.`}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          {user.bio || "This profile is still quiet. The shelf is waiting for charms, lore, and a little harmless dramatic timing."}
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-muted-foreground">Trophy Case</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="col-span-2 rounded-lg border border-primary/30 bg-primary/10 p-3">
            <img src={relicTeaser?.image} alt="" className="mx-auto h-20 w-20 object-contain opacity-85" />
            <p className="mt-2 text-center text-xs font-semibold">{relicTeaser?.title}</p>
          </div>
          {[0, 1].map((index) => (
            <div key={index} className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/25 text-center text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              Sealed
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          Equipped public charms are staged here. Private inventory stays hidden unless the owner exposes a charm.
        </p>
      </div>
    </section>
  );
}

function ProfileStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-4">
      <Icon className="h-4 w-4 text-primary" />
      <p className="mt-3 break-words font-heading text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Avatar({ avatar, name }) {
  if (avatar) {
    return <img src={avatar} alt="" className="h-16 w-16 shrink-0 rounded-xl border border-primary/25 object-cover" />;
  }

  const initials = String(name || "FF").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/15 font-heading text-lg font-bold text-primary">
      {initials}
    </div>
  );
}
