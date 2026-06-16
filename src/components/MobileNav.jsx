import { Menu } from "lucide-react";

export default function MobileNav({ onMenuClick }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
      <button
        onClick={onMenuClick}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2">
        <img src="/assets/legacy-media/e241ead03_TenkoTokenrerwork.png" alt="Foxfam" className="h-7 w-7 rounded-md object-cover" />
        <span className="leading-none">
          <span className="block font-heading text-sm font-bold">Foxfam</span>
          <span className="block text-[9px] uppercase tracking-widest text-muted-foreground">Shrine + Portal</span>
        </span>
      </div>
      <div className="w-9" />
    </div>
  );
}
