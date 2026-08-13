import { useEffect, useState } from "react";
import { Eye, EyeOff, Gift, Loader2 } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import PublicAvatar from "@/components/PublicAvatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getRecordAuthorAvatar, getRecordAuthorName } from "@/lib/publicAuthor";
import { setBirthdayMessageVisibility } from "@/lib/birthdays";

export default function BirthdayWishInbox({ userId, compact = false, title = "Birthday Wishes" }) {
  const { toast } = useToast();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [savingId, setSavingId] = useState("");

  useEffect(() => {
    let active = true;
    if (!userId) {
      setLoading(false);
      return undefined;
    }
    communityClient.entities.BirthdayMessage.filter({ recipient_user_id: userId }, "-created_date")
      .then((rows) => active && setMessages(rows))
      .catch(() => active && setMessages([]))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [userId]);

  const toggleVisibility = async (message) => {
    setSavingId(message.id);
    try {
      const updated = await setBirthdayMessageVisibility(message.id, message.is_visible === false);
      setMessages((current) => current.map((item) => item.id === updated.id ? updated : item));
      toast({ title: updated.is_visible === false ? "Wish hidden from your profile" : "Wish shown on your profile" });
    } catch (error) {
      toast({ title: "Visibility could not be changed", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSavingId("");
    }
  };

  if (!userId) return null;
  return (
    <section className={`rounded-xl border border-border bg-card/85 ${compact ? "p-3" : "p-5"}`}>
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-chart-5" />
        <div>
          <h2 className="font-heading text-base font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">You decide which messages appear on your profile.</p>
        </div>
      </div>
      {loading ? (
        <Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin text-primary" />
      ) : messages.length === 0 ? (
        <p className="mt-4 rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">Birthday notes will gather here.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {messages.map((message) => (
            <article key={message.id} className="flex gap-3 rounded-lg border border-border bg-secondary/25 p-3">
              <PublicAvatar src={getRecordAuthorAvatar(message)} name={getRecordAuthorName(message)} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{getRecordAuthorName(message)}</p>
                  <Button type="button" size="sm" variant="ghost" onClick={() => toggleVisibility(message)} disabled={savingId === message.id} className="gap-1.5">
                    {message.is_visible === false ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {message.is_visible === false ? "Show" : "Hide"}
                  </Button>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{message.message}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
