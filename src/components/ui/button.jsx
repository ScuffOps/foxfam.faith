import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "portal-button inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border border-white/10 bg-[linear-gradient(180deg,hsl(var(--primary)/0.98),hsl(var(--primary)/0.74))] text-primary-foreground hover:brightness-110",
        destructive:
          "border border-white/10 bg-[linear-gradient(180deg,hsl(var(--destructive)/0.98),hsl(var(--destructive)/0.74))] text-destructive-foreground hover:brightness-110",
        outline:
          "border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] hover:bg-accent hover:text-accent-foreground",
        secondary:
          "border border-white/10 bg-[linear-gradient(180deg,hsl(var(--secondary)/0.95),hsl(var(--secondary)/0.72))] text-secondary-foreground hover:bg-secondary/80",
        ghost: "border border-transparent shadow-none hover:border-white/10 hover:bg-accent hover:text-accent-foreground hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_18px_rgba(0,0,0,0.18)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, type, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    (<Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      type={asChild ? undefined : type || "button"}
      {...props} />)
  );
})
Button.displayName = "Button"

export { Button, buttonVariants }
