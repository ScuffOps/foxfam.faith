import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FamiliarCustomizer from "@/games/shared/familiar/FamiliarCustomizer";
import { useFamiliar } from "@/games/shared/familiar/useFamiliar";

export default function FamiliarWardrobe() {
  const navigate = useNavigate();
  const { familiar, saveFamiliar, status, error, isGuest } = useFamiliar();

  return (
    <section className="mx-auto max-w-5xl animate-fade-in space-y-4 pb-12" aria-label="Familiar Wardrobe">
      <Button type="button" variant="outline" className="min-h-11 border-2 border-[#485365] bg-[#faf3eb] text-[#364152]" onClick={() => navigate("/quarters")}>
        <ArrowLeft aria-hidden="true" /> Back to Quarters
      </Button>
      {status === "loading" ? (
        <section className="flex min-h-80 items-center justify-center" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading Familiar Wardrobe</span>
        </section>
      ) : (
        <FamiliarCustomizer familiar={familiar} onSave={saveFamiliar} isGuest={isGuest} status={status} error={error} />
      )}
    </section>
  );
}
