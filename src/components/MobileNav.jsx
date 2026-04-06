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
        <img src="https://media.base44.com/images/public/69d2a9d37042d6fe0e285ca4/e241ead03_TenkoTokenrerwork.png" alt="CommHub" className="h-7 w-7 rounded-md object-cover" />
        <span className="font-heading text-sm font-bold">CommHub</span>
      </div>
      <div className="w-9" />
    </div>
  );
}