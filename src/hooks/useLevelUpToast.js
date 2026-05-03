import { useToast } from "@/components/ui/use-toast";

/**
 * Returns a function that checks an awardPoints result and fires a
 * celebratory toast if the user just leveled up.
 */
export function useLevelUpToast() {
  const { toast } = useToast();

  return function checkLevelUp({ leveledUp, newRank } = {}) {
    if (!leveledUp || !newRank) return;
    toast({
      title: `${newRank.icon} Rank up! You're now ${newRank.name}`,
      description: "You've reached a new community rank. Keep it up! ✦",
      duration: 6000,
    });
  };
}