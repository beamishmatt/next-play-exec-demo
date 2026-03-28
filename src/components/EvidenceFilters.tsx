import React from 'react';
import { Button } from './ui/button';
import { SlidersHorizontal } from 'lucide-react';

interface EvidenceFiltersProps {
  isFilterPanelOpen: boolean;
  onFilterPanelToggle: () => void;
  activeFilterCount?: number;
}

export function EvidenceFilters({ 
  isFilterPanelOpen, 
  onFilterPanelToggle,
  activeFilterCount
}: EvidenceFiltersProps) {
  return (
    <div className="flex items-center">
      {/* Filter Toggle Button */}
      <Button 
        variant={isFilterPanelOpen ? "toggle" : "secondary"}
        onClick={onFilterPanelToggle}
        className="flex items-center gap-2"
      >
        <SlidersHorizontal size={16} />
        Filters
        {activeFilterCount !== undefined && activeFilterCount > 0 && (
          <span 
            className="ml-2 inline-flex items-center justify-center"
            style={{
              minWidth: '20px',
              height: '20px',
              borderRadius: 'var(--radius-badge)',
              backgroundColor: 'var(--fill-key-strong)',
              color: 'var(--text-inverse-strong)',
              fontSize: 'var(--text-caption)',
              fontWeight: 'var(--font-weight-semibold)',
              padding: '0 6px',
            }}
          >
            {activeFilterCount}
          </span>
        )}
      </Button>
    </div>
  );
}