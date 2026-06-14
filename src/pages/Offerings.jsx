import { useEffect, useMemo, useState } from "react";
import { communityClient } from "@/api/communityClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import OfferingCard from "@/components/offerings/OfferingCard";
import OfferingForm from "@/components/offerings/OfferingForm";
import ParticleOverlay from "@/components/ParticleOverlay";
import { canModerate } from "@/lib/roles";
import { getVisibleOfferings, OFFERING_KIND_OPTIONS, OFFERING_STATUS } from "@/lib/offerings";
import { HeartHandshake, ImagePlus, Search, ShieldCheck, Sparkles, X } from "lucide-react";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: OFFERING_STATUS.pending, label: "Pending" },
  { value: OFFERING_STATUS.approved, label: "Approved" },
  { value: OFFERING_STATUS.rejected, label: "Rejected" },
];

export default function Offerings() {
  const { toast } = useToast();
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [status, setStatus] = useState("all");
  const [moderatingId, setModeratingId] = useState("");

  const loadData = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const me = await communityClient.auth.me();
      setUser(me);
    } catch {
      setUser(null);
    }

    const all = await communityClient.entities.Offering.list("-created_date", 200).catch(() => []);
    setOfferings(all);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isAdmin = canModerate(user);
  const pendingCount = offerings.filter((offering) => offering.status === OFFERING_STATUS.pending).length;
  const visibleOfferings = useMemo(() => {
    const base = getVisibleOfferings(offerings, isAdmin);
    return base.filter((offering) => {
      if (kind !== "all" && offering.kind !== kind) return false;
      if (isAdmin && status !== "all" && offering.status !== status) return false;
      const query = search.trim().toLowerCase();
      if (!query) return true;
      return [offering.title, offering.creator_name, offering.description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [isAdmin, kind, offerings, search, status]);

  const approvedCount = offerings.filter((offering) => offering.status === OFFERING_STATUS.approved).length;

  const updateStatus = async (offering, nextStatus) => {
    setModeratingId(offering.id);
    try {
      await communityClient.entities.Offering.update(offering.id, {
        status: nextStatus,
        approved_at: nextStatus === OFFERING_STATUS.approved ? new Date().toISOString() : offering.approved_at || "",
      });
      await loadData({ silent: true });
      toast({
        title: nextStatus === OFFERING_STATUS.approved ? "Offering approved" : "Offering rejected",
        description: nextStatus === OFFERING_STATUS.approved ? "It is now visible in the Shrine." : "It has been kept out of the public gallery.",
      });
    } catch {
      toast({
        title: "Moderation update failed",
        description: "Please try again in a moment.",
      });
    } finally {
      setModeratingId("");
    }
  };

  const deleteOffering = async (offering) => {
    if (!confirm("Delete this offering from the Shrine?")) return;
    setModeratingId(offering.id);
    try {
      await communityClient.entities.Offering.delete(offering.id);
      await loadData({ silent: true });
      toast({ title: "Offering deleted" });
    } catch {
      toast({
        title: "Offering could not be deleted",
        description: "Please try again in a moment.",
      });
    } finally {
      setModeratingId("");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setKind("all");
    setStatus("all");
  };

  const hasActiveFilters = Boolean(search.trim() || kind !== "all" || status !== "all");

  return (
    <div className="relative mx-auto max-w-6xl animate-fade-in">
      <ParticleOverlay style={{ position: "fixed", zIndex: 50 }} />
      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary/75">
            <HeartHandshake className="h-4 w-4" />
            <span className="text-[10px] font-medium uppercase tracking-[0.28em]">Community Offerings</span>
          </div>
          <h1 className="font-heading text-2xl font-bold md:text-3xl">Offerings for Veri</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Fanart, songs, poetry, stories, edits, and small bright things made by Foxfam.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <ImagePlus className="h-4 w-4" /> Submit Offering
        </Button>
      </div>

      <div className="mb-6 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="foxcard rounded-xl p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_12rem_12rem]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search offerings..."
                className="h-11 w-full rounded-lg border border-border bg-secondary/45 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="h-11 bg-secondary/45">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {OFFERING_KIND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin ? (
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11 bg-secondary/45">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTERS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-11 items-center gap-2 rounded-lg border border-border bg-secondary/35 px-3 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                Mod-approved gallery
              </div>
            )}
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          )}
        </div>
        <div className="foxcard flex items-center justify-between gap-5 rounded-xl p-4 lg:min-w-56 lg:flex-col lg:items-start">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Approved</p>
            <p className="mt-1 font-heading text-2xl font-bold">{approvedCount}</p>
          </div>
          {isAdmin && (
            <div className="text-right lg:text-left">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Pending</p>
              <p className="mt-1 font-heading text-2xl font-bold text-primary">{pendingCount}</p>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : visibleOfferings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/30 p-14 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters ? "No offerings match those filters." : "No approved offerings yet."}
          </p>
          <Button className="mt-4 gap-2" onClick={() => setShowForm(true)}>
            <ImagePlus className="h-4 w-4" /> Submit an offering
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visibleOfferings.map((offering) => (
            <OfferingCard
              key={offering.id}
              offering={offering}
              isAdmin={isAdmin}
              onApprove={moderatingId ? undefined : (item) => updateStatus(item, OFFERING_STATUS.approved)}
              onReject={moderatingId ? undefined : (item) => updateStatus(item, OFFERING_STATUS.rejected)}
              onDelete={moderatingId ? undefined : deleteOffering}
            />
          ))}
        </div>
      )}

      <OfferingForm open={showForm} onOpenChange={setShowForm} user={user} onCreated={loadData} />
    </div>
  );
}
