import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Settings2, Link2, Shield, LogOut, CheckCircle, Palette, Bell, ChevronDown, ChevronUp, UserCircle2, CalendarDays, MessagesSquare, Radio } from "lucide-react";
import AlertPreferences from "../components/settings/AlertPreferences";
import AvatarUpload from "../components/AvatarUpload";
import AccentColorPicker from "../components/AccentColorPicker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import GlassCard from "../components/GlassCard";
import RankBadge from "../components/RankBadge";
import ProgressionLoop from "../components/ProgressionLoop";
import { canUseAdminPanel, getRoleLabel } from "@/lib/roles";
import { getPublicDisplayName } from "@/lib/userIdentity";

const GOOGLE_CALENDAR_CONNECTOR_ID = "69d2b6bfc53ce38433398132"; // Foxfam Calendar
const ACCOUNT_CONNECTOR_IDS = {
  twitch: import.meta.env.VITE_BASE44_TWITCH_CONNECTOR_ID || "",
  discord: import.meta.env.VITE_BASE44_DISCORD_CONNECTOR_ID || "",
  googleCalendar: GOOGLE_CALENDAR_CONNECTOR_ID,
};
const LINKED_ACCOUNT_STORAGE_PREFIX = "commhub_linked_account_";

export default function Settings() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [userLevel, setUserLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [avatar, setAvatar] = useState(() => localStorage.getItem('commhub_user_avatar') || '');

  const handleAvatarUploaded = (url) => {
    setAvatar(url);
    localStorage.setItem('commhub_user_avatar', url);
  };
  const [gcalConnected, setGcalConnected] = useState(false);
  const [connectingGcal, setConnectingGcal] = useState(false);
  const [localLinkedAccounts, setLocalLinkedAccounts] = useState({});
  const [connectingAccount, setConnectingAccount] = useState(null);

  const handleGcalConnect = async () => {
    setConnectingGcal(true);
    try {
      const url = await base44.connectors.connectAppUser(ACCOUNT_CONNECTOR_IDS.googleCalendar);
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.assign(url);
        return;
      }
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setConnectingGcal(false);
          setGcalConnected(true);
          localStorage.setItem(`${LINKED_ACCOUNT_STORAGE_PREFIX}googleCalendar`, "true");
          toast({ title: "Google Calendar connected!", description: "Two-way sync is now active." });
        }
      }, 500);
    } catch {
      setConnectingGcal(false);
      toast({
        title: "Google Calendar could not connect",
        description: "Check the Base44 connector setup, then try again.",
      });
    }
  };

  const handleGcalDisconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(ACCOUNT_CONNECTOR_IDS.googleCalendar);
      setGcalConnected(false);
      localStorage.removeItem(`${LINKED_ACCOUNT_STORAGE_PREFIX}googleCalendar`);
      toast({ title: "Google Calendar disconnected" });
    } catch {
      toast({
        title: "Could not disconnect Google Calendar",
        description: "The connector may already be disconnected.",
      });
    }
  };

  const handleConnectorConnect = async (accountKey, label) => {
    const connectorId = ACCOUNT_CONNECTOR_IDS[accountKey];
    if (!connectorId) {
      toast({
        title: `${label} connector needs setup`,
        description: `Add VITE_BASE44_${label.toUpperCase()}_CONNECTOR_ID after creating the Base44 connector, then this button will launch OAuth.`,
      });
      return;
    }
    setConnectingAccount(accountKey);
    try {
      const url = await base44.connectors.connectAppUser(connectorId);
      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.assign(url);
        return;
      }
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setConnectingAccount(null);
          localStorage.setItem(`${LINKED_ACCOUNT_STORAGE_PREFIX}${accountKey}`, "true");
          setLocalLinkedAccounts((current) => ({ ...current, [accountKey]: true }));
          toast({ title: `${label} connected`, description: "Your linked account is ready for Foxfam identity features." });
        }
      }, 500);
    } catch {
      setConnectingAccount(null);
      toast({
        title: `${label} could not connect`,
        description: "Check the Base44 connector configuration, then try again.",
      });
    }
  };

  const handleConnectorDisconnect = async (accountKey, label) => {
    const connectorId = ACCOUNT_CONNECTOR_IDS[accountKey];
    setConnectingAccount(accountKey);
    try {
      if (connectorId) {
        await base44.connectors.disconnectAppUser(connectorId);
      }
      localStorage.removeItem(`${LINKED_ACCOUNT_STORAGE_PREFIX}${accountKey}`);
      setLocalLinkedAccounts((current) => ({ ...current, [accountKey]: false }));
      toast({ title: `${label} disconnected` });
    } catch {
      toast({
        title: `${label} could not disconnect`,
        description: "The connector may already be disconnected.",
      });
    } finally {
      setConnectingAccount(null);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        const levels = await base44.entities.UserLevel.filter({ user_email: me.email });
        if (levels.length > 0) {
          setUserLevel(levels[0]);
          setUserPoints(levels[0].points || 0);
        }
      } catch {}
      setLoading(false);
    };
    load();
  }, [])

  useEffect(() => {
    setGcalConnected(localStorage.getItem(`${LINKED_ACCOUNT_STORAGE_PREFIX}googleCalendar`) === "true");
    setLocalLinkedAccounts({
      twitch: localStorage.getItem(`${LINKED_ACCOUNT_STORAGE_PREFIX}twitch`) === "true",
      discord: localStorage.getItem(`${LINKED_ACCOUNT_STORAGE_PREFIX}discord`) === "true",
    });
  }, []);

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
        <p className="mt-1 text-sm text-muted-foreground">Manage your account and integrations</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <SettingsSection title="Profile" icon={UserCircle2} accentClass="bg-primary/15 text-primary" defaultOpen>
          <div className="mb-4 flex items-center gap-3">
            <AvatarUpload avatarUrl={avatar} onUploaded={handleAvatarUploaded} size="lg" />
            <div className="flex flex-col gap-1.5">
              <h3 className="font-heading text-sm font-semibold">{getPublicDisplayName(user, "Profile")}</h3>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
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
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">{user?.email || "Not set"}</p>
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
            {[
              {
                key: "twitch",
                provider: "Twitch",
                icon: Radio,
                value: user?.twitch_display_name || user?.twitch_user_id,
                copy: "Use your Twitch display name across Foxfam.",
                connected: Boolean(user?.twitch_display_name || user?.twitch_user_id || localLinkedAccounts.twitch),
                onConnect: () => handleConnectorConnect("twitch", "Twitch"),
                onDisconnect: () => handleConnectorDisconnect("twitch", "Twitch"),
              },
              {
                key: "discord",
                provider: "Discord",
                icon: MessagesSquare,
                value: user?.discord_username || user?.discord_user_id,
                copy: "Prepare Discord identity for community notifications.",
                connected: Boolean(user?.discord_username || user?.discord_user_id || localLinkedAccounts.discord),
                onConnect: () => handleConnectorConnect("discord", "Discord"),
                onDisconnect: () => handleConnectorDisconnect("discord", "Discord"),
              },
              {
                key: "googleCalendar",
                provider: "Google Calendar",
                icon: CalendarDays,
                value: gcalConnected ? "Two-way sync is active" : null,
                copy: "Sync Foxfam events with your Google Calendar.",
                connected: gcalConnected,
                connecting: connectingGcal,
                onConnect: handleGcalConnect,
                onDisconnect: handleGcalDisconnect,
              },
            ].map((item) => (
              <div key={item.provider} className="rounded-lg border border-border bg-secondary/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">{item.provider}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.value || item.copy}</p>
                  </div>
                  {item.connected && <CheckCircle className="h-4 w-4 shrink-0 text-success" />}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={item.onConnect}
                    disabled={item.connecting || connectingAccount === item.key}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {item.connecting || connectingAccount === item.key
                      ? "Connecting..."
                      : item.connected
                        ? "Reconnect"
                        : `Connect ${item.provider}`}
                  </button>
                  {item.connected && (
                    <button
                      type="button"
                      onClick={item.onDisconnect}
                      disabled={item.connecting || connectingAccount === item.key}
                      className="text-xs text-muted-foreground underline hover:text-foreground disabled:opacity-50"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
                {item.key === "googleCalendar" && item.connected && (
                  <p className="mt-3 text-xs text-success/80">
                    Events you create can be pushed to Google Calendar, and connected calendar changes can sync back automatically.
                  </p>
                )}
              </div>
            ))}
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
                <p className="text-xs text-muted-foreground">Coming soon — automatically approve birthday submissions</p>
              </div>
              <div className="rounded-lg bg-secondary/50 px-4 py-3">
                <p className="text-sm font-medium">Auto-approve community posts</p>
                <p className="text-xs text-muted-foreground">Coming soon — skip moderation for trusted members</p>
              </div>
            </div>
          </SettingsSection>
        )}

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => base44.auth.logout()}
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
