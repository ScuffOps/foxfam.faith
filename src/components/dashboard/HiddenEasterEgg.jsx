import { useState } from "react";
import { toast } from "@/components/ui/use-toast";

// A tiny invisible (but findable) element that rewards curious clickers
const SECRETS = [
  { trigger: "🌙", msg: "you found the moon!! it was here all along 🌙✨", title: "SECRET FOUND" },
  { trigger: "🐾", msg: "fox paw detected. you are now an honorary fox 🦊", title: "paw print" },
  { trigger: "⭐", msg: "a star!! just like you 💫", title: "✨ shiny" },
  { trigger: "🔮", msg: "the orb reveals... you have excellent taste in community portals", title: "🔮 the orb speaks" },
];

export default function HiddenEasterEgg({ index = 0 }) {
  const [found, setFound] = useState(false);
  const secret = SECRETS[index % SECRETS.length];

  const handleClick = () => {
    if (found) return;
    setFound(true);
    toast({ title: secret.title, description: secret.msg, duration: 4000 });
  };

  return (
    <span
      onClick={handleClick}
      title={found ? secret.trigger : ""}
      className={`inline-block cursor-pointer select-none transition-all duration-300 ${
        found
          ? "opacity-100 text-base"
          : "opacity-0 hover:opacity-20 text-[8px] w-2 h-2"
      }`}
      style={{ userSelect: "none" }}
    >
      {found ? secret.trigger : "·"}
    </span>
  );
}