import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const badgeVariants = cva(
  [
    // Layout
    "inline-flex items-center justify-center gap-1 w-fit shrink-0 overflow-hidden",
    // Spacing
    "px-2 py-0.5",
    // Typography
    "text-xs font-medium whitespace-nowrap",
    // Border & Shape
    "border border-transparent",
    // SVG styles
    "[&>svg]:size-3 [&>svg]:pointer-events-none",
    // Focus states
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    // Transitions
    "transition-[color,box-shadow]",
  ].join(" "),
  {
    variants: {
      variant: {
        key: "text-[var(--text-inverse-strong)] [&>svg]:text-[var(--text-inverse-strong)]",
        green: "text-[var(--text-inverse-strong)] [&>svg]:text-[var(--text-inverse-strong)]",
        amber: "text-[var(--text-inverse-strong)] [&>svg]:text-[var(--text-inverse-strong)]",
        neutral: "text-[var(--text-strong)] [&>svg]:text-[var(--text-strong)]",
        red: "text-[var(--text-inverse-strong)] [&>svg]:text-[var(--text-inverse-strong)]",
        plum: "text-[var(--text-inverse-strong)] [&>svg]:text-[var(--text-inverse-strong)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
