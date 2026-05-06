import { forwardRef } from "react";
import { useMouseShine } from "@/hooks/useMouseShine";
import { cn } from "@/lib/utils";

const GlassCard = forwardRef(function GlassCard({ children, className = "", onClick, style }, forwardedRef) {
  const { ref, onMouseMove, onMouseLeave } = useMouseShine();
  const setRefs = (node) => {
    ref.current = node;
    if (typeof forwardedRef === "function") {
      forwardedRef(node);
    } else if (forwardedRef) {
      forwardedRef.current = node;
    }
  };

  return (
    <div
      ref={setRefs}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={style}
      className={cn(
        "foxcard rounded-xl p-5 transition-all duration-300",
        onClick && "cursor-pointer hover:border-white/20 hover:shadow-[0_0_30px_rgba(140,60,240,0.15)]",
        className
      )}
    >
      {children}
    </div>
  );
});

export default GlassCard;
