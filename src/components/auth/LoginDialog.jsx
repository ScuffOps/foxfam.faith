import { useState } from "react";
import { Loader2, MessagesSquare, Radio } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

const OAUTH_OPTIONS = [
  {
    provider: "twitch",
    label: "Continue with Twitch",
    icon: Radio,
  },
  {
    provider: "discord",
    label: "Continue with Discord",
    icon: MessagesSquare,
  },
];

export default function LoginDialog({ open, onOpenChange }) {
  const { toast } = useToast();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card/95 text-card-foreground shadow-2xl backdrop-blur-xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Come be perceived</DialogTitle>
          <DialogDescription>
            Sign in to save your profile, earn Favor, vote on the chaos, and keep your devotion receipts.
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
                disabled={Boolean(pendingAction)}
                onClick={() => handleProviderLogin(item)}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                <span>{item.label}</span>
              </Button>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Your email stays private. Public posts use only your Foxfam display name and profile picture.
        </p>
      </DialogContent>
    </Dialog>
  );
}
