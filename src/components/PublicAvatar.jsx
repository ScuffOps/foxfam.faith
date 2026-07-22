import { getInitials } from "@/lib/userIdentity";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
};

export default function PublicAvatar({ src, name = "Guest", size = "sm", className = "" }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm;
  if (src) {
    return (
      <img
        src={src}
        alt={`${name}'s profile picture`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full border border-primary/30 object-cover bg-secondary", sizeClass, className)}
      />
    );
  }

  return (
    <span
      aria-label={`${name}'s profile picture`}
      className={cn("flex shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/15 font-semibold text-primary", sizeClass, className)}
    >
      {getInitials(name)}
    </span>
  );
}
