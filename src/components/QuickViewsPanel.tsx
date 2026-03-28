import React from 'react';
import { Pill } from './ui/pill';
import { Separator } from './ui/separator';
import { SquarePlay, Volume2, Image, FolderArchive, FileText, Check, User, Hash } from 'lucide-react';
import { FileType } from '../data/types';

interface QuickViewsPanelProps {
  isOpen: boolean;
  selectedFileTypes: FileType[];
  onFileTypeToggle: (fileType: FileType) => void;
  owners: string[];
  selectedOwners: string[];
  onOwnerToggle: (owner: string) => void;
  ids: string[];
  selectedIds: string[];
  onIdToggle: (id: string) => void;
  availableFileTypes: FileType[];
  fileTypeCounts: Record<FileType, number>;
  ownerCounts: Record<string, number>;
  idCounts: Record<string, number>;
}

// Available file types with their display names and icons
const FILE_TYPES: { type: FileType; label: string; icon: React.ReactNode }[] = [
  { type: 'video', label: 'Video', icon: <SquarePlay size={14} /> },
  { type: 'audio', label: 'Audio', icon: <Volume2 size={14} /> },
  { type: 'image', label: 'Image', icon: <Image size={14} /> },
  { type: 'zip', label: 'Zip', icon: <FolderArchive size={14} /> },
  { type: 'other', label: 'Document', icon: <FileText size={14} /> },
];

export function QuickViewsPanel({ 
  isOpen, 
  selectedFileTypes, 
  onFileTypeToggle,
  owners,
  selectedOwners,
  onOwnerToggle,
  ids,
  selectedIds,
  onIdToggle,
  availableFileTypes,
  fileTypeCounts,
  ownerCounts,
  idCounts
}: QuickViewsPanelProps) {
  // Filter FILE_TYPES to only show those that exist in the case
  const visibleFileTypes = FILE_TYPES.filter(({ type }) => availableFileTypes.includes(type));

  return (
    <div 
      className={`overflow-hidden ${isOpen ? 'rounded-lg border' : ''}`}
      style={{ 
        backgroundColor: isOpen ? 'var(--raised)' : 'transparent',
        borderColor: isOpen ? 'var(--border)' : 'transparent',
        boxShadow: isOpen ? 'var(--elevation-sm)' : 'none',
        flex: isOpen ? '0 0 280px' : '0 0 0px',
        marginRight: isOpen ? '24px' : '0px',
        transform: isOpen ? 'translateX(0)' : 'translateX(-20px)',
        transition: isOpen 
          ? 'flex-basis 400ms cubic-bezier(0, 0.74, 0, 1), margin-right 400ms cubic-bezier(0, 0.74, 0, 1), background-color 400ms cubic-bezier(0, 0.74, 0, 1), border-color 400ms cubic-bezier(0, 0.74, 0, 1), box-shadow 400ms cubic-bezier(0, 0.74, 0, 1), transform 300ms cubic-bezier(0, 0.74, 0, 1)'
          : 'flex-basis 400ms cubic-bezier(0, 0.74, 0, 1), margin-right 400ms cubic-bezier(0, 0.74, 0, 1), background-color 400ms cubic-bezier(0, 0.74, 0, 1), border-color 400ms cubic-bezier(0, 0.74, 0, 1), box-shadow 400ms cubic-bezier(0, 0.74, 0, 1), transform 300ms cubic-bezier(0, 0.74, 0, 1)',
        minHeight: '100%'
      }}
    >
      <div 
        className="space-y-6"
        style={{
          padding: '16px',
          opacity: isOpen ? 1 : 0,
          transition: isOpen 
            ? 'opacity 300ms cubic-bezier(0, 0.74, 0, 1) 200ms'
            : 'opacity 200ms cubic-bezier(0, 0.74, 0, 1)'
        }}
      >
        {/* Header */}
        <div>
          <h4 
            className="text-foreground mb-2"
            style={{
              fontSize: 'var(--text-h4)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Quick views
          </h4>
        </div>

        {/* File Type Section */}
        <div className="space-y-3">
          <p 
            className="text-muted-foreground"
            style={{
              fontSize: 'var(--text-caption)',
              fontWeight: 'var(--font-weight-regular)',
            }}
          >
            File Type
          </p>
          <div className="flex flex-col gap-2">
            {visibleFileTypes.map(({ type, label, icon }) => (
              <Pill
                key={type}
                variant={selectedFileTypes.includes(type) ? "selected" : "default"}
                onClick={() => onFileTypeToggle(type)}
                className="justify-between"
              >
                <div className="flex items-center gap-2">
                  {selectedFileTypes.includes(type) ? <Check size={14} /> : icon}
                  <span style={{
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--font-weight-regular)',
                  }}>{label}</span>
                </div>
                <span 
                  className="text-muted-foreground"
                  style={{
                    fontSize: 'var(--text-caption)',
                    fontWeight: 'var(--font-weight-regular)',
                  }}
                >
                  {fileTypeCounts[type] || 0}
                </span>
              </Pill>
            ))}
          </div>
        </div>

        <Separator />

        {/* Owner Section */}
        <div className="space-y-3">
          <p 
            className="text-muted-foreground"
            style={{
              fontSize: 'var(--text-caption)',
              fontWeight: 'var(--font-weight-regular)',
            }}
          >
            Owner
          </p>
          <div className="flex flex-col gap-2">
            {owners.length > 0 ? (
              owners.map((owner) => (
                <Pill
                  key={owner}
                  variant={selectedOwners.includes(owner) ? "selected" : "default"}
                  onClick={() => onOwnerToggle(owner)}
                  className="justify-between"
                >
                  <div className="flex items-center gap-2">
                    {selectedOwners.includes(owner) ? <Check size={14} /> : <User size={14} />}
                    <span style={{
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--font-weight-regular)',
                    }}>{owner}</span>
                  </div>
                  <span 
                    className="text-muted-foreground"
                    style={{
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--font-weight-regular)',
                    }}
                  >
                    {ownerCounts[owner] || 0}
                  </span>
                </Pill>
              ))
            ) : (
              <p 
                className="text-muted-foreground"
                style={{
                  fontSize: 'var(--text-caption)',
                }}
              >
                No owners found
              </p>
            )}
          </div>
        </div>

        {/* Separator */}
        <Separator />

        {/* ID Section */}
        <div className="space-y-3">
          <p 
            className="text-muted-foreground"
            style={{
              fontSize: 'var(--text-caption)',
              fontWeight: 'var(--font-weight-regular)',
            }}
          >
            With ID
          </p>
          <div className="flex flex-col gap-2">
            {ids.length > 0 ? (
              ids.map((id) => (
                <Pill
                  key={id}
                  variant={selectedIds.includes(id) ? "selected" : "default"}
                  onClick={() => onIdToggle(id)}
                  className="justify-between"
                >
                  <div className="flex items-center gap-2">
                    {selectedIds.includes(id) ? <Check size={14} /> : <Hash size={14} />}
                    <span style={{
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--font-weight-regular)',
                    }}>{id}</span>
                  </div>
                  <span 
                    className="text-muted-foreground"
                    style={{
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--font-weight-regular)',
                    }}
                  >
                    {idCounts[id] || 0}
                  </span>
                </Pill>
              ))
            ) : (
              <p 
                className="text-muted-foreground"
                style={{
                  fontSize: 'var(--text-caption)',
                }}
              >
                No IDs found
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}