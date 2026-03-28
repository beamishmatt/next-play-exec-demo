import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Evidence, FileType } from '../data/types';
import { SquarePlay, Volume2, Image, FolderArchive, FileText } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Skeleton } from './ui/skeleton';

interface MediaCardProps {
  evidence: Evidence;
  caseId?: string;
  evidenceIndex?: number;
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedItems: Set<string>) => void;
  navigationContext?: 'evidence' | 'cases'; // Add navigation context prop
}

// File type icons mapping for footer
const getFileTypeIcon = (fileType: FileType): React.ReactNode => {
  const iconProps = { size: 16, className: "text-muted-foreground" };
  
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
      return <FileText {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
};

// File type icons mapping for thumbnail replacement (larger size)
const getThumbnailFileTypeIcon = (fileType: FileType): React.ReactNode => {
  const iconProps = { 
    size: 64, 
    strokeWidth: 1.5,
    style: { color: 'var(--fill-strong)' }
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
      return <FileText {...iconProps} />;
    default:
      return <FileText {...iconProps} />;
  }
};

// Format date to display format
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export function MediaCard({ evidence, caseId, evidenceIndex, selectedItems, onSelectionChange, navigationContext }: MediaCardProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // Use uuid for selection
  const isSelected = selectedItems?.has(evidence.uuid) || false;
  const hasSelection = selectedItems && onSelectionChange;

  const handleClick = (e: React.MouseEvent) => {
    // If we're clicking on the checkbox, don't navigate
    if ((e.target as HTMLElement).closest('[data-checkbox]')) {
      return;
    }
    
    if (caseId && evidenceIndex !== undefined) {
      // Preserve filter params when navigating to evidence detail
      const filtersParam = searchParams.get('filters');
      
      // Navigate based on context: evidence page uses /evidence/caseId/index, cases page uses /cases/caseId/evidence/index
      let path: string;
      if (navigationContext === 'evidence') {
        path = `/evidence/${caseId}/${evidenceIndex}`;
      } else {
        path = `/cases/${caseId}/evidence/${evidenceIndex}`;
      }
      
      // Append filter params if they exist
      if (filtersParam) {
        navigate(`${path}?filters=${encodeURIComponent(filtersParam)}`);
      } else {
        navigate(path);
      }
    }
  };

  const handleSelectionChange = (checked: boolean) => {
    if (!selectedItems || !onSelectionChange) return;
    
    const newSelectedItems = new Set(selectedItems);
    if (checked) {
      newSelectedItems.add(evidence.uuid);
    } else {
      newSelectedItems.delete(evidence.uuid);
    }
    onSelectionChange(newSelectedItems);
  };

  return (
    <Card 
      className={`overflow-hidden hover:shadow-md transition-shadow cursor-pointer group gap-2 ${
        isSelected ? 'ring-2' : ''
      }`}
      style={{
        ['--hover-border-color' as string]: 'var(--fill-special-strong)',
        ...(isSelected ? { 
          '--tw-ring-color': 'var(--fill-special-strong)',
          borderColor: 'var(--fill-special-strong)'
        } : {})
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'var(--fill-special-strong)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = '';
        }
      }}
      onClick={handleClick}
    >
      <div className="aspect-video relative overflow-hidden bg-muted">
        {hasSelection && (
          <div 
            className="absolute top-2 left-2 z-10" 
            data-checkbox
            onClick={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleSelectionChange}
              className="bg-overlay border-border-strong shadow-md"
            />
          </div>
        )}
        {evidence.thumbnailUrl && !imageError ? (
          <React.Fragment>
            {imageLoading && (
              <Skeleton 
                className="w-full h-full absolute inset-0" 
                style={{ backgroundColor: 'var(--sunken)' }}
              />
            )}
            <img
              src={evidence.thumbnailUrl}
              alt={evidence.title}
              className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-200 ${
                imageLoading ? 'opacity-0' : 'opacity-100'
              }`}
              loading="lazy"
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
            />
          </React.Fragment>
        ) : (
          <div 
            className="w-full h-full flex items-center justify-center bg-raised"
          >
            {getThumbnailFileTypeIcon(evidence.fileType)}
          </div>
        )}
      </div>
      
      <CardContent className="p-4 space-y-2">
        {/* Title */}
        <h3 
          className="line-clamp-2 leading-tight"
          style={{
            fontSize: 'var(--text-p)',
            fontWeight: 'var(--font-weight-medium)',
            fontFamily: "'IBM Plex Sans', sans-serif"
          }}
        >
          {evidence.title}
        </h3>
        
        {/* Owner */}
        <p 
          className="text-muted-foreground truncate"
          style={{
            fontSize: 'var(--text-caption)',
            fontWeight: 'var(--font-weight-regular)',
            fontFamily: "'IBM Plex Sans', sans-serif"
          }}
        >
          {evidence.owner}
        </p>
        
        {/* Footer with recorded date and file type icon */}
        <div className="flex items-center justify-between">
          <p 
            className="text-muted-foreground"
            style={{
              fontSize: 'var(--text-caption)',
              fontWeight: 'var(--font-weight-regular)',
              fontFamily: "'IBM Plex Sans', sans-serif"
            }}
          >
            Recorded {formatDate(evidence.recordedOn)}
          </p>
          <div className="flex justify-end">
            {getFileTypeIcon(evidence.fileType)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}