import * as React from "react";
import { Slot } from "@radix-ui/react-slot@1.1.2";
import { cva, type VariantProps } from "class-variance-authority@0.7.1";
import { CircleX } from "lucide-react";

import { cn } from "./utils";

const pillVariants = cva(
  [
    // Layout
    "inline-flex items-center justify-center gap-1.5 w-fit shrink-0 overflow-hidden",
    // Spacing
    "px-3 py-1",
    // Typography
    "caption whitespace-nowrap",
    // Border & Shape
    "border border-transparent",
    // SVG styles
    "[&>svg]:size-3 [&>svg]:pointer-events-none",
    // Focus states
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    // Transitions
    "transition-all duration-200",
    // Cursor
    "cursor-pointer",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "text-[var(--text-strong)] [&>svg]:text-[var(--text-strong)]",
          "hover:bg-[var(--fill-hover)]",
          "active:scale-95",
        ].join(" "),
        selected: [
          "text-[var(--text-inverse-strong)] [&>svg]:text-[var(--text-inverse-strong)]",
          "hover:opacity-90",
          "active:scale-95",
        ].join(" "),
        dismissible: [
          "text-[var(--text-strong)] [&>svg]:text-[var(--text-strong)]",
          "hover:bg-[var(--fill-hover)]",
          "active:scale-95",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface PillProps extends React.ComponentProps<"button">, VariantProps<typeof pillVariants> {
  asChild?: boolean;
  onDismiss?: () => void;
}

function Pill({
  className,
  variant,
  asChild = false,
  onDismiss,
  children,
  onClick,
  ...props
}: PillProps) {
  const Comp = asChild ? Slot : "button";
  
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === "dismissible" && onDismiss) {
      onDismiss();
    } else if (onClick) {
      onClick(e);
    }
  };

  const handleDismissClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Comp
      data-slot="pill"
      data-variant={variant}
      className={cn(pillVariants({ variant }), className)}
      onClick={handleClick}
      {...props}
    >
      {children}
      {variant === "dismissible" && (
        <span
          role="button"
          tabIndex={0}
          className="ml-0.5 -mr-1 rounded-sm transition-colors cursor-pointer"
          onClick={handleDismissClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleDismissClick(e as any);
            }
          }}
          aria-label="Dismiss"
        >
          <CircleX className="w-3 h-3" />
        </span>
      )}
    </Comp>
  );
}

export { Pill, pillVariants };
