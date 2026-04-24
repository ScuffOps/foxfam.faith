import { useState } from "react";
import { Bell, Cake, CalendarDays, Lightbulb, BarChart3, Heart, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const STORAGE_KEY = "commhub_alert_prefs";

const ALERT_TYPES = [
  {
    key: "birthdays",
    label: "Birthdays",
    description: "Get notified when it's someone's birthday",
    icon: Cake,
    color: "text-chart-5",
    bg: "bg-chart-5/15",
  },
  {
    key: "events",
    label: "New Events",
    description: "Alerts for upcoming community events",
    icon: CalendarDays,
    color: "text-accent",
    bg: "bg-accent/15",
  },
  {
    key: "ideas",
    label: "Community Ideas",
    description: "When new ideas or suggestions are approved",
    icon: Lightbulb,
    color: "text-chart-4",
    bg: "bg-chart-4/15",
  },
  {
    key: "polls",
    label: "Polls",
    description: "New polls open for voting",
    icon: BarChart3,
    color: "text-chart-2",
    bg: "bg-chart-2/15",
  },
  {
    key: "blessings",
    label: "Blessings",
    description: "When new blessings are posted",
    icon: Heart,
    color: "text-chart-5",
    bg: "bg-chart-5/15",
  },
  {
    key: "veri_thoughts",
    label: "Veri Thoughts",
    description: "Random wisdom from Veri delivered to you",
    icon: Sparkles,
    color: "text-primary",
    bg: "bg-primary/15",
  },
];

function loadPrefs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  // Default: all on
  return Object.fromEntries(ALERT_TYPES.map((a) => [a.key, true]));
}

export default function AlertPreferences() {
  const { toast } = useToast();
  const [prefs, setPrefs] = useState(loadPrefs);

  const toggle = (key) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    const type = ALERT_TYPES.find((a) => a.key === key);
    toast({
      title: next[key] ? `${type.label} alerts on` : `${type.label} alerts off`,
      duration: 1500,
    });
  };

  const allOn = ALERT_TYPES.every((a) => prefs[a.key]);

  const toggleAll = () => {
    const next = Object.fromEntries(ALERT_TYPES.map((a) => [a.key, !allOn]));
    setPrefs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    toast({ title: allOn ? "All alerts disabled" : "All alerts enabled", duration: 1500 });
  };

  return (
    <div className="space-y-3">
      {/* Toggle all */}
      <div className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
        <div>
          <p className="text-sm font-medium">All Notifications</p>
          <p className="text-xs text-muted-foreground">Master toggle for all alert types</p>
        </div>
        <button
          onClick={toggleAll}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
            allOn ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
              allOn ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Individual toggles */}
      {ALERT_TYPES.map(({ key, label, description, icon: Icon, color, bg }) => (
        <div key={key} className="flex items-center justify-between rounded-lg bg-secondary/30 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-7 w-7 items-center justify-center rounded-md ${bg}`}>
              <Icon className={`h-3.5 w-3.5 ${color}`} />
            </div>
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <button
            onClick={() => toggle(key)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
              prefs[key] ? "bg-primary" : "bg-muted"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                prefs[key] ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}