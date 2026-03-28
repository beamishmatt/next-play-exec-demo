import React from 'react';
import { Checkbox } from './ui/checkbox';

interface SimpleListItem {
  id: string;
  primaryText: string;
  secondaryText: string;
  isSelected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onClick?: () => void;
  leftIcon?: React.ReactNode;
  rightContent?: React.ReactNode;
}

interface SimpleListProps {
  items: SimpleListItem[];
  showSelectAll?: boolean;
  selectAllState?: {
    checked: boolean;
    indeterminate: boolean;
  };
  onSelectAll?: (checked: boolean) => void;
  emptyMessage?: string;
}

export function SimpleList({ 
  items, 
  showSelectAll = false,
  selectAllState,
  onSelectAll,
  emptyMessage = "No items found"
}: SimpleListProps) {
  if (items.length === 0) {
    return (
      <div 
        className="p-6 rounded-lg border"
        style={{ 
          backgroundColor: 'var(--raised)',
          borderColor: 'var(--border)',
          boxShadow: 'var(--elevation-sm)'
        }}
      >
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground caption">
            {emptyMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg border"
      style={{ 
        backgroundColor: 'var(--raised)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--elevation-sm)'
      }}
    >
      {/* Select All Header */}
      {showSelectAll && selectAllState && onSelectAll && (
        <div 
          className="flex items-center gap-3 p-4 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <Checkbox 
            checked={selectAllState.indeterminate ? "indeterminate" : selectAllState.checked}
            onCheckedChange={onSelectAll}
            aria-label="Select all items"
          />
          <span className="caption text-muted-foreground">
            Select all
          </span>
        </div>
      )}

      {/* List Items */}
      <div className="divide-y" style={{ "--divide-opacity": "var(--border)" }}>
        {items.map((item) => (
          <div 
            key={item.id}
            className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={item.onClick}
          >
            {/* Selection Checkbox */}
            {item.onSelect && (
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox 
                  checked={item.isSelected || false}
                  onCheckedChange={(checked) => item.onSelect?.(item.id, !!checked)}
                  aria-label={`Select ${item.primaryText}`}
                />
              </div>
            )}

            {/* Left Icon */}
            {item.leftIcon && (
              <div className="flex-shrink-0">
                {item.leftIcon}
              </div>
            )}

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p 
                    className="truncate" 
                    style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: 'var(--text-p)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--foreground)'
                    }}
                  >
                    {item.primaryText}
                  </p>
                  <p 
                    className="truncate caption text-muted-foreground"
                    style={{
                      fontFamily: "'IBM Plex Sans', sans-serif",
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--font-weight-regular)'
                    }}
                  >
                    {item.secondaryText}
                  </p>
                </div>
                
                {/* Right Content */}
                {item.rightContent && (
                  <div className="flex-shrink-0 ml-3">
                    {item.rightContent}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}