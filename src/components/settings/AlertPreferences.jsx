import { useMemo, useState } from "react";
import { Cake, CalendarDays, Lightbulb, BarChart3, Heart, Sparkles, Mail, Smartphone } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { useToast } from "@/components/ui/use-toast";

const ALERT_TYPES = [
  { key: "birthdays", label: "Birthdays", description: "Someone's birthday is coming up", icon: Cake },
  { key: "events", label: "New Events", description: "Upcoming community and stream events", icon: CalendarDays },
  { key: "ideas", label: "Community Ideas", description: "Ideas and suggestions are approved", icon: Lightbulb },
  { key: "polls", label: "Polls", description: "A new poll opens for voting", icon: BarChart3 },
  { key: "blessings", label: "Blessings", description: "A new community blessing appears", icon: Heart },
  { key: "veri_thoughts", label: "Scuffox Thoughts", description: "Fresh Scuffox lines arrive", icon: Sparkles },
];

function normalizePreferences(value = {}) {
  const topics = value.topics || value.alerts || value;
  return {
    ...value,
    channels: { push: Boolean(value.channels?.push), email: Boolean(value.channels?.email) },
    topics: Object.fromEntries(ALERT_TYPES.map(({ key }) => [key, topics[key] !== false])),
  };
}

function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange} className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 ${checked ? "bg-primary" : "bg-muted"}`}>
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export default function AlertPreferences({ user, onUserUpdated }) {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState(() => normalizePreferences(user?.notification_preferences));
  const [saving, setSaving] = useState("");
  const emailDeliveryReady = import.meta.env.VITE_EMAIL_NOTIFICATIONS_ENABLED === "true";
  const allTopicsOn = useMemo(() => ALERT_TYPES.every(({ key }) => prefs.topics[key]), [prefs]);

  const save = async (next, action = "preferences") => {
    if (!user) {
      communityClient.auth.redirectToLogin();
      return false;
    }
    setSaving(action);
    try {
      const updated = await communityClient.auth.updateMe({ notification_preferences: next });
      setPrefs(next);
      onUserUpdated?.(updated);
      return true;
    } catch (error) {
      toast({ title: "Notification preferences could not be saved", description: error?.message || "Try again after refreshing.", variant: "destructive" });
      return false;
    } finally {
      setSaving("");
    }
  };

  const toggleChannel = async (channel) => {
    if (channel === "email" && !emailDeliveryReady) {
      toast({ title: "Email delivery is awaiting sender verification", description: "Your preference is ready, but the Foxfam mail provider still needs to be connected." });
      return;
    }
    const enabling = !prefs.channels[channel];
    if (channel === "push" && enabling) {
      try {
        await communityClient.notifications.enablePush();
      } catch (error) {
        toast({ title: "Push notifications need permission", description: error?.message || "Allow notifications in your browser and try again.", variant: "destructive" });
        return;
      }
    }
    if (channel === "push" && !enabling) await communityClient.notifications.disablePush().catch(() => {});
    const next = { ...prefs, channels: { ...prefs.channels, [channel]: enabling } };
    if (await save(next, channel)) toast({ title: `${channel === "push" ? "Push" : "Email"} notifications ${enabling ? "on" : "off"}` });
  };

  const toggleTopic = (key) => {
    const next = { ...prefs, topics: { ...prefs.topics, [key]: !prefs.topics[key] } };
    save(next, key).then((ok) => ok && toast({ title: `${ALERT_TYPES.find((item) => item.key === key)?.label} alerts ${next.topics[key] ? "on" : "off"}`, duration: 1500 }));
  };

  const toggleAll = () => {
    const topics = Object.fromEntries(ALERT_TYPES.map(({ key }) => [key, !allTopicsOn]));
    save({ ...prefs, topics }, "all");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { key: "push", label: "Push notifications", description: "Browser alerts on this device", icon: Smartphone },
          { key: "email", label: "Email notifications", description: emailDeliveryReady ? "Private delivery to your sign-in email" : "Awaiting verified Foxfam mail sender", icon: Mail },
        ].map(({ key, label, description, icon: Icon }) => (
          <div key={key} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/35 p-3">
            <Icon className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>
            <Toggle checked={prefs.channels[key]} onChange={() => toggleChannel(key)} label={label} disabled={Boolean(saving) || (key === "email" && !emailDeliveryReady)} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
        <div><p className="text-sm font-medium">All topics</p><p className="text-xs text-muted-foreground">Choose what is worth interrupting you for</p></div>
        <Toggle checked={allTopicsOn} onChange={toggleAll} label="All notification topics" disabled={Boolean(saving)} />
      </div>

      {ALERT_TYPES.map(({ key, label, description, icon: Icon }) => (
        <div key={key} className="flex items-center gap-3 rounded-lg bg-secondary/30 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
          <div className="min-w-0 flex-1"><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div>
          <Toggle checked={prefs.topics[key]} onChange={() => toggleTopic(key)} label={`${label} alerts`} disabled={Boolean(saving)} />
        </div>
      ))}
      <p className="text-xs leading-5 text-muted-foreground">Notification settings follow your account. Email addresses remain private and are never included in public profile data.</p>
    </div>
  );
}
