import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { communityClient } from "@/api/communityClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const LAST_AUTHORIZED_PATH_KEY = "foxfam:last-authorized-path";

function getReturnPath() {
  const saved = window.sessionStorage.getItem(LAST_AUTHORIZED_PATH_KEY);
  return saved && saved.startsWith("/") ? saved : "/";
}

export default function PermissionRoute({ allow, areaName = "this area" }) {
  const navigate = useNavigate();
  const [state, setState] = useState("checking");

  useEffect(() => {
    let active = true;
    communityClient.auth.me()
      .then((user) => active && setState(allow(user) ? "allowed" : "denied"))
      .catch(() => active && setState("denied"));
    return () => { active = false; };
  }, [allow]);

  if (state === "checking") {
    return <div className="mx-auto mt-16 h-28 max-w-xl animate-pulse rounded-xl border border-border bg-card/85" aria-label="Checking access" />;
  }

  if (state === "allowed") return <Outlet />;
  if (typeof window === "undefined") return <Navigate to="/" replace />;

  const returnPath = getReturnPath();
  return (
    <AlertDialog open>
      <AlertDialogContent className="border-amber-300/25 bg-card">
        <AlertDialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-300/10 text-amber-200">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <AlertDialogTitle>That door is staff-sealed</AlertDialogTitle>
          <AlertDialogDescription>
            Your current account does not have permission to open {areaName}. Nothing was changed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => navigate(returnPath, { replace: true })}>
            Return to your last page
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
