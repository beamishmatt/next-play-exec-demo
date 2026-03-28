import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleList } from './SimpleList';
import { Case } from '../data/types';
import { Users } from 'lucide-react';

interface CasesListProps {
  cases?: Case[];
  selectedItems?: Set<number>;
  onSelectionChange?: (selectedItems: Set<number>) => void;
}

export function CasesList({ 
  cases = [], 
  selectedItems = new Set(),
  onSelectionChange
}: CasesListProps) {
  const navigate = useNavigate();

  // Transform cases data into SimpleList format
  const listItems = useMemo(() => {
    return cases.map((case_, index) => ({
      id: case_.caseId,
      primaryText: case_.caseId,
      secondaryText: case_.owner,
      isSelected: selectedItems.has(index),
      onSelect: onSelectionChange ? (id: string, checked: boolean) => {
        const newSelected = new Set(selectedItems);
        if (checked) {
          newSelected.add(index);
        } else {
          newSelected.delete(index);
        }
        onSelectionChange(newSelected);
      } : undefined,
      onClick: () => navigate(`/cases/${case_.caseId}`),
      rightContent: case_.isShared ? (
        <Users size={16} style={{ color: 'var(--accent)' }} />
      ) : null
    }));
  }, [cases, selectedItems, onSelectionChange, navigate]);

  // Calculate select all state
  const selectAllState = useMemo(() => {
    if (cases.length === 0) return { checked: false, indeterminate: false };
    
    const totalItems = cases.length;
    const selectedCount = selectedItems.size;
    
    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === totalItems) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  }, [cases.length, selectedItems.size]);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      // Select all case items (by their indices in the original cases array)
      const allIndices = new Set<number>();
      for (let i = 0; i < cases.length; i++) {
        allIndices.add(i);
      }
      onSelectionChange(allIndices);
    } else {
      // Deselect all
      onSelectionChange(new Set());
    }
  };

  return (
    <SimpleList
      items={listItems}
      showSelectAll={!!onSelectionChange}
      selectAllState={selectAllState}
      onSelectAll={handleSelectAll}
      emptyMessage="No cases found"
    />
  );
}