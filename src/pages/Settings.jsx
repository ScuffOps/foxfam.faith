import { useState, useEffect } from "react";
import { communityClient } from "@/api/communityClient";
import { Settings2, Link2, Shield, LogOut, CheckCircle, Palette, Bell, ChevronDown, ChevronUp, UserCircle2, CalendarDays, MessagesSquare, Radio, Apple, Save } from "lucide-react";
import AlertPreferences from "../components/settings/AlertPreferences";
import AvatarUpload from "../components/AvatarUpload";
import AccentColorPicker from "../components/AccentColorPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import GlassCard from "../components/GlassCard";
import RankBadge from "../components/RankBadge";
import ProgressionLoop from "../components/ProgressionLoop";
import { canUseAdminPanel, getRoleLabel } from "@/lib/roles";
import { getPrivateUserKey } from "@/lib/communityActor";
import { getPublicDisplayName } from "@/lib/userIdentity";

const OAUTH_PROVIDERS = [
  {
    key: "googleCalendar",
    authProvider: "google",
    provider: "Google Calendar",
    icon: CalendarDays,
    copy: "Link Google so the theoretical schedule can become a real calendar object.",
    scopes: "openid email profile https://www.googleapis.com/auth/calendar.events",
    queryParams: { access_type: "offline", prompt: "consent" },
    pendingCopy: "Identity linked. Calendar sync is finalized by the Supabase server token handler.",
  },
  {
    key: "twitch",
    authProvider: "twitch",
    provider: "Twitch",
    icon: Radio,
    copy: "Link Twitch so stream-facing features know which beloved chaos witness you are.",
  },
  {
    key: "discord",
    authProvider: "discord",
    provider: "Discord",
    icon: MessagesSquare,
    copy: "Link Discord for identity, roles, and the future ping machinery.",
  },
  {
    key: "apple",
    authProvider: "apple",
    provider: "Apple",
    icon: Apple,
    copy: "Link Apple if you prefer your login ritual a little quieter.",
  },
];

function getIdentityLabel(identity) {
  const data = identity?.identity_data || {};
  return (
    data.full_name ||
    data.name ||
    data.user_name ||
    data.username ||
    data.preferred_username ||
    "Connected"
  );
}

export default function Settings() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [userLevel, setUserLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatar, setAvatar] = useState(() => localStorage.getItem('commhub_user_avatar') || '');
  const [linkedIdentities, setLinkedIdentities] = useState([]);
  const [identityLoading, setIdentityLoading] = useState(false);
  const [linkingProvider, setLinkingProvider] = useState("");
  const [profileForm, setProfileForm] = useState({ displayName: "", email: "", profileStatus: "", bio: "", favoriteShrine: "" });
  const [savingProfile, setSavingProfile] = useState("");
  const [calendarSyncStatus, setCalendarSyncStatus] = useState(null);
  const [calendarSyncLoading, setCalendarSyncLoading] = useState(false);

  const handleAvatarUploaded = (url) => {
    setAvatar(url);
    localStorage.setItem('commhub_user_avatar', url);
  };

  async function loadLinkedIdentities() {
    setIdentityLoading(true);
    try {
      const identities = await communityClient.auth.getLinkedIdentities();
      setLinkedIdentities(identities);
      return identities;
    } catch {
      setLinkedIdentities([]);
      return [];
    } finally {
      setIdentityLoading(false);
    }
  }

  async function loadCalendarSyncStatus() {
    setCalendarSyncLoading(true);
    try {
      const connection = await communityClient.integrations.GoogleCalendar.getStatus();
      setCalendarSyncStatus(connection);
      return connection;
    } catch {
      setCalendarSyncStatus(null);
      return null;
    } finally {
      setCalendarSyncLoading(false);
    }
  }

  async function finalizeGoogleCalendarSync({ quiet = false } = {}) {
    setCalendarSyncLoading(true);
    try {
      const result = await communityClient.integrations.GoogleCalendar.captureSessionToken();
      await loadCalendarSyncStatus();
      if (!quiet) {
        toast({
          title: result?.ok === false ? "Reconnect Google Calendar" : "Google Calendar sync ready",
          description: result?.ok === false
            ? "Google did not return a fresh calendar token. Connect again and approve calendar access."
            : "New staff events can now sync to Google Calendar.",
        });
      }
      return result;
    } catch (error) {
      await loadCalendarSyncStatus();
      if (!quiet) {
        toast({
          title: "Calendar sync could not be finalized",
          description: error?.message || "Reconnect Google and approve calendar access.",
          variant: "destructive",
        });
      }
      return null;
    } finally {
      setCalendarSyncLoading(false);
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const me = await communityClient.auth.me();
        setUser(me);
        setProfileForm({
          displayName: getPublicDisplayName(me, ""),
          email: me.email || "",
          profileStatus: me.profile_status || "",
          bio: me.bio || "",
          favoriteShrine: me.favorite_shrine || "",
        });
        const levels = await communityClient.entities.UserLevel.filter({ user_key: getPrivateUserKey(me) });
        if (levels.length > 0) {
          setUserLevel(levels[0]);
          setUserPoints(levels[0].points || 0);
        }
        const identities = await loadLinkedIdentities();
        if (identities.some((identity) => identity.provider === "google")) {
          await finalizeGoogleCalendarSync({ quiet: true });
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const handleConnectProvider = async (item, connected) => {
    if (connected) {
      await loadLinkedIdentities();
      toast({ title: `${item.provider} connection refreshed` });
      return;
    }

    setLinkingProvider(item.key);
    try {
      const options = {
        ...(item.scopes ? { scopes: item.scopes } : {}),
        ...(item.queryParams ? { queryParams: item.queryParams } : {}),
      };
      if (user) {
        await communityClient.auth.linkIdentity(item.authProvider, options);
      } else {
        await communityClient.auth.signInWithProvider(item.authProvider, options);
      }
    } catch (error) {
      setLinkingProvider("");
      toast({
        title: `${item.provider} could not be linked`,
        description: error?.message || "Check that this provider is enabled in Supabase Auth and try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectProvider = async (item, identity) => {
    if (!identity) return;
    if (linkedIdentities.length < 2) {
      toast({
        title: "Keep one sign-in method",
        description: "Supabase requires at least two linked identities before one can be disconnected.",
      });
      return;
    }

    setLinkingProvider(item.key);
    try {
      await communityClient.auth.unlinkIdentity(identity);
      await loadLinkedIdentities();
      toast({ title: `${item.provider} disconnected` });
    } catch (error) {
      toast({
        title: `${item.provider} could not be disconnected`,
        description: error?.message || "Try again after refreshing your session.",
        variant: "destructive",
      });
    } finally {
      setLinkingProvider("");
    }
  };

  const handleSaveDisplayName = async () => {
    const displayName = profileForm.displayName.trim();
    if (!displayName) {
      toast({ title: "Display name required", description: "Use a registered username, nickname, or Guest.", variant: "destructive" });
      return;
    }

    setSavingProfile("displayName");
    try {
      const updated = await communityClient.auth.updateMe({ display_name: displayName });
      setUser(updated);
      setProfileForm((current) => ({ ...current, displayName: getPublicDisplayName(updated, displayName) }));
      toast({ title: "Display name saved" });
    } catch (error) {
      toast({ title: "Display name could not be saved", description: error?.message || "Refresh and try again.", variant: "destructive" });
    } finally {
      setSavingProfile("");
    }
  };

  const handleSaveEmail = async () => {
    const email = profileForm.email.trim();
    if (!email) {
      toast({ title: "Email required", description: "Enter the new private sign-in email.", variant: "destructive" });
      return;
    }

    setSavingProfile("email");
    try {
      await communityClient.auth.updateEmail(email);
      toast({
        title: "Check your email",
        description: "Supabase will confirm the new sign-in email before it changes.",
      });
    } catch (error) {
      toast({ title: "Email could not be changed", description: error?.message || "Refresh and try again.", variant: "destructive" });
    } finally {
      setSavingProfile("");
    }
  };

  const handleSavePublicProfile = async () => {
    setSavingProfile("publicProfile");
    try {
      const updated = await communityClient.auth.updateMe({
        profile_status: profileForm.profileStatus.trim(),
        bio: profileForm.bio.trim(),
        favorite_shrine: profileForm.favoriteShrine.trim(),
      });
      setUser(updated);
      setProfileForm((current) => ({
        ...current,
        profileStatus: updated.profile_status || "",
        bio: updated.bio || "",
        favoriteShrine: updated.favorite_shrine || "",
      }));
      toast({ title: "Public profile saved" });
    } catch (error) {
      toast({ title: "Public profile could not be saved", description: error?.message || "Refresh and try again.", variant: "destructive" });
    } finally {
      setSavingProfile("");
    }
  };

  const isAdmin = canUseAdminPanel(user);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Tune your identity, alerts, and integrations that bravely pretend we have a schedule.</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <SettingsSection title="Profile" icon={UserCircle2} accentClass="bg-primary/15 text-primary" defaultOpen>
          <div className="mb-4 flex items-center gap-3">
            <AvatarUpload avatarUrl={avatar} onUploaded={handleAvatarUploaded} size="lg" />
            <div className="flex flex-col gap-1.5">
              <h3 className="font-heading text-sm font-semibold">{getPublicDisplayName(user, "Profile")}</h3>
              <p className="text-xs text-muted-foreground">{getRoleLabel(user?.role)}</p>
              <RankBadge
                points={userPoints}
                showProgress
                isFavored={Boolean(userLevel?.is_favored)}
                favoredTitle={userLevel?.favored_title}
              />
            </div>
          </div>
          <div className="mb-4 rounded-lg border border-border bg-secondary/30 p-4">
            <ProgressionLoop
              points={userPoints}
              compact
              framed={false}
              isFavored={Boolean(userLevel?.is_favored)}
              favoredTitle={userLevel?.favored_title}
            />
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-secondary/50 px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1">
                  <span className="text-sm font-medium">Display name</span>
                  <Input
                    value={profileForm.displayName}
                    onChange={(event) => setProfileForm((current) => ({ ...current, displayName: event.target.value }))}
                    className="mt-1.5 bg-background/70"
                    placeholder="Username, nickname, or Guest"
                  />
                </label>
                <Button onClick={handleSaveDisplayName} disabled={savingProfile === "displayName"} className="gap-2">
                  <Save className="h-4 w-4" /> Save
                </Button>
              </div>
            </div>
            <div className="rounded-lg bg-secondary/50 px-4 py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="min-w-0 flex-1">
                  <span className="text-sm font-medium">Sign-in email</span>
                  <Input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))}
                    className="mt-1.5 bg-background/70"
                    placeholder="Private sign-in email"
                  />
                  <span className="mt-1 block text-xs text-muted-foreground">Private. Never shown publicly.</span>
                </label>
                <Button onClick={handleSaveEmail} disabled={savingProfile === "email"} className="gap-2">
                  <Save className="h-4 w-4" /> Change
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Role</p>
                <p className="text-xs text-muted-foreground">{getRoleLabel(user?.role)}</p>
              </div>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="rounded-lg bg-secondary/50 px-4 py-3">
              <div className="grid gap-3">
                <label>
                  <span className="text-sm font-medium">Profile status</span>
                  <Input
                    value={profileForm.profileStatus}
                    onChange={(event) => setProfileForm((current) => ({ ...current, profileStatus: event.target.value }))}
                    className="mt-1.5 bg-background/70"
                    maxLength={80}
                    placeholder="Open for lore, lurking, building shrines..."
                  />
                </label>
                <label>
                  <span className="text-sm font-medium">Bio</span>
                  <Textarea
                    value={profileForm.bio}
                    onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
                    className="mt-1.5 min-h-24 bg-background/70"
                    maxLength={280}
                    placeholder="A tiny public intro for your Foxfam profile."
                  />
                </label>
                <label>
                  <span className="text-sm font-medium">Favorite shrine category</span>
                  <Input
                    value={profileForm.favoriteShrine}
                    onChange={(event) => setProfileForm((current) => ({ ...current, favoriteShrine: event.target.value }))}
                    className="mt-1.5 bg-background/70"
                    maxLength={60}
                    placeholder="Prayer wall, reliquary, polls, offerings..."
                  />
                </label>
                <Button onClick={handleSavePublicProfile} disabled={savingProfile === "publicProfile"} className="w-fit gap-2">
                  <Save className="h-4 w-4" /> Save public profile
                </Button>
              </div>
            </div>
          </div>
        </SettingsSection>

        {/* Linked Accounts */}
        <SettingsSection title="Linked Accounts" icon={Link2} accentClass="bg-chart-2/15 text-chart-2">
          <div id="integrations" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {OAUTH_PROVIDERS.map((item) => {
              const identity = linkedIdentities.find((linked) => linked.provider === item.authProvider);
              const connected = Boolean(identity);
              const busy = linkingProvider === item.key || identityLoading || (item.key === "googleCalendar" && calendarSyncLoading);
              const calendarStatus = calendarSyncStatus?.status || (connected ? "pending" : "");
              return (
                <div key={item.provider} className="rounded-lg border border-border bg-secondary/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <item.icon className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">{item.provider}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{connected ? getIdentityLabel(identity) : item.copy}</p>
                    </div>
                    {connected && <CheckCircle className="h-4 w-4 shrink-0 text-success" />}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleConnectProvider(item, connected)}
                      disabled={busy}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      {connected ? "Refresh" : `Connect ${item.provider}`}
                    </button>
                    {connected && (
                      <button
                        type="button"
                        onClick={() => handleDisconnectProvider(item, identity)}
                        disabled={busy}
                        className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                  {item.key === "googleCalendar" && connected && (
                    <div className="mt-3 space-y-2 rounded-md border border-border bg-background/40 p-2 text-xs">
                      <p className={calendarStatus === "connected" ? "text-success" : "text-muted-foreground"}>
                        Sync status: {calendarSyncLoading ? "checking..." : calendarStatus}
                      </p>
                      {calendarSyncStatus?.last_synced_at && (
                        <p className="text-muted-foreground">
                          Last event sync: {new Date(calendarSyncStatus.last_synced_at).toLocaleString()}
                        </p>
                      )}
                      {calendarSyncStatus?.last_error && (
                        <p className="text-destructive">Last error: {calendarSyncStatus.last_error}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => finalizeGoogleCalendarSync()}
                        disabled={busy}
                        className="text-xs font-medium text-primary underline hover:text-primary/80 disabled:opacity-50"
                      >
                        Finalize calendar sync
                      </button>
                      <p className="text-muted-foreground">{item.pendingCopy}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection title="Appearance" icon={Palette} accentClass="bg-chart-5/15 text-chart-5">
          <AccentColorPicker />
        </SettingsSection>

        {/* Alert Preferences */}
        <SettingsSection title="Alert Preferences" icon={Bell} accentClass="bg-primary/15 text-primary">
          <AlertPreferences />
        </SettingsSection>

        {/* App Settings */}
        {isAdmin && (
          <SettingsSection title="App Settings" icon={Settings2} accentClass="bg-chart-4/15 text-chart-4">
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary/50 px-4 py-3">
                <p className="text-sm font-medium">Auto-approve birthdays</p>
                <p className="text-xs text-muted-foreground">Coming soon: birthdays approved without summoning a staff meeting.</p>
              </div>
              <div className="rounded-lg bg-secondary/50 px-4 py-3">
                <p className="text-sm font-medium">Auto-approve community posts</p>
                <p className="text-xs text-muted-foreground">Coming soon: trusted members skip the velvet rope, gently.</p>
              </div>
            </div>
          </SettingsSection>
        )}

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => communityClient.auth.logout()}
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
}

function SettingsSection({ title, icon: Icon, accentClass, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <GlassCard>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={open}
      >
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accentClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-heading text-sm font-semibold">{title}</h3>
        <span className="ml-auto text-muted-foreground">
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </GlassCard>
  );
}
