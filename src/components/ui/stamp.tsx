import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";

import { cn } from "./utils";

const stampVariants = cva(
  [
    // Layout
    "inline-flex items-center justify-center gap-1 w-fit shrink-0 overflow-hidden",
    // Spacing
    "px-2 py-0.5",
    // Typography
    "caption whitespace-nowrap",
    // Border & Shape
    "border border-transparent",
    // SVG styles
    "[&>svg]:size-3 [&>svg]:pointer-events-none",
    // Transitions
    "transition-colors",
  ].join(" "),
  {
    variants: {
      variant: {
        key: "text-[var(--text-key)] [&>svg]:text-[var(--text-key)]",
        green: "text-[var(--text-success)] [&>svg]:text-[var(--text-success)]",
        amber: "text-[var(--text-warning)] [&>svg]:text-[var(--text-warning)]",
        neutral: "text-[var(--text-strong)] [&>svg]:text-[var(--text-strong)]",
        red: "text-[var(--text-error)] [&>svg]:text-[var(--text-error)]",
        plum: "text-[var(--text-information)] [&>svg]:text-[var(--text-information)]",
        labelNeutral: "!text-label uppercase py-0 px-1 text-[var(--text-strong)] [&>svg]:text-[var(--text-strong)]",
        labelRed: "!text-label uppercase py-0 px-1 text-[var(--text-inverse-strong)] [&>svg]:text-[var(--text-inverse-strong)]",
        labelKey: "!text-label uppercase py-0 px-1 text-[var(--text-inverse-strong)] [&>svg]:text-[var(--text-inverse-strong)]",
        labelGreen: "!text-label uppercase py-0 px-1 text-[var(--text-inverse-strong)] [&>svg]:text-[var(--text-inverse-strong)]",
        labelAmber: "!text-label uppercase py-0 px-1 text-[var(--text-inverse-strong)] [&>svg]:text-[var(--text-inverse-strong)]",
        labelPlum: "!text-label uppercase py-0 px-1 text-[var(--text-inverse-strong)] [&>svg]:text-[var(--text-inverse-strong)]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

function Stamp({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof stampVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "span";

  return (
    <Comp
      data-slot="stamp"
      data-variant={variant}
      className={cn(stampVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Stamp, stampVariants };
