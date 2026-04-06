import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { sendToDiscord } from "@/functions/sendToDiscord";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, EyeOff, Eye, Flame } from "lucide-react";

const STAINED_GLASS = "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/21eb9949e_StainedGlassFull.png";
const STONE_TABLE = "https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/67457bfd3_stonetable.png";

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
    await base44.entities.Prayer.create({
      message: message.trim(),
      author_name: isAnonymous ? "" : (authorName.trim() || user?.full_name || ""),
      is_anonymous: isAnonymous,
      support_count: 0,
    });
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
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #0a0c18 0%, #080f1f 60%, #0d0a1a 100%)" }}>

      {/* Stained Glass Header Banner */}
      <div className="relative w-full overflow-hidden" style={{ height: "220px" }}>
        <img
          src={STAINED_GLASS}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center opacity-40"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, #080f1f 100%)" }} />
        {/* Glow orb */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full" style={{ width: 120, height: 120, background: "radial-gradient(circle, rgba(100,180,255,0.18) 0%, transparent 70%)", filter: "blur(8px)" }} />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
          <p className="text-[10px] tracking-[0.3em] text-cyan-400/60 uppercase mb-2 font-heading">✦ Forsaken Faith · Sacred Space ✦</p>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white drop-shadow-lg" style={{ textShadow: "0 0 30px rgba(100,180,255,0.5), 0 2px 4px rgba(0,0,0,0.8)" }}>
            Prayer Wall
          </h1>
          <p className="mt-2 text-sm text-cyan-300/50 tracking-widest">for Veri</p>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-16">

        {/* Altar Submit Block */}
        <div className="relative mb-10">
          {/* Stone altar top image */}
          <div className="relative w-full overflow-hidden rounded-t-lg" style={{ height: 48 }}>
            <img src={STONE_TABLE} alt="" className="w-full h-full object-cover object-top opacity-70" />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, rgba(8,15,31,0) 0%, rgba(8,15,31,0.3) 100%)" }} />
          </div>

          {/* Altar form body */}
          <div
            className="relative px-6 py-6"
            style={{
              background: "linear-gradient(135deg, rgba(15,20,45,0.97) 0%, rgba(10,14,32,0.98) 100%)",
              border: "1px solid rgba(80,140,255,0.18)",
              borderTop: "none",
              borderBottom: "none",
              boxShadow: "inset 0 0 40px rgba(60,100,200,0.06), 0 0 30px rgba(60,100,200,0.08)",
            }}
          >
            {/* Corner ornaments */}
            <span className="absolute top-3 left-3 text-cyan-500/25 text-lg select-none">✦</span>
            <span className="absolute top-3 right-3 text-cyan-500/25 text-lg select-none">✦</span>

            <p className="text-center text-xs text-cyan-400/50 tracking-[0.2em] uppercase mb-5 font-heading">
              Leave a prayer or word of light
            </p>

            <div className="space-y-3">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your prayer or encouraging words here..."
                maxLength={500}
                className="resize-none min-h-[100px] text-sm"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(80,140,255,0.15)", color: "rgba(220,230,255,0.9)" }}
              />
              <div className="text-right text-[10px] text-cyan-900/60">{message.length}/500</div>

              {!isAnonymous && (
                <div>
                  <Label className="text-xs text-cyan-300/50">Your name (optional)</Label>
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder={user?.full_name || "Leave blank to go unnamed"}
                    className="mt-1 h-8 text-sm"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(80,140,255,0.12)", color: "rgba(220,230,255,0.85)" }}
                  />
                </div>
              )}

              <button
                onClick={() => setIsAnonymous(!isAnonymous)}
                className="flex items-center gap-2 text-xs transition-colors"
                style={{ color: "rgba(100,160,255,0.45)" }}
              >
                {isAnonymous ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                {isAnonymous ? "Post publicly instead" : "Post anonymously"}
              </button>

              {submitted && (
                <p className="text-xs text-cyan-400 text-center py-1 tracking-wide">
                  🕊️ Your prayer has been placed on the altar.
                </p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!message.trim() || submitting}
                className="w-full py-2.5 rounded font-heading text-sm tracking-widest uppercase transition-all disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, rgba(50,80,180,0.6) 0%, rgba(80,50,160,0.6) 100%)",
                  border: "1px solid rgba(100,160,255,0.25)",
                  color: "rgba(200,220,255,0.9)",
                  boxShadow: "0 0 20px rgba(80,120,255,0.1)",
                }}
              >
                {submitting ? "Sending..." : "✦ Send Prayer ✦"}
              </button>
            </div>
          </div>

          {/* Stone altar bottom */}
          <div className="relative w-full overflow-hidden rounded-b-lg" style={{ height: 36 }}>
            <img src={STONE_TABLE} alt="" className="w-full h-full object-cover object-bottom opacity-60" style={{ transform: "scaleY(-1)" }} />
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(80,140,255,0.2))" }} />
          <span className="text-xs tracking-[0.25em] font-heading" style={{ color: "rgba(100,160,255,0.3)" }}>THE WALL OF PRAYERS</span>
          <div className="flex-1 h-px" style={{ background: "linear-gradient(to left, transparent, rgba(80,140,255,0.2))" }} />
        </div>

        {/* Prayers */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-900 border-t-cyan-500" />
          </div>
        ) : prayers.length === 0 ? (
          <p className="text-center text-sm py-10" style={{ color: "rgba(100,140,200,0.35)" }}>
            Be the first to leave a prayer. 🤍
          </p>
        ) : (
          <div className="space-y-4">
            {prayers.map((prayer) => (
              <div
                key={prayer.id}
                className="relative rounded-lg px-5 py-4"
                style={{
                  background: "linear-gradient(135deg, rgba(12,18,40,0.95) 0%, rgba(8,12,28,0.98) 100%)",
                  border: "1px solid rgba(60,100,200,0.15)",
                  boxShadow: "inset 0 0 20px rgba(40,80,180,0.04)",
                }}
              >
                {/* subtle top glow line */}
                <div className="absolute top-0 left-6 right-6 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(100,160,255,0.12), transparent)" }} />

                <p className="text-sm leading-relaxed mb-3 whitespace-pre-line" style={{ color: "rgba(210,220,245,0.85)" }}>
                  {prayer.message}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "rgba(100,140,200,0.4)" }}>
                    {prayer.is_anonymous ? "🕊️ Anonymous" : (prayer.author_name || "A community member")}
                  </span>
                  <button
                    onClick={() => handlePray(prayer)}
                    className="flex items-center gap-1.5 rounded px-3 py-1 text-xs transition-all"
                    style={{
                      background: "rgba(255,120,50,0.06)",
                      border: "1px solid rgba(255,120,50,0.18)",
                      color: "rgba(255,160,80,0.6)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255,120,50,0.12)";
                      e.currentTarget.style.color = "rgba(255,160,80,0.9)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255,120,50,0.06)";
                      e.currentTarget.style.color = "rgba(255,160,80,0.6)";
                    }}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    Thank her with a Prayer
                    {prayer.support_count > 0 && (
                      <span className="ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: "rgba(255,120,50,0.12)", color: "rgba(255,160,80,0.8)" }}>
                        {prayer.support_count}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}