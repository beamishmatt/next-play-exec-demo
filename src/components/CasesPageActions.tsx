import React from 'react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Plus, MoreHorizontal, Download } from 'lucide-react';

interface CasesPageActionsProps {
  onCreateCase: () => void;
  onExportResults: () => void;
  selectedCount?: number;
}

export function CasesPageActions({ onCreateCase, onExportResults, selectedCount = 0 }: CasesPageActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Create Case Button */}
      <Button onClick={onCreateCase}>
        <Plus size={16} className="mr-2" />
        Create Case
      </Button>
      
      {/* Overflow Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary">
            <MoreHorizontal size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportResults} className="cursor-pointer">
            <Download size={16} className="mr-2" />
            {selectedCount > 0 ? `Export Selected (${selectedCount})` : 'Export Results'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}