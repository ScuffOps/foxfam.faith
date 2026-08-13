import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Link } from "react-router-dom";
import { Gift, Inbox, Stars } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { isBirthdayToday } from "@/lib/birthdays";
import { useAuth } from "@/lib/AuthContext";

function playBirthdayChime() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  [523.25, 659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    oscillator.type = "sine";
    gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + index * 0.09 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.09 + 0.28);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + index * 0.09);
    oscillator.stop(context.currentTime + index * 0.09 + 0.3);
  });
}

export default function BirthdayWelcomeDialog() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user?.id) return undefined;
    communityClient.entities.Birthday.filter({ recipient_user_id: user.id })
      .then((birthdays) => {
        if (!active || !birthdays.some((birthday) => isBirthdayToday(birthday.birthday_date))) return;
        const key = `foxfam:birthday-welcome:${user.id}:${new Date().toISOString().slice(0, 10)}`;
        if (window.sessionStorage.getItem(key)) return;
        window.sessionStorage.setItem(key, "1");
        setOpen(true);
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          confetti({ particleCount: 72, spread: 72, origin: { y: 0.62 }, colors: ["#38bdf8", "#818cf8", "#f9d77e", "#f0abfc"] });
        }
        playBirthdayChime();
      })
      .catch(() => {});
    return () => { active = false; };
  }, [user?.id]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden border-chart-5/35 bg-card text-center">
        <Stars className="mx-auto h-9 w-9 text-chart-5" />
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="font-heading text-2xl">Happy Birthday</DialogTitle>
          <DialogDescription>The shrine left a little starlight in your update inbox. Your community messages are waiting there.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild className="gap-2" onClick={() => setOpen(false)}>
            <Link to="/activity"><Inbox className="h-4 w-4" /> Open updates</Link>
          </Button>
          <Button asChild variant="outline" className="gap-2" onClick={() => setOpen(false)}>
            <Link to="/profile"><Gift className="h-4 w-4" /> View profile</Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
