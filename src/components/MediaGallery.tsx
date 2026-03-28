import React, { useMemo } from 'react';
import { Evidence } from '../data/types';
import { MediaCard } from './MediaCard';

interface MediaGalleryProps {
  evidence: Evidence[];
  caseId?: string;
  allEvidence?: Evidence[];
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedItems: Set<string>) => void;
}

export function MediaGallery({ evidence, caseId, allEvidence, selectedItems, onSelectionChange }: MediaGalleryProps) {
  if (evidence.length === 0) {
    return (
      <div className="text-center py-12">
        <p 
          className="text-muted-foreground"
          style={{
            fontSize: 'var(--text-p)',
            fontWeight: 'var(--font-weight-regular)',
            fontFamily: "'IBM Plex Sans', sans-serif"
          }}
        >
          No evidence found matching the current filters.
        </p>
      </div>
    );
  }

  // Create evidence list with unique keys
  const evidenceWithKeys = useMemo(() => {
    return evidence.map((item, index) => {
      // Find the original index of this item in the full evidence array
      const originalIndex = allEvidence ? allEvidence.findIndex(fullItem => 
        fullItem.uuid === item.uuid
      ) : index;

      return {
        ...item,
        evidenceIndexInCase: originalIndex
      };
    });
  }, [evidence, allEvidence]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {evidenceWithKeys.map((item, index) => (
        <MediaCard 
          key={item.uuid || `evidence-${index}`} 
          evidence={item}
          caseId={caseId}
          evidenceIndex={item.evidenceIndexInCase}
          selectedItems={selectedItems}
          onSelectionChange={onSelectionChange}
          navigationContext="cases"
        />
      ))}
    </div>
  );
}