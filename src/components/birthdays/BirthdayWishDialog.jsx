import { useState } from "react";
import { Gift, Loader2, Send } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { BIRTHDAY_WISH_MAX_LENGTH, validateBirthdayWish } from "@/lib/birthdays";

export default function BirthdayWishDialog({ birthday }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const cleaned = validateBirthdayWish(message);
      await communityClient.entities.BirthdayMessage.create({
        birthday_id: birthday.id,
        recipient_user_id: birthday.recipient_user_id || birthday.user_id || "",
        recipient_name: birthday.display_name || "Foxfam member",
        message: cleaned,
        is_visible: true,
      });
      setMessage("");
      setOpen(false);
      toast({ title: "Birthday wish delivered", description: `A little starlight is waiting for ${birthday.display_name}.` });
    } catch (error) {
      toast({ title: "Wish could not be sent", description: error?.message || "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="mt-3 w-full gap-2">
          <Gift className="h-3.5 w-3.5" /> Leave a wish
        </Button>
      </DialogTrigger>
      <DialogContent className="border-chart-5/30 bg-card">
        <DialogHeader>
          <DialogTitle>Happy Birthday, {birthday.display_name}</DialogTitle>
          <DialogDescription>Leave a short note for their profile. They control whether it stays public.</DialogDescription>
        </DialogHeader>
        <div>
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value.slice(0, BIRTHDAY_WISH_MAX_LENGTH))}
            rows={5}
            placeholder="A tiny celebration, memory, or kind wish..."
            aria-label="Birthday message"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{message.length}/{BIRTHDAY_WISH_MAX_LENGTH}</p>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={saving || !message.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send wish
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
