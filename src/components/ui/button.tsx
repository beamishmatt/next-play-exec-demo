import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";
import { useIsMobile } from "./use-mobile";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all cursor-pointer disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-[var(--text-inverse-strong)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        secondary:
          "border border-[var(--stroke-key-strong)] hover:bg-[var(--fill-hover)]",
        neutral:
          "bg-[var(--fill-muted)] text-primary-foreground hover:bg-[var(--fill-muted)]/80",
        tertiary:
          "text-accent hover:bg-[var(--fill-hover)] underline decoration-dotted decoration-accent underline-offset-2",
        specialOutline:
          "border border-[var(--fill-special-strong)] hover:bg-primary/20",
        link: "text-primary underline-offset-4 hover:underline",
        special:
          "bg-[var(--fill-special-vivid)] text-[var(--text-special)] hover:bg-[var(--fill-special-vivid)]/90 focus-visible:ring-[var(--fill-special-strong)]/20",
        toggle:
          "border bg-[var(--fill-special-weak)] border-[var(--fill-special-strong)] text-foreground hover:bg-[var(--fill-special-weak)]/80",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        icon: "size-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  },
);

const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean;
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  const isMobile = useIsMobile();
  
  // Memoize the button size calculation to prevent unnecessary re-renders
  const buttonSize = React.useMemo(() => {
    return size || (isMobile ? "sm" : "default");
  }, [size, isMobile]);

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size: buttonSize, className }))}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button, buttonVariants };