import { CheckCircle2, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SubmissionReceiptDialog({ receipt, onOpenChange }) {
  const navigate = useNavigate();
  const open = Boolean(receipt);
  const statusLabel = receipt?.status === "pending" ? "Awaiting review" : "Published";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onOpenChange(false)}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-success/15 text-success">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <DialogTitle className="font-heading">{receipt?.title || "Safely received"}</DialogTitle>
          <DialogDescription>{receipt?.description || "Your contribution has been saved."}</DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-border bg-secondary/40 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Current state</p>
          <p className="mt-1 text-sm font-semibold text-foreground">Submitted → {statusLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {receipt?.status === "pending"
              ? "Staff can review it next. You can return to the destination below while it waits."
              : "It is available in the destination below now."}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Stay here</Button>
          {receipt?.path ? (
            <Button
              type="button"
              className="gap-2"
              onClick={() => {
                navigate(receipt.path);
                onOpenChange(false);
              }}
            >
              <ExternalLink className="h-4 w-4" /> View destination
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
