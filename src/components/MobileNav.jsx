import { Menu, Sparkles } from "lucide-react";

export default function MobileNav({ onMenuClick }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <span className="font-heading text-sm font-bold">CommHub</span>
      </div>
      <div className="w-9" />
    </div>
  );
}