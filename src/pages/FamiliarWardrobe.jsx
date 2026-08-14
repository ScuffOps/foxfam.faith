import { useState } from "react";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import FamiliarCalling from "@/games/shared/familiar/FamiliarCalling.jsx";
import FamiliarCustomizer from "@/games/shared/familiar/FamiliarCustomizer";
import { useFamiliar } from "@/games/shared/familiar/useFamiliar";

export default function FamiliarWardrobe() {
  const navigate = useNavigate();
  const { familiar, saveFamiliar, status, error, isGuest } = useFamiliar();
  const [view, setView] = useState("wardrobe");
  const [callingSelection, setCallingSelection] = useState(null);

  const chooseCallingFamiliar = (selection) => {
    setCallingSelection(selection);
    setView("wardrobe");
  };

  const save = async (selection) => {
    const saved = await saveFamiliar(selection);
    setCallingSelection(null);
    return saved;
  };

  return (
    <section className="mx-auto max-w-5xl animate-fade-in space-y-4 pb-12" aria-label="Familiar Wardrobe">
      <h1 className="sr-only">Familiar Wardrobe</h1>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button type="button" variant="outline" className="min-h-11 border-2 border-[#485365] bg-[#faf3eb] text-[#364152]" onClick={() => navigate("/quarters")}>
          <ArrowLeft aria-hidden="true" /> Back to Quarters
        </Button>
        {view === "wardrobe" ? (
          <Button type="button" variant="outline" className="min-h-11 border-2 border-[#485365] bg-[#f4e9bb] text-[#364152]" onClick={() => setView("calling")}>
            <Sparkles aria-hidden="true" /> Take the Familiar Calling
          </Button>
        ) : null}
      </div>
      {status === "loading" ? (
        <section className="flex min-h-80 items-center justify-center" aria-live="polite">
          <Loader2 className="h-8 w-8 animate-spin" aria-hidden="true" />
          <span className="sr-only">Loading Familiar Wardrobe</span>
        </section>
      ) : (
        view === "calling" ? (
          <FamiliarCalling
            familiar={familiar}
            onChoose={chooseCallingFamiliar}
            onClose={() => setView("wardrobe")}
          />
        ) : (
          <FamiliarCustomizer
            familiar={familiar}
            startingFamiliar={callingSelection || familiar}
            onSave={save}
            isGuest={isGuest}
            status={status}
            error={error}
          />
        )
      )}
    </section>
  );
}
