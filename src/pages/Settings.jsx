import { useState, useEffect } from "react";
import { communityClient } from "@/api/communityClient";
import { Settings2, Link2, Shield, LogOut, CheckCircle, Palette, Bell, ChevronDown, ChevronUp, UserCircle2, CalendarDays, MessagesSquare, Radio, Apple } from "lucide-react";
import AlertPreferences from "../components/settings/AlertPreferences";
import AvatarUpload from "../components/AvatarUpload";
import AccentColorPicker from "../components/AccentColorPicker";
import { Button } from "@/components/ui/button";
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
    pendingCopy: "Identity linked. Calendar write/sync still needs Google credentials and a Supabase server token handler.",
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

  const handleAvatarUploaded = (url) => {
    setAvatar(url);
    localStorage.setItem('commhub_user_avatar', url);
  };

  async function loadLinkedIdentities() {
    setIdentityLoading(true);
    try {
      const identities = await communityClient.auth.getLinkedIdentities();
      setLinkedIdentities(identities);
    } catch {
      setLinkedIdentities([]);
    } finally {
      setIdentityLoading(false);
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const me = await communityClient.auth.me();
        setUser(me);
        const levels = await communityClient.entities.UserLevel.filter({ user_key: getPrivateUserKey(me) });
        if (levels.length > 0) {
          setUserLevel(levels[0]);
          setUserPoints(levels[0].points || 0);
        }
        await loadLinkedIdentities();
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
      const options = item.scopes ? { scopes: item.scopes } : {};
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
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-xs text-muted-foreground">{getPublicDisplayName(user, "Not set")}</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Sign-in email</p>
                <p className="text-xs text-muted-foreground">Private</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Role</p>
                <p className="text-xs text-muted-foreground">{getRoleLabel(user?.role)}</p>
              </div>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </SettingsSection>

        {/* Linked Accounts */}
        <SettingsSection title="Linked Accounts" icon={Link2} accentClass="bg-chart-2/15 text-chart-2">
          <div id="integrations" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {OAUTH_PROVIDERS.map((item) => {
              const identity = linkedIdentities.find((linked) => linked.provider === item.authProvider);
              const connected = Boolean(identity);
              const busy = linkingProvider === item.key || identityLoading;
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
                    <p className="mt-3 text-xs text-success/80">
                      {item.pendingCopy}
                    </p>
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
