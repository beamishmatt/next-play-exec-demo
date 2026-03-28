import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SimpleList } from './SimpleList';
import { Evidence } from '../data/types';
import { Video, Volume2, Image, FolderArchive, FileText } from 'lucide-react';

interface CaseEvidenceListProps {
  evidence: Evidence[];
  caseId: string;
  selectedItems?: Set<number>;
  onSelectionChange?: (selectedItems: Set<number>) => void;
}

export function CaseEvidenceList({ 
  evidence,
  caseId,
  selectedItems = new Set(),
  onSelectionChange
}: CaseEvidenceListProps) {
  const navigate = useNavigate();

  // Get file type icon
  const getFileTypeIcon = (fileType: string) => {
    const iconProps = { 
      size: 16, 
      style: { color: 'var(--muted-foreground)' }
    };
    
    switch (fileType) {
      case 'video':
        return <Video {...iconProps} />;
      case 'audio':
        return <Volume2 {...iconProps} />;
      case 'image':
        return <Image {...iconProps} />;
      case 'document':
        return <FileText {...iconProps} />;
      default:
        return <FolderArchive {...iconProps} />;
    }
  };

  // Add unique keys to evidence items for proper React rendering
  const evidenceWithKeys = useMemo(() => {
    return evidence.map((evidenceItem, index) => ({
      ...evidenceItem,
      evidenceIndex: index
    }));
  }, [evidence]);

  // Handle row click navigation to evidence detail page
  const handleRowClick = (evidenceItem: typeof evidenceWithKeys[0]) => {
    navigate(`/cases/${caseId}/evidence/${evidenceItem.evidenceIndex}`);
  };

  // Transform evidence data into SimpleList format
  const listItems = useMemo(() => {
    return evidenceWithKeys.map((evidenceItem) => ({
      id: evidenceItem.uuid,
      primaryText: evidenceItem.title,
      secondaryText: evidenceItem.owner,
      isSelected: selectedItems.has(evidenceItem.evidenceIndex),
      onSelect: onSelectionChange ? (id: string, checked: boolean) => {
        const index = evidenceItem.evidenceIndex;
        const newSelected = new Set(selectedItems);
        if (checked) {
          newSelected.add(index);
        } else {
          newSelected.delete(index);
        }
        onSelectionChange(newSelected);
      } : undefined,
      onClick: () => handleRowClick(evidenceItem),
      leftIcon: getFileTypeIcon(evidenceItem.fileType)
    }));
  }, [evidenceWithKeys, selectedItems, onSelectionChange, caseId]);

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

  // Handle select all toggle
  const handleSelectAllToggle = () => {
    if (!onSelectionChange) return;
    
    if (selectAllState.checked || selectAllState.indeterminate) {
      onSelectionChange(new Set());
    } else {
      const allIndices = evidenceWithKeys.map(item => item.evidenceIndex);
      onSelectionChange(new Set(allIndices));
    }
  };

  return (
    <SimpleList
      items={listItems}
      selectAllState={selectAllState}
      onSelectAllToggle={onSelectionChange ? handleSelectAllToggle : undefined}
      emptyMessage="No evidence found for this case"
    />
  );
}