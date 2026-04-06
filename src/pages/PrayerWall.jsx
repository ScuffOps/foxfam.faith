import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { sendToDiscord } from "@/functions/sendToDiscord";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GlassCard from "@/components/GlassCard";
import { Heart, Send, Eye, EyeOff, Flame } from "lucide-react";

export default function PrayerWall() {
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
    loadPrayers();
  }, []);

  const loadPrayers = async () => {
    setLoading(true);
    const all = await base44.entities.Prayer.list("-created_date", 50);
    setPrayers(all);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);

    const prayer = await base44.entities.Prayer.create({
      message: message.trim(),
      author_name: isAnonymous ? "" : (authorName.trim() || user?.full_name || ""),
      is_anonymous: isAnonymous,
      support_count: 0,
    });

    // Send to Discord (non-blocking)
    sendToDiscord({ message: message.trim(), author_name: authorName.trim(), is_anonymous: isAnonymous }).catch(() => {});

    setMessage("");
    setAuthorName("");
    setSubmitted(true);
    setSubmitting(false);
    loadPrayers();
    setTimeout(() => setSubmitted(false), 4000);
  };

  const handlePray = async (prayer) => {
    await base44.entities.Prayer.update(prayer.id, { support_count: (prayer.support_count || 0) + 1 });
    setPrayers((prev) => prev.map((p) => p.id === prayer.id ? { ...p, support_count: (p.support_count || 0) + 1 } : p));
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex justify-center">
          <span className="text-4xl">🕊️</span>
        </div>
        <h1 className="font-heading text-3xl font-bold md:text-4xl">Prayer Wall</h1>
        <p className="mt-2 text-sm text-muted-foreground tracking-widest uppercase">✦ For Veri · Forsaken Faith ✦</p>
        <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto">
          Leave an encouraging word, a prayer, or a message of love for Veri. She sees every one. 🤍
        </p>
      </div>

      {/* Submit Form */}
      <GlassCard className="mb-8">
        <h2 className="font-heading text-base font-semibold mb-4">Leave a Message</h2>
        <div className="space-y-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your prayer or encouraging words here..."
            className="bg-secondary min-h-[100px] resize-none"
            maxLength={500}
          />
          <div className="text-right text-xs text-muted-foreground">{message.length}/500</div>

          {!isAnonymous && (
            <div>
              <Label className="text-xs">Your name (optional)</Label>
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder={user?.full_name || "Leave blank to go unnamed"}
                className="mt-1 bg-secondary h-8 text-sm"
              />
            </div>
          )}

          <button
            onClick={() => setIsAnonymous(!isAnonymous)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {isAnonymous ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {isAnonymous ? "Post publicly instead" : "Post anonymously"}
          </button>

          {submitted && (
            <p className="text-xs text-success font-medium text-center py-1">
              🤍 Your prayer has been sent to the wall & shared with the community.
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!message.trim() || submitting}
            className="w-full gap-2"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Sending..." : "Send Prayer"}
          </Button>
        </div>
      </GlassCard>

      {/* Prayer Wall */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : prayers.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">Be the first to leave a prayer. 🤍</p>
      ) : (
        <div className="space-y-4">
          {prayers.map((prayer) => (
            <GlassCard key={prayer.id}>
              <p className="text-sm leading-relaxed mb-3 whitespace-pre-line">{prayer.message}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {prayer.is_anonymous ? "🕊️ Anonymous" : (prayer.author_name || "A community member")}
                </span>
                <button
                  onClick={() => handlePray(prayer)}
                  className="flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
                >
                  <Flame className="h-3.5 w-3.5" />
                  Thank her with a Prayer
                  {prayer.support_count > 0 && (
                    <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary font-semibold">
                      {prayer.support_count}
                    </span>
                  )}
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}