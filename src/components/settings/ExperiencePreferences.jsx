import { Eye, Sparkles, VolumeX, Waves } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useExperiencePreferences } from "@/hooks/useExperiencePreferences";

const OPTIONS = [
  { key: "reduceMotion", label: "Reduce motion", description: "Stops decorative movement and animated transitions.", icon: Waves },
  { key: "muteSounds", label: "Mute portal sounds", description: "Keeps celebrations visual without audio cues.", icon: VolumeX },
  { key: "reduceParticles", label: "Reduce particles", description: "Hides ambient video particles and floating effects.", icon: Sparkles },
  { key: "reduceTransparency", label: "Increase visual clarity", description: "Uses solid panels with less blur and transparency.", icon: Eye },
];

export default function ExperiencePreferences() {
  const { preferences, updatePreference } = useExperiencePreferences();

  return (
    <div className="space-y-2">
      {OPTIONS.map(({ key, label, description, icon: Icon }) => (
        <div key={key} className="flex min-h-14 items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <label htmlFor={`experience-${key}`} className="min-w-0 flex-1 cursor-pointer">
            <span className="block text-sm font-medium">{label}</span>
            <span className="block text-xs leading-5 text-muted-foreground">{description}</span>
          </label>
          <Switch
            id={`experience-${key}`}
            checked={preferences[key]}
            onCheckedChange={(checked) => updatePreference(key, checked)}
            aria-label={label}
          />
        </div>
      ))}
      <p className="pt-1 text-xs text-muted-foreground">Your device’s reduced-motion setting is honored automatically, even when these controls are off.</p>
    </div>
  );
}
