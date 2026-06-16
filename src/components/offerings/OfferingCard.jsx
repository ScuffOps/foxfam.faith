import { format } from "date-fns";
import { Check, ExternalLink, FileMusic, FileText, Image, Link as LinkIcon, ShieldCheck, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import RichTextContent from "@/components/RichTextContent";
import StatusBadge from "@/components/StatusBadge";

function getMediaKind(offering) {
  const fileType = String(offering.file_type || "");
  if (fileType.startsWith("image/")) return "image";
  if (fileType.startsWith("audio/")) return "audio";
  if (fileType.startsWith("video/")) return "video";
  return "file";
}

function OfferingMedia({ offering }) {
  if (!offering.file_url) return null;
  const mediaKind = getMediaKind(offering);

  if (mediaKind === "image") {
    return (
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-secondary/30">
        <img src={offering.file_url} alt={offering.title || "Offering media"} className="max-h-96 w-full object-cover" />
      </div>
    );
  }

  if (mediaKind === "audio") {
    return (
      <div className="mt-4 rounded-lg border border-border bg-secondary/40 p-3">
        <audio controls src={offering.file_url} className="w-full">
          <a href={offering.file_url}>Download audio offering</a>
        </audio>
      </div>
    );
  }

  if (mediaKind === "video") {
    return (
      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-secondary/40">
        <video controls src={offering.file_url} className="max-h-96 w-full bg-black" />
      </div>
    );
  }

  return (
    <a
      href={offering.file_url}
      target="_blank"
      rel="noreferrer"
      className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <FileText className="h-4 w-4" />
      {offering.file_name || "Open attached offering"}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function getKindIcon(kind) {
  if (kind === "song") return FileMusic;
  if (kind === "fanart" || kind === "edit") return Image;
  return FileText;
}

export default function OfferingCard({ offering, isAdmin, onApprove, onReject, onDelete }) {
  const createdDate = offering.created_date ? format(new Date(offering.created_date), "MMM d, yyyy") : "Undated";
  const KindIcon = getKindIcon(offering.kind);

  return (
    <article className="foxcard overflow-hidden rounded-xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 font-medium text-primary">
              <KindIcon className="h-3.5 w-3.5" /> {offering.kind || "offering"}
            </span>
            <span>{createdDate}</span>
            {isAdmin && <StatusBadge status={offering.status || "pending"} />}
          </div>
          <h2 className="font-heading text-xl font-bold text-foreground">{offering.title}</h2>
          <p className="mt-1 text-xs text-muted-foreground">offered by {offering.creator_name || "Guest"}</p>
        </div>
        {offering.featured && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-chart-4/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-chart-4">
            <ShieldCheck className="h-3 w-3" /> Featured
          </span>
        )}
      </div>

      <OfferingMedia offering={offering} />

      {offering.external_url && (
        <a
          href={offering.external_url}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <LinkIcon className="h-4 w-4" />
          Open linked offering
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}

      {offering.description && (
        <RichTextContent className="mt-4 text-sm leading-7 text-card-foreground/90">
          {offering.description}
        </RichTextContent>
      )}

      {isAdmin && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          {offering.status !== "approved" && (
            <Button size="sm" className="gap-1.5" onClick={() => onApprove?.(offering)}>
              <Check className="h-3.5 w-3.5" /> Approve
            </Button>
          )}
          {offering.status !== "rejected" && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => onReject?.(offering)}>
              <X className="h-3.5 w-3.5" /> Reject
            </Button>
          )}
          <Button size="sm" variant="ghost" className="ml-auto gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onDelete?.(offering)}>
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        </div>
      )}
    </article>
  );
}
