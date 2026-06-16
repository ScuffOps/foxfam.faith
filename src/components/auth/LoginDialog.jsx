import { useState } from "react";
import { Apple, Chrome, Loader2, Mail, MessagesSquare } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

const OAUTH_OPTIONS = [
  {
    provider: "google",
    label: "Continue with Google",
    icon: Chrome,
    scopes: "openid email profile",
    isEnabled: import.meta.env.VITE_AUTH_GOOGLE_ENABLED === "true",
  },
  {
    provider: "apple",
    label: "Continue with Apple",
    icon: Apple,
    isEnabled: import.meta.env.VITE_AUTH_APPLE_ENABLED === "true",
  },
  {
    provider: "discord",
    label: "Continue with Discord",
    icon: MessagesSquare,
    isEnabled: import.meta.env.VITE_AUTH_DISCORD_ENABLED === "true",
  },
];

export default function LoginDialog({ open, onOpenChange }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [pendingAction, setPendingAction] = useState("");

  const handleProviderLogin = async (item) => {
    setPendingAction(item.provider);
    try {
      const options = item.scopes ? { scopes: item.scopes } : {};
      await communityClient.auth.signInWithProvider(item.provider, options);
    } catch (error) {
      setPendingAction("");
      toast({
        title: `${item.label.replace("Continue with ", "")} sign-in is not ready yet`,
        description:
          error?.message || "Check that this provider is enabled in Supabase Auth and try again.",
        variant: "destructive",
      });
    }
  };

  const handleEmailLogin = async (event) => {
    event.preventDefault();
    setPendingAction("email");
    try {
      await communityClient.auth.signInWithEmail(email);
      setEmail("");
      setPendingAction("");
      onOpenChange(false);
      toast({
        title: "Magic link sent",
        description: "Check your inbox to finish signing in to Foxfam.",
      });
    } catch (error) {
      setPendingAction("");
      toast({
        title: "Email sign-in failed",
        description: error?.message || "Try another email address or refresh the page.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Enter the Shrine</DialogTitle>
          <DialogDescription>
            Sign in to save your profile, earn favor, vote in polls, post prayers, and join community loops.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {OAUTH_OPTIONS.map((item) => {
            const Icon = item.icon;
            const isPending = pendingAction === item.provider;
            return (
              <Button
                key={item.provider}
                type="button"
                variant="outline"
                className="h-11 w-full justify-start gap-3 border-border bg-secondary/35 text-left hover:bg-secondary/60"
                disabled={Boolean(pendingAction) || !item.isEnabled}
                onClick={() => handleProviderLogin(item)}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                <span>{item.isEnabled ? item.label : `${item.label} soon`}</span>
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          Email
          <span className="h-px flex-1 bg-border" />
        </div>

        <form className="space-y-3" onSubmit={handleEmailLogin}>
          <div className="space-y-1.5">
            <Label htmlFor="foxfam-login-email">Email address</Label>
            <Input
              id="foxfam-login-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="bg-secondary/45"
              required
            />
          </div>
          <Button type="submit" className="h-11 w-full gap-2" disabled={Boolean(pendingAction)}>
            {pendingAction === "email" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Send magic link
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
