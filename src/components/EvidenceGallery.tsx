import React, { useMemo } from 'react';
import { Evidence } from '../data/types';
import { MediaCard } from './MediaCard';
import { getEvidenceByCaseId } from '../data/mockEvidence';

interface EvidenceGalleryProps {
  evidence: Evidence[];
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedItems: Set<string>) => void;
}

export function EvidenceGallery({ evidence, selectedItems, onSelectionChange }: EvidenceGalleryProps) {
  // Create evidence list with unique keys and calculate proper evidence index within each case
  const evidenceWithKeys = useMemo(() => {
    // Cache case evidence to avoid repeated calls
    const caseEvidenceCache = new Map<string, Evidence[]>();
    
    return evidence.map((evidenceItem, index) => {
      // Get or cache evidence for this case
      let caseEvidence = caseEvidenceCache.get(evidenceItem.id);
      if (!caseEvidence) {
        caseEvidence = getEvidenceByCaseId(evidenceItem.id);
        caseEvidenceCache.set(evidenceItem.id, caseEvidence);
      }
      
      // Find the index of this evidence item within its case
      const evidenceIndexInCase = caseEvidence.findIndex(caseEvidenceItem => 
        caseEvidenceItem.uuid === evidenceItem.uuid
      );
      
      return {
        ...evidenceItem,
        evidenceIndexInCase: evidenceIndexInCase >= 0 ? evidenceIndexInCase : index
      };
    });
  }, [evidence]);

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
          No evidence found matching the current search.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {evidenceWithKeys.map((item, index) => (
        <MediaCard 
          key={item.uuid || `evidence-${index}`} 
          evidence={item}
          caseId={item.id}
          evidenceIndex={item.evidenceIndexInCase}
          selectedItems={selectedItems}
          onSelectionChange={onSelectionChange}
          navigationContext="evidence"
        />
      ))}
    </div>
  );
}