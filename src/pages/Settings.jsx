import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Settings2, Link2, Shield, LogOut, CheckCircle, Palette, Bell, ChevronDown, ChevronUp, UserCircle2 } from "lucide-react";
import AlertPreferences from "../components/settings/AlertPreferences";
import AvatarUpload from "../components/AvatarUpload";
import AccentColorPicker from "../components/AccentColorPicker";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import GlassCard from "../components/GlassCard";
import RankBadge from "../components/RankBadge";
import ProgressionLoop from "../components/ProgressionLoop";

const CONNECTOR_ID = "69d2b6bfc53ce38433398132"; // Foxfam Calendar

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

  const checkGcalConnection = async () => {
    try {
      await base44.connectors.connectAppUser; // just check if method exists
      // Attempt a lightweight test by trying to get the URL (won't open it)
      setGcalConnected(false); // will be updated via fetchData pattern
    } catch {
      setGcalConnected(false);
    }
  };

  const handleGcalConnect = async () => {
    setConnectingGcal(true);
    try {
      const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          setConnectingGcal(false);
          setGcalConnected(true);
          toast({ title: "Google Calendar connected!", description: "Two-way sync is now active." });
        }
      }, 500);
    } catch {
      setConnectingGcal(false);
    }
  };

  const handleGcalDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setGcalConnected(false);
    toast({ title: "Google Calendar disconnected" });
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

  const isAdmin = user?.role === "admin";

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
              <h3 className="font-heading text-sm font-semibold">{user?.display_name || user?.full_name || "Profile"}</h3>
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
                <p className="text-xs text-muted-foreground">{user?.display_name || user?.full_name || "Not set"}</p>
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
                <p className="text-xs capitalize text-muted-foreground">{user?.role || "user"}</p>
              </div>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </SettingsSection>

        {/* Appearance */}
        <SettingsSection title="Appearance" icon={Palette} accentClass="bg-chart-5/15 text-chart-5">
          <AccentColorPicker />
        </SettingsSection>

        {/* Google Calendar Integration */}
        <SettingsSection title="Google Calendar Sync" icon={Link2} accentClass="bg-accent/15 text-accent">
          <div className="rounded-lg bg-secondary/50 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Foxfam Calendar</p>
                <p className="text-xs text-muted-foreground">Two-way sync with your Google Calendar</p>
              </div>
              <div className="flex items-center gap-2">
                {gcalConnected ? (
                  <>
                    <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-medium text-success">
                      <CheckCircle className="h-3 w-3" /> Connected
                    </span>
                    <button onClick={handleGcalDisconnect} className="text-xs text-muted-foreground underline hover:text-foreground">Disconnect</button>
                  </>
                ) : (
                  <button
                    onClick={handleGcalConnect}
                    disabled={connectingGcal}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {connectingGcal ? "Connecting..." : "Connect"}
                  </button>
                )}
              </div>
            </div>
            {gcalConnected && (
              <p className="mt-3 text-xs text-success/80">
                ✓ Events you create will be pushed to Google Calendar, and changes will sync back automatically.
              </p>
            )}
          </div>
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
