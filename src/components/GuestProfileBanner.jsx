import { useState } from "react";
import { useGuestProfile } from "@/hooks/useGuestProfile";
import AvatarUpload from "./AvatarUpload";
import AccentColorPicker from "./AccentColorPicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, MessageSquare, Check, Pencil } from "lucide-react";
import GlassCard from "./GlassCard";

export default function GuestProfileBanner() {
  const { profile, saveProfile } = useGuestProfile();
  const [editing, setEditing] = useState(!profile.name);
  const avatarKey = 'commhub_guest_avatar';
  const [avatar, setAvatar] = useState(() => localStorage.getItem(avatarKey) || '');

  const handleAvatarUploaded = (url) => {
    setAvatar(url);
    localStorage.setItem(avatarKey, url);
  };
  const [form, setForm] = useState({ name: profile.name, discordId: profile.discordId });

  const handleSave = () => {
    saveProfile(form);
    setEditing(false);
  };

  return (
    <GlassCard className="mb-4">
      <div className="mb-3 flex items-center gap-3">
        <AvatarUpload avatarUrl={avatar} onUploaded={handleAvatarUploaded} />
        <div className="flex flex-1 items-center justify-between">
          <span className="font-heading text-sm font-semibold">Your Profile</span>
          {!editing && profile.name && (
            <button onClick={() => setEditing(true)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Submitting as a guest? Let the community know who you are (optional).
          </p>
          <div>
            <Label className="text-xs">Display Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Your name or username"
              className="mt-1 h-8 bg-secondary text-sm"
            />
          </div>
          <div>
            <Label className="text-xs flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Discord ID
            </Label>
            <Input
              value={form.discordId}
              onChange={(e) => setForm((p) => ({ ...p, discordId: e.target.value }))}
              placeholder="e.g. username#1234 or username"
              className="mt-1 h-8 bg-secondary text-sm"
            />
          </div>
          <AccentColorPicker />
          <Button size="sm" className="w-full gap-1.5" onClick={handleSave}>
            <Check className="h-3.5 w-3.5" /> Save Profile
          </Button>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{profile.name || <span className="text-muted-foreground italic">No name set</span>}</span>
          </div>
          {profile.discordId && (
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{profile.discordId}</span>
            </div>
          )}
          {!profile.name && (
            <button onClick={() => setEditing(true)} className="text-xs text-accent hover:underline">
              + Add your name
            </button>
          )}
        </div>
      )}
    </GlassCard>
  );
}