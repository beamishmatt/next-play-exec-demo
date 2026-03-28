import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleList } from './SimpleList';
import { Evidence } from '../data/types';
import { getEvidenceByCaseId } from '../data/mockEvidence';
import { SquarePlay, Volume2, Image, FolderArchive, FileText } from 'lucide-react';

interface EvidenceListProps {
  evidence: Evidence[];
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedItems: Set<string>) => void;
}

export function EvidenceList({ 
  evidence,
  selectedItems = new Set(),
  onSelectionChange
}: EvidenceListProps) {
  const navigate = useNavigate();

  // Get file type icon
  const getFileTypeIcon = (fileType: string) => {
    const iconProps = { 
      size: 16, 
      style: { color: 'var(--muted-foreground)' }
    };
    
    switch (fileType) {
      case 'video':
        return <SquarePlay {...iconProps} />;
      case 'audio':
        return <Volume2 {...iconProps} />;
      case 'image':
        return <Image {...iconProps} />;
      case 'zip':
        return <FolderArchive {...iconProps} />;
      case 'other':
      default:
        return <FileText {...iconProps} />;
    }
  };

  // Create evidence list with unique keys
  const evidenceWithKeys = useMemo(() => {
    return evidence;
  }, [evidence]);

  // Handle row click navigation
  const handleRowClick = (evidenceItem: Evidence) => {
    // Find the index of this evidence item within its case
    const caseEvidence = getEvidenceByCaseId(evidenceItem.id);
    const evidenceIndex = caseEvidence.findIndex(item => 
      item.uuid === evidenceItem.uuid
    );
    
    if (evidenceIndex !== -1) {
      navigate(`/evidence/${evidenceItem.id}/${evidenceIndex}`);
    }
  };

  // Transform evidence data into SimpleList format
  const listItems = useMemo(() => {
    return evidenceWithKeys.map((evidenceItem) => ({
      id: evidenceItem.uuid,
      primaryText: evidenceItem.title,
      secondaryText: evidenceItem.owner,
      isSelected: selectedItems.has(evidenceItem.uuid),
      onSelect: onSelectionChange ? (id: string, checked: boolean) => {
        const newSelected = new Set(selectedItems);
        if (checked) {
          newSelected.add(id);
        } else {
          newSelected.delete(id);
        }
        onSelectionChange(newSelected);
      } : undefined,
      onClick: () => handleRowClick(evidenceItem),
      leftIcon: getFileTypeIcon(evidenceItem.fileType)
    }));
  }, [evidenceWithKeys, selectedItems, onSelectionChange]);

  // Calculate select all state
  const selectAllState = useMemo(() => {
    if (evidenceWithKeys.length === 0) return { checked: false, indeterminate: false };
    
    const totalItems = evidenceWithKeys.length;
    const selectedCount = selectedItems.size;
    
    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === totalItems) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  }, [evidenceWithKeys.length, selectedItems.size]);

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    
    if (checked) {
      // Select all evidence items (by their unique keys)
      const allKeys = new Set<string>();
      evidenceWithKeys.forEach(item => {
        allKeys.add(item.uuid);
      });
      onSelectionChange(allKeys);
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
      emptyMessage="No evidence found"
    />
  );
}