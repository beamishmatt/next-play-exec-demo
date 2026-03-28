import React from 'react';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { TableProperties, LayoutGrid } from 'lucide-react';

export type ViewMode = 'table' | 'gallery';

interface ViewSwitcherProps {
  viewMode: ViewMode;
  onViewModeChange: (viewMode: ViewMode) => void;
}

export function ViewSwitcher({ viewMode, onViewModeChange }: ViewSwitcherProps) {
  return (
    <div className="flex justify-end">
      <ToggleGroup 
        type="single" 
        value={viewMode} 
        onValueChange={(value) => value && onViewModeChange(value as ViewMode)}
        className="bg-muted rounded-md p-1"
      >
        <ToggleGroupItem 
          value="table" 
          aria-label="Table view"
          className="data-[state=on]:shadow-sm cursor-pointer"
          style={{
            '--tw-bg-opacity': '1'
          }}
          data-state={viewMode === 'table' ? 'on' : 'off'}
          {...(viewMode === 'table' && { 
            style: {
              backgroundColor: 'var(--fill-special-weak)',
              color: 'var(--text-strong)',
              border: '1px solid var(--fill-special-strong)'
            }
          })}
        >
          <TableProperties size={16} className="pointer-events-none" />
        </ToggleGroupItem>
        <ToggleGroupItem 
          value="gallery" 
          aria-label="Gallery view"
          className="data-[state=on]:shadow-sm cursor-pointer"
          style={{
            '--tw-bg-opacity': '1'
          }}
          data-state={viewMode === 'gallery' ? 'on' : 'off'}
          {...(viewMode === 'gallery' && { 
            style: {
              backgroundColor: 'var(--fill-special-weak)',
              color: 'var(--text-strong)',
              border: '1px solid var(--fill-special-strong)'
            }
          })}
        >
          <LayoutGrid size={16} className="pointer-events-none" />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}