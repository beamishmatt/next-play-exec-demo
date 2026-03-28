import React from 'react';
import { Button } from './ui/button';
import { Pill } from './ui/pill';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { SlidersHorizontal, FolderPlus, MoreHorizontal, Zap } from 'lucide-react';
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
  activeFilterCount
}: CaseActionsProps) {
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