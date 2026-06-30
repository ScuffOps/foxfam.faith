import { useEffect, useMemo, useState } from "react";
import { Loader2, LogIn, TriangleAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { communityClient, supabase } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

function getSafeNext(value) {
  const next = String(value || "/settings").trim();
  if (!next.startsWith("/") || next.startsWith("//")) return "/settings";
  if (next.startsWith("/auth/callback")) return "/settings";
  return next;
}

function readCallbackParams() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  return {
    code: query.get("code"),
    error: query.get("error") || hash.get("error"),
    errorDescription: query.get("error_description") || hash.get("error_description"),
    accessToken: hash.get("access_token"),
    refreshToken: hash.get("refresh_token"),
    next: getSafeNext(query.get("next") || hash.get("next")),
  };
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { checkUserAuth } = useAuth();
  const [error, setError] = useState("");
  const params = useMemo(readCallbackParams, []);

  useEffect(() => {
    let mounted = true;

    const finishSignIn = async () => {
      if (!supabase) {
        throw new Error("Supabase is not configured for this deployment.");
      }

      if (params.error) {
        throw new Error(params.errorDescription || params.error);
      }

      if (params.code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
        if (exchangeError) throw exchangeError;
      } else if (params.accessToken && params.refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: params.accessToken,
          refresh_token: params.refreshToken,
        });
        if (sessionError) throw sessionError;
      }

      await communityClient.auth.me();
      await checkUserAuth();

      if (mounted) navigate(params.next, { replace: true });
    };

    finishSignIn().catch((callbackError) => {
      if (!mounted) return;
      setError(callbackError?.message || "We could not finish signing you in.");
    });

    return () => {
      mounted = false;
    };
  }, [checkUserAuth, navigate, params]);

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6 text-foreground">
        <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-destructive/30 bg-destructive/10 text-destructive">
            <TriangleAlert className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-2xl font-semibold">Sign-in got tangled</h1>
          <p className="mt-3 text-sm text-muted-foreground">{error}</p>
          <Button className="mt-6 gap-2" onClick={() => navigate("/", { replace: true })}>
            <LogIn className="h-4 w-4" />
            Return to Foxfam
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <h1 className="font-heading text-2xl font-semibold">Opening the shrine door</h1>
        <p className="mt-3 text-sm text-muted-foreground">Finishing your sign-in and loading your Foxfam profile.</p>
      </div>
    </div>
  );
}
