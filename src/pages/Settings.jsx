import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Settings2, Link2, User, Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import GlassCard from "../components/GlassCard";

export default function Settings() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

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
        <GlassCard>
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
              <User className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-heading text-sm font-semibold">Profile</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
              <div>
                <p className="text-sm font-medium">Name</p>
                <p className="text-xs text-muted-foreground">{user?.full_name || "Not set"}</p>
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
        </GlassCard>

        {/* Google Calendar Integration */}
        {isAdmin && (
          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15">
                <Link2 className="h-4 w-4 text-accent" />
              </div>
              <h3 className="font-heading text-sm font-semibold">Google Calendar Sync</h3>
            </div>
            <div className="rounded-lg bg-secondary/50 px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Google Calendar</p>
                  <p className="text-xs text-muted-foreground">
                    Connect your Google Calendar for two-way sync
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
                    <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                    Not Connected
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                To set up Google Calendar sync, ask the app builder to connect the Google Calendar integration.
              </p>
            </div>
          </GlassCard>
        )}

        {/* App Settings */}
        {isAdmin && (
          <GlassCard>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-4/15">
                <Settings2 className="h-4 w-4 text-chart-4" />
              </div>
              <h3 className="font-heading text-sm font-semibold">App Settings</h3>
            </div>
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
          </GlassCard>
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