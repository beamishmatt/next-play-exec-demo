import React, { useState, useEffect } from 'react';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Combobox } from './ui/combobox';
import { DatePicker } from './ui/date-picker';
import { Pill } from './ui/pill';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { format } from 'date-fns';

interface FilterPanelProps {
  isOpen: boolean;
  ownerOptions: { value: string; label: string }[];
  uploadedByOptions: { value: string; label: string }[];
  addedByOptions: { value: string; label: string }[];
  selectedOwner: string;
  selectedUploadedBy: string;
  selectedAddedBy: string;
  onOwnerChange: (value: string) => void;
  onUploadedByChange: (value: string) => void;
  onAddedByChange: (value: string) => void;
  uploadedOnDate?: Date;
  recordedOnDate?: Date;
  onUploadedOnChange: (date: Date | undefined) => void;
  onRecordedOnChange: (date: Date | undefined) => void;
}

export function FilterPanel({ 
  isOpen, 
  ownerOptions, 
  uploadedByOptions, 
  addedByOptions, 
  selectedOwner, 
  selectedUploadedBy, 
  selectedAddedBy, 
  onOwnerChange, 
  onUploadedByChange, 
  onAddedByChange,
  uploadedOnDate,
  recordedOnDate,
  onUploadedOnChange,
  onRecordedOnChange
}: FilterPanelProps) {
  const [isUserGroupOpen, setIsUserGroupOpen] = useState(true);
  const [isDateTimeOpen, setIsDateTimeOpen] = useState(true);
  const [showAppliedFilters, setShowAppliedFilters] = useState(false);

  // Check if there are any active filters
  const hasActiveFilters = selectedOwner || selectedUploadedBy || selectedAddedBy || uploadedOnDate || recordedOnDate;

  // When panel opens, check if there are existing filters to show
  useEffect(() => {
    if (isOpen && hasActiveFilters) {
      setShowAppliedFilters(true);
    } else if (!isOpen) {
      // Reset when panel closes
      setShowAppliedFilters(false);
    }
  }, [isOpen]);

  // Hide applied filters section when user actively modifies filters
  const handleOwnerChange = (value: string) => {
    setShowAppliedFilters(false);
    onOwnerChange(value);
  };

  const handleUploadedByChange = (value: string) => {
    setShowAppliedFilters(false);
    onUploadedByChange(value);
  };

  const handleAddedByChange = (value: string) => {
    setShowAppliedFilters(false);
    onAddedByChange(value);
  };

  const handleUploadedOnChange = (date: Date | undefined) => {
    setShowAppliedFilters(false);
    onUploadedOnChange(date);
  };

  const handleRecordedOnChange = (date: Date | undefined) => {
    setShowAppliedFilters(false);
    onRecordedOnChange(date);
  };

  // Clear individual filter
  const clearFilter = (filterType: 'owner' | 'uploadedBy' | 'addedBy' | 'uploadedOn' | 'recordedOn') => {
    setShowAppliedFilters(false);
    switch (filterType) {
      case 'owner':
        onOwnerChange('');
        break;
      case 'uploadedBy':
        onUploadedByChange('');
        break;
      case 'addedBy':
        onAddedByChange('');
        break;
      case 'uploadedOn':
        onUploadedOnChange(undefined);
        break;
      case 'recordedOn':
        onRecordedOnChange(undefined);
        break;
    }
  };

  // Clear all filters
  const clearAllFilters = () => {
    setShowAppliedFilters(false);
    onOwnerChange('');
    onUploadedByChange('');
    onAddedByChange('');
    onUploadedOnChange(undefined);
    onRecordedOnChange(undefined);
  };

  // Get label for filter value
  const getFilterLabel = (options: { value: string; label: string }[], value: string) => {
    const option = options.find(opt => opt.value === value);
    return option?.label || value;
  };

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
          <h3 
            className="text-foreground mb-2"
            style={{
              fontSize: 'var(--text-h4)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Filters
          </h3>
        </div>

        {/* Applied Filters Section */}
        {showAppliedFilters && (
          <div 
            className="space-y-3"
            style={{
              paddingBottom: '12px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between">
              <h4 
                className="text-foreground"
                style={{
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                }}
              >
                Applied Filters
              </h4>
              <button
                onClick={clearAllFilters}
                className="text-muted-foreground hover:text-foreground transition-colors"
                style={{
                  fontSize: 'var(--text-caption)',
                  fontWeight: 'var(--font-weight-medium)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                }}
              >
                Clear all
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedOwner && (
                <div className="inline-flex flex-col gap-1">
                  <label 
                    className="text-muted-foreground"
                    style={{
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Owner
                  </label>
                  <Pill
                    variant="dismissible"
                    onDismiss={() => clearFilter('owner')}
                  >
                    {getFilterLabel(ownerOptions, selectedOwner)}
                  </Pill>
                </div>
              )}

              {selectedUploadedBy && (
                <div className="inline-flex flex-col gap-1">
                  <label 
                    className="text-muted-foreground"
                    style={{
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Uploaded By
                  </label>
                  <Pill
                    variant="dismissible"
                    onDismiss={() => clearFilter('uploadedBy')}
                  >
                    {getFilterLabel(uploadedByOptions, selectedUploadedBy)}
                  </Pill>
                </div>
              )}

              {selectedAddedBy && (
                <div className="inline-flex flex-col gap-1">
                  <label 
                    className="text-muted-foreground"
                    style={{
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Added By
                  </label>
                  <Pill
                    variant="dismissible"
                    onDismiss={() => clearFilter('addedBy')}
                  >
                    {getFilterLabel(addedByOptions, selectedAddedBy)}
                  </Pill>
                </div>
              )}

              {uploadedOnDate && (
                <div className="inline-flex flex-col gap-1">
                  <label 
                    className="text-muted-foreground"
                    style={{
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Uploaded On
                  </label>
                  <Pill
                    variant="dismissible"
                    onDismiss={() => clearFilter('uploadedOn')}
                  >
                    {format(uploadedOnDate, 'MMM d, yyyy')}
                  </Pill>
                </div>
              )}

              {recordedOnDate && (
                <div className="inline-flex flex-col gap-1">
                  <label 
                    className="text-muted-foreground"
                    style={{
                      fontSize: 'var(--text-caption)',
                      fontWeight: 'var(--font-weight-medium)',
                    }}
                  >
                    Recorded On
                  </label>
                  <Pill
                    variant="dismissible"
                    onDismiss={() => clearFilter('recordedOn')}
                  >
                    {format(recordedOnDate, 'MMM d, yyyy')}
                  </Pill>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User or Group Section */}
        <Collapsible open={isUserGroupOpen} onOpenChange={setIsUserGroupOpen}>
          <CollapsibleTrigger 
            className="flex items-center justify-between w-full"
            style={{
              padding: '8px 0',
              cursor: 'pointer',
            }}
          >
            <span 
              className="text-foreground"
              style={{
                fontSize: 'var(--text-p)',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              User or Group
            </span>
            {isUserGroupOpen ? (
              <ChevronUp size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4" style={{ paddingTop: '12px' }}>
            {/* Owner Combobox */}
            <div className="space-y-2">
              <label 
                className="text-foreground"
                style={{
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  display: 'block',
                }}
              >
                Owner
              </label>
              <Combobox
                options={ownerOptions}
                value={selectedOwner}
                onValueChange={handleOwnerChange}
                placeholder=""
                searchPlaceholder="Search owners..."
                emptyText="No owners found."
              />
            </div>

            {/* Uploaded By Combobox */}
            <div className="space-y-2">
              <label 
                className="text-foreground"
                style={{
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  display: 'block',
                }}
              >
                Uploaded By
              </label>
              <Combobox
                options={uploadedByOptions}
                value={selectedUploadedBy}
                onValueChange={handleUploadedByChange}
                placeholder=""
                searchPlaceholder="Search uploaders..."
                emptyText="No uploaders found."
              />
            </div>

            {/* Added By Combobox */}
            <div className="space-y-2">
              <label 
                className="text-foreground"
                style={{
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  display: 'block',
                }}
              >
                Added By
              </label>
              <Combobox
                options={addedByOptions}
                value={selectedAddedBy}
                onValueChange={handleAddedByChange}
                placeholder=""
                searchPlaceholder="Search adders..."
                emptyText="No adders found."
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
        <Separator />
        {/* Date and Time Section */}
        <Collapsible open={isDateTimeOpen} onOpenChange={setIsDateTimeOpen}>
          <CollapsibleTrigger 
            className="flex items-center justify-between w-full"
            style={{
              padding: '8px 0',
              cursor: 'pointer',
            }}
          >
            <span 
              className="text-foreground"
              style={{
                fontSize: 'var(--text-p)',
                fontWeight: 'var(--font-weight-medium)',
              }}
            >
              Date and Time
            </span>
            {isDateTimeOpen ? (
              <ChevronUp size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground" />
            )}
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-4" style={{ paddingTop: '12px' }}>
            {/* Uploaded On Date Picker */}
            <div className="space-y-2">
              <label 
                className="text-foreground"
                style={{
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  display: 'block',
                }}
              >
                Uploaded On
              </label>
              <DatePicker
                date={uploadedOnDate}
                onDateChange={handleUploadedOnChange}
                placeholder="Select date..."
              />
            </div>

            {/* Recorded On Date Picker */}
            <div className="space-y-2">
              <label 
                className="text-foreground"
                style={{
                  fontSize: 'var(--text-label)',
                  fontWeight: 'var(--font-weight-semibold)',
                  display: 'block',
                }}
              >
                Recorded On
              </label>
              <DatePicker
                date={recordedOnDate}
                onDateChange={handleRecordedOnChange}
                placeholder="Select date..."
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}