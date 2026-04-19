import { useMouseShine } from "@/hooks/useMouseShine";

export default function GlassCard({ children, className = "", onClick }) {
  const { ref, onMouseMove, onMouseLeave } = useMouseShine();

  return (
    <div
      ref={ref}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className={`foxcard rounded-xl p-5 transition-all duration-300 ${onClick ? "cursor-pointer hover:border-white/20 hover:shadow-[0_0_30px_rgba(140,60,240,0.15)]" : ""} ${className}`}
    >
      {children}
    </div>
  );
}