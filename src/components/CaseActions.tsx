import React, { useEffect } from 'react';
import { Button } from './ui/button';
import { Pill } from './ui/pill';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { SlidersHorizontal, FolderPlus, MoreHorizontal, Zap, Search } from 'lucide-react';
import { FileType } from '../data/types';

interface CaseActionsProps {
  selectedFileTypes: FileType[];
  onFileTypeToggle: (fileType: FileType) => void;
  onClearFilters: () => void;
  isFilterPanelOpen: boolean;
  onFilterPanelToggle: () => void;
  isQuickViewsPanelOpen: boolean;
  onQuickViewsPanelToggle: () => void;
  selectedOwners: string[];
  activeFilterCount?: number;
  onSearchClick?: () => void;
}

export function CaseActions({
  selectedFileTypes,
  onFileTypeToggle,
  onClearFilters,
  isFilterPanelOpen,
  onFilterPanelToggle,
  isQuickViewsPanelOpen,
  onQuickViewsPanelToggle,
  selectedOwners,
  activeFilterCount,
  onSearchClick
}: CaseActionsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        onSearchClick?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSearchClick]);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-0">
      
      {/* Left Section - Filters */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        {/* Quick Views Button - Desktop only */}
        <Button 
          variant={isQuickViewsPanelOpen ? "toggle" : "secondary"}
          onClick={onQuickViewsPanelToggle}
          className="hidden md:flex"
        >
          <Zap size={16} className="mr-2" />
          Quick views
        </Button>

        {/* Main Filter Button - Desktop only */}
        <Button 
          variant={isFilterPanelOpen ? "toggle" : "secondary"}
          onClick={onFilterPanelToggle}
          className="hidden md:flex"
        >
          <SlidersHorizontal size={16} className="mr-2" />
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

        {/* Clear Filters - Only show when filters are active */}
        {(selectedFileTypes.length > 0 || selectedOwners.length > 0 || activeFilterCount > 0) && (
          <Button
            variant="tertiary"
            onClick={onClearFilters}
            className="hidden md:flex"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Right Section - Action Buttons - Hidden on mobile */}
      <div className="hidden md:flex items-center gap-2">
        {/* Search Bar Button */}
        <button
          onClick={onSearchClick}
          className="flex items-center gap-2 px-3 h-8 rounded-md text-sm"
          style={{
            backgroundColor: 'var(--fill-secondary)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-secondary)',
            minWidth: '200px',
          }}
        >
          <Search size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
          <span className="flex-1 text-left" style={{ color: 'var(--text-tertiary)' }}>Search evidence...</span>
          <kbd
            className="inline-flex items-center justify-center rounded text-xs font-medium"
            style={{
              backgroundColor: 'var(--fill-tertiary)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-secondary)',
              padding: '1px 5px',
              fontSize: '11px',
              lineHeight: '16px',
            }}
          >
            /
          </kbd>
        </button>

        {/* Create Folder Button */}
        <Button variant="tertiary">
          <FolderPlus size={16} className="mr-2" />
          Create Folder
        </Button>
        
        {/* Overflow Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="tertiary">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Add Evidence</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}