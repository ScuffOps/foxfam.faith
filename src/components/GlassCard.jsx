export default function GlassCard({ children, className = "", onClick }) {
  return (
    <div
      onClick={onClick}
      className={`glass-card rounded-xl p-5 transition-all duration-200 ${onClick ? "cursor-pointer hover:border-primary/30" : ""} ${className}`}
    >
      {children}
    </div>
  );
}