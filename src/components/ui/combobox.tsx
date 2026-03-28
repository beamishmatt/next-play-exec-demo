"use client";

import * as React from "react";
import { Check, ChevronDown, CircleX } from "lucide-react";
import { cn } from "./utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface ComboboxProps {
  options: { value: string; label: string }[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
}

export function Combobox({
  options = [],
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found.",
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);

  const handlePillDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange?.("");
  };

  // Safety check
  const safeOptions = options || [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          role="combobox"
          aria-expanded={open}
          className={cn(
            "border-border data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer h-9",
            className
          )}
        >
          {value ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span
                className="inline-flex items-center justify-center gap-1.5 w-fit shrink-0 overflow-hidden px-3 py-1 caption whitespace-nowrap border border-transparent transition-all duration-200"
                style={{
                  backgroundColor: 'var(--fill-weak)',
                  fontSize: 'var(--text-caption)',
                  fontWeight: 'var(--font-weight-regular)',
                  color: 'var(--text-strong)',
                  borderRadius: 'var(--radius-badge)',
                }}
              >
                {safeOptions.find((option) => option.value === value)?.label}
                <span
                  role="button"
                  tabIndex={0}
                  className="ml-0.5 -mr-1 rounded-sm transition-colors cursor-pointer hover:opacity-70"
                  onClick={handlePillDismiss}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handlePillDismiss(e as any);
                    }
                  }}
                  aria-label="Clear selection"
                  style={{
                    color: 'var(--text-strong)',
                  }}
                >
                  <CircleX className="w-3 h-3 pointer-events-none" />
                </span>
              </span>
            </div>
          ) : (
            <span 
              className="text-muted-foreground"
              style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {placeholder}
            </span>
          )}
          <ChevronDown 
            className="size-4 opacity-50 shrink-0"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0" 
        style={{ 
          width: 'var(--radix-popover-trigger-width)',
          maxHeight: '300px'
        }}
      >
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder}
            style={{
              fontSize: 'var(--text-p)',
              fontWeight: 'var(--font-weight-regular)',
            }}
          />
          <CommandList>
            <CommandEmpty
              style={{
                fontSize: 'var(--text-p)',
                fontWeight: 'var(--font-weight-regular)',
              }}
            >
              {emptyText}
            </CommandEmpty>
            <CommandGroup>
              {safeOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onValueChange?.(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                  style={{
                    fontSize: 'var(--text-p)',
                    fontWeight: 'var(--font-weight-regular)',
                  }}
                >
                  <Check
                    size={16}
                    style={{
                      marginRight: '8px',
                      opacity: value === option.value ? 1 : 0,
                    }}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}