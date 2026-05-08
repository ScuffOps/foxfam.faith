import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { sendToDiscord } from "@/functions/sendToDiscord";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EyeOff, Eye } from "lucide-react";
import PrayerOrb, { CATEGORIES, detectCategory } from "@/components/prayer/PrayerOrb";
import ParticleOverlay from "@/components/ParticleOverlay";
import ColorSwatchPicker from "@/components/ColorSwatchPicker";
import RichTextEditor from "@/components/RichTextEditor";
import { getRichTextPlainText } from "@/components/RichTextContent";
import { getPublicDisplayName } from "@/lib/userIdentity";
import { canUseAdminPanel } from "@/lib/roles";

const STAINED_GLASS = "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/21eb9949e_StainedGlassFull.png";
const STONE_WALL    = "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/bde055a3d_prayerwall3.png";

export default function PrayerWall() {
  const [prayers, setPrayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState("");
  const [customColor, setCustomColor] = useState("");
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
    const plainMessage = getRichTextPlainText(message);
    if (!plainMessage) return;
    setSubmitting(true);
    const cat = category || detectCategory(plainMessage);
    await base44.entities.Prayer.create({
      message,
      author_name: isAnonymous ? "" : (authorName.trim() || getPublicDisplayName(user, "")),
      is_anonymous: isAnonymous,
      support_count: 0,
      is_read: false,
      category: cat,
      custom_color: customColor || undefined,
    });
    sendToDiscord({ message: plainMessage, author_name: authorName.trim(), is_anonymous: isAnonymous }).catch(() => {});
    setMessage("");
    setAuthorName("");
    setCategory("");
    setCustomColor("");
    setSubmitted(true);
    setSubmitting(false);
    loadPrayers();
    setTimeout(() => setSubmitted(false), 4000);
  };

  const handlePray = async (prayer) => {
    await base44.entities.Prayer.update(prayer.id, { support_count: (prayer.support_count || 0) + 1 });
    setPrayers((prev) => prev.map((p) => p.id === prayer.id ? { ...p, support_count: (p.support_count || 0) + 1 } : p));
  };

  const handleMarkRead = async (prayer) => {
    await base44.entities.Prayer.update(prayer.id, { is_read: true });
    setPrayers((prev) => prev.map((p) => p.id === prayer.id ? { ...p, is_read: true } : p));
  };

  const isAdmin = canUseAdminPanel(user);

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "linear-gradient(180deg, #060810 0%, #080d1c 60%, #06080f 100%)" }}>
      <ParticleOverlay style={{ position: "fixed", zIndex: 50 }} />

      {/* Stained Glass Header */}
      <div className="relative w-full overflow-hidden" style={{ height: 200 }}>
        <img src={STAINED_GLASS} alt="" className="absolute inset-0 w-full h-full object-cover object-center opacity-35" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, #080d1c 100%)" }} />
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <p className="text-[10px] tracking-[0.3em] text-cyan-400/50 uppercase mb-2 font-heading">✦ Forsaken Faith · Sacred Space ✦</p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white" style={{ textShadow: "0 0 30px rgba(100,180,255,0.5), 0 2px 4px rgba(0,0,0,0.8)" }}>
            Prayer Wall
          </h1>
          <p className="mt-1 text-xs text-cyan-300/40 tracking-widest">your thoughts are being held, not dumped</p>
        </div>
      </div>

      {/* Section label */}
      <div className="relative mx-auto flex items-center gap-3 mb-4 px-4" style={{ maxWidth: 960 }}>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(80,140,255,0.18))" }} />
        <span className="text-[10px] tracking-[0.3em] font-heading" style={{ color: "rgba(100,160,255,0.28)" }}>THE WALL OF PRAYERS</span>
        <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(80,140,255,0.18))" }} />
      </div>

      {/* Admin note */}
      {isAdmin && (
        <p className="text-center text-[10px] tracking-widest mb-4 font-heading" style={{ color: "rgba(140,200,140,0.35)" }}>
          ✦ ADMIN · CLICK ANY PRAYER TO MARK AS READ ✦
        </p>
      )}

      {/* Stone wall — ivy image as visual frame, prayers sit on top */}
      <div className="relative w-full mb-8">
        {/* The wall image — not covering the prayers, just a backdrop */}
        <div className="relative w-full" style={{ minHeight: 500 }}>
          {/* Stone texture background */}
          <div className="absolute inset-0" style={{
            backgroundImage: `url(${STONE_WALL})`,
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
            filter: "brightness(0.45) saturate(0.7)",
          }} />
          {/* Dark vignette to help prayers read */}
          <div className="absolute inset-0" style={{
            background: "radial-gradient(ellipse 80% 70% at 50% 50%, rgba(4,6,18,0.2) 0%, rgba(4,6,18,0.65) 100%)",
          }} />

          {loading ? (
            <div className="relative z-10 flex justify-center py-24">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-900 border-t-cyan-500" />
            </div>
          ) : prayers.length === 0 ? (
            <div className="relative z-10 flex flex-col items-center justify-center py-24">
              <p className="text-sm" style={{ color: "rgba(100,140,200,0.35)" }}>Be the first to leave a prayer. 🤍</p>
            </div>
          ) : (
            <div className="relative z-10 flex flex-wrap gap-6 justify-center items-center px-12 py-14">
              {prayers.map((prayer) => (
                <PrayerOrb
                  key={prayer.id}
                  prayer={prayer}
                  onPray={handlePray}
                  onMarkRead={isAdmin ? handleMarkRead : undefined}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}

          {/* Fade bottom into page */}
          <div className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none" style={{ background: "linear-gradient(to top, rgba(6,8,16,1), transparent)" }} />
          {/* Fade top */}
          <div className="absolute top-0 left-0 right-0 h-12 pointer-events-none" style={{ background: "linear-gradient(to bottom, rgba(6,8,16,0.7), transparent)" }} />
        </div>
      </div>

      {/* Legend — all 8 categories */}
      <div className="flex flex-wrap justify-center gap-4 px-4 mb-10">
        {Object.entries(CATEGORIES).map(([key, { label, primary }]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: primary, boxShadow: `0 0 6px 1px ${primary}88` }} />
            <span className="text-[10px] tracking-widest font-heading" style={{ color: "rgba(160,180,220,0.35)", textTransform: "uppercase" }}>
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Submit form — moved to bottom */}
      <div className="relative mx-auto px-4 pb-16" style={{ maxWidth: 960 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(80,140,255,0.18))" }} />
          <span className="text-[10px] tracking-[0.3em] font-heading" style={{ color: "rgba(100,160,255,0.28)" }}>LEAVE A PRAYER</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(80,140,255,0.18))" }} />
        </div>
        <div
          className="rounded-xl p-6 relative"
          style={{
            background: "linear-gradient(135deg, rgba(12,15,35,0.97) 0%, rgba(8,10,24,0.98) 100%)",
            border: "1px solid rgba(100,140,255,0.15)",
            boxShadow: "0 0 40px rgba(60,100,200,0.06)",
          }}
        >
          <span className="absolute top-3 left-3 text-cyan-500/20 text-lg select-none">✦</span>
          <span className="absolute top-3 right-3 text-cyan-500/20 text-lg select-none">✦</span>
          <p className="text-center text-xs text-cyan-400/45 tracking-[0.2em] uppercase mb-5 font-heading">
            Leave a prayer or word of light
          </p>
          <div className="space-y-3">
            <RichTextEditor
              value={message}
              onChange={setMessage}
              placeholder="Write your prayer or encouraging words here..."
              minHeight={120}
            />
            <div className="flex justify-between text-[10px] text-cyan-900/50">
              <span>Rich text supported.</span>
              <span>{getRichTextPlainText(message).length}/500</span>
            </div>

            {/* Category picker */}
            <div>
              <Label className="text-xs text-cyan-300/45 mb-2 block">Category (optional — we'll detect it otherwise)</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(CATEGORIES).map(([key, { label, primary }]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setCategory(category === key ? "" : key)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs transition-all"
                    style={{
                      border: `1px solid ${category === key ? primary : "rgba(100,120,180,0.18)"}`,
                      background: category === key ? `${primary}18` : "rgba(255,255,255,0.02)",
                      color: category === key ? primary : "rgba(150,160,200,0.55)",
                      boxShadow: category === key ? `0 0 10px ${primary}40` : "none",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom orb color */}
            <div>
              <Label className="text-xs text-cyan-300/45 mb-2 block">Orb color (optional — pick your own)</Label>
              <ColorSwatchPicker value={customColor} onChange={setCustomColor} size={32} />
              {customColor && (
                <button type="button" onClick={() => setCustomColor("")} className="mt-2 text-[10px]" style={{ color: "rgba(150,150,180,0.45)" }}>
                  clear orb color
                </button>
              )}
            </div>

            {!isAnonymous && (
              <div>
                <Label className="text-xs text-cyan-300/45">Your name (optional)</Label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder={getPublicDisplayName(user, "Leave blank to go unnamed")}
                  className="mt-1 h-8 text-sm"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(80,140,255,0.12)", color: "rgba(220,230,255,0.85)" }}
                />
              </div>
            )}

            <button
              onClick={() => setIsAnonymous(!isAnonymous)}
              className="flex items-center gap-2 text-xs transition-colors"
              style={{ color: "rgba(100,160,255,0.4)" }}
            >
              {isAnonymous ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              {isAnonymous ? "Post publicly instead" : "Post anonymously"}
            </button>

            {submitted && (
              <p className="text-xs text-cyan-400 text-center py-1 tracking-wide">
                🕊️ Your prayer has been placed on the wall.
              </p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!getRichTextPlainText(message) || submitting}
              className="w-full py-2.5 rounded font-heading text-sm tracking-widest uppercase transition-all disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, rgba(50,80,180,0.55) 0%, rgba(80,50,160,0.55) 100%)",
                border: "1px solid rgba(100,160,255,0.22)",
                color: "rgba(200,220,255,0.9)",
                boxShadow: "0 0 20px rgba(80,120,255,0.08)",
              }}
            >
              {submitting ? "Sending..." : "✦ Send Prayer ✦"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
