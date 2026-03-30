import React, { useState, useMemo } from 'react';
import { EvidenceSearchTable } from '../EvidenceSearchTable';
import { EvidenceList } from '../EvidenceList';
import { EvidenceGallery } from '../EvidenceGallery';
import { SearchBar } from '../SearchBar';
import { ActionBar } from '../ActionBar';
import { ViewSwitcher, ViewMode } from '../ViewSwitcher';
import { EvidenceFilters } from '../EvidenceFilters';
import { FilterPanel } from '../FilterPanel';
import { AssistantPanel } from '../AssistantPanel';
import { EditCategoryDialog } from '../EditCategoryDialog';
import { useGraphEvidence } from '../../data/graphEvidence';
import { deleteEvidence } from '../../data/deleteEvidence';
import { filterEvidence } from '../../data/searchHelpers';
import { useIsMobile } from '../ui/use-mobile';
import { countActiveFilters } from '../../utils/filterHelpers';

export function EvidencePage() {
  const evidence = useGraphEvidence();
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editCategoryDialogOpen, setEditCategoryDialogOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const isMobile = useIsMobile();
  
  // State for User/Group filters
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>('');
  const [selectedUploadedByFilter, setSelectedUploadedByFilter] = useState<string>('');
  const [selectedAddedByFilter, setSelectedAddedByFilter] = useState<string>('');
  
  // State for Date and Time filters
  const [uploadedOnDate, setUploadedOnDate] = useState<Date | undefined>(undefined);
  const [recordedOnDate, setRecordedOnDate] = useState<Date | undefined>(undefined);
  
  // State for view mode with persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load saved view mode from localStorage
    const savedViewMode = localStorage.getItem('evidencePageViewMode');
    return (savedViewMode as ViewMode) || 'table';
  });

  // Save view mode changes to localStorage
  const handleViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode);
    localStorage.setItem('evidencePageViewMode', newViewMode);
  };

  // Handle filter panel toggle
  const handleFilterPanelToggle = () => {
    setIsFilterPanelOpen(prev => !prev);
  };

  // Filter evidence based on search query
  const filteredEvidence = useMemo(() => {
    return filterEvidence(evidence, searchQuery);
  }, [evidence, searchQuery]);

  // Get unique values for filter dropdowns
  const ownerOptions = useMemo(() => {
    const owners = new Set<string>();
    evidence.forEach(evidence => {
      if (evidence.owner) {
        owners.add(evidence.owner);
      }
    });
    return Array.from(owners).sort().map(owner => ({ value: owner, label: owner }));
  }, [evidence]);

  const uploadedByOptions = useMemo(() => {
    const uploaders = new Set<string>();
    evidence.forEach(evidence => {
      if (evidence.uploadedBy) {
        uploaders.add(evidence.uploadedBy);
      }
    });
    return Array.from(uploaders).sort().map(uploader => ({ value: uploader, label: uploader }));
  }, [evidence]);

  const addedByOptions = useMemo(() => {
    const adders = new Set<string>();
    evidence.forEach(evidence => {
      if (evidence.addedBy) {
        adders.add(evidence.addedBy);
      }
    });
    return Array.from(adders).sort().map(adder => ({ value: adder, label: adder }));
  }, [evidence]);

  // Calculate active filter count from FilterPanel
  const activeFilterCount = useMemo(() => {
    return countActiveFilters({
      selectedOwner: selectedOwnerFilter,
      selectedUploadedBy: selectedUploadedByFilter,
      selectedAddedBy: selectedAddedByFilter,
      uploadedOnDate,
      recordedOnDate
    });
  }, [selectedOwnerFilter, selectedUploadedByFilter, selectedAddedByFilter, uploadedOnDate, recordedOnDate]);

  // Calculate results summary
  const resultsCount = filteredEvidence.length;
  const totalCount = evidence.length;
  const showingFiltered = searchQuery.trim() !== '';

  // Delete all selected items
  const handleDeleteSelected = async () => {
    const toDelete = evidence.filter(e => selectedItems.has(e.uuid));
    await Promise.all(toDelete.map(e => deleteEvidence(e.uuid, e.vector_file_id)));
    setSelectedItems(new Set());
  };

  // Evidence action definitions
  const evidenceActions = [
    {
      key: 'delete',
      label: 'Delete',
      onClick: handleDeleteSelected,
    },
    {
      key: 'review',
      label: 'Review', 
      onClick: () => console.log(`Review action triggered for ${selectedItems.size} items`)
    },
    { 
      key: 'edit-metadata',
      label: 'Edit metadata',
      hasDropdown: true,
      dropdownItems: [
        {
          key: 'edit-id',
          label: 'ID',
          onClick: () => console.log(`Edit ID action triggered for ${selectedItems.size} items`)
        },
        {
          key: 'edit-category',
          label: 'Category',
          onClick: () => setEditCategoryDialogOpen(true)
        },
        {
          key: 'edit-tag',
          label: 'Tag',
          onClick: () => console.log(`Edit Tag action triggered for ${selectedItems.size} items`)
        },
        {
          key: 'edit-evidence-group',
          label: 'Evidence Group',
          onClick: () => console.log(`Edit Evidence Group action triggered for ${selectedItems.size} items`)
        }
      ]
    },
    { 
      key: 'manage-access',
      label: 'Manage access', 
      onClick: () => console.log(`Manage access action triggered for ${selectedItems.size} items`)
    },
    { 
      key: 'evidence-actions',
      label: 'Evidence actions', 
      onClick: () => console.log(`Evidence actions triggered for ${selectedItems.size} items`)
    },
  ];

  const isAssistantOpen = selectedItems.size > 0;

  return (
    <div className="relative min-h-full flex">
      {/* Main content — shrinks when assistant panel opens */}
      <div className="flex-1 min-w-0 p-4 md:p-8">
        <div className="space-y-6">
          {/* Search and Button Section - Responsive layout */}
          <div className="flex flex-col gap-4 md:grid md:grid-cols-12 md:gap-4">
            {/* Search Column - Full width on mobile, 8/12 on desktop */}
            <div className="md:col-span-8 space-y-2">
              {/* Search Bar */}
              <SearchBar
                placeholder="Search evidence by title, owner, case ID, status..."
                value={searchQuery}
                onChange={setSearchQuery}
                className="w-full"
              />

              {/* Search Results Summary */}
              {showingFiltered && (
                <p className="text-muted-foreground caption">
                  Showing {resultsCount} of {totalCount} evidence items
                  {resultsCount === 0 && ' - try adjusting your search terms'}
                </p>
              )}
            </div>

            <div className="md:col-span-4" />
          </div>

          {/* Filter Controls and View Switcher - Desktop only */}
          {!isMobile && (
            <div className="flex items-center justify-between">
              <EvidenceFilters
                isFilterPanelOpen={isFilterPanelOpen}
                onFilterPanelToggle={handleFilterPanelToggle}
                activeFilterCount={activeFilterCount}
              />
              <ViewSwitcher
                viewMode={viewMode}
                onViewModeChange={handleViewModeChange}
              />
            </div>
          )}

          {/* Evidence Content - Mobile List, Desktop Table/Gallery with Filter Panel */}
          {isMobile ? (
            <EvidenceList
              evidence={filteredEvidence}
              selectedItems={selectedItems}
              onSelectionChange={setSelectedItems}
            />
          ) : (
            <div className="flex">
              {/* Filter Panel - always rendered but animated */}
              <FilterPanel
                isOpen={isFilterPanelOpen}
                ownerOptions={ownerOptions}
                uploadedByOptions={uploadedByOptions}
                addedByOptions={addedByOptions}
                selectedOwner={selectedOwnerFilter}
                selectedUploadedBy={selectedUploadedByFilter}
                selectedAddedBy={selectedAddedByFilter}
                onOwnerChange={setSelectedOwnerFilter}
                onUploadedByChange={setSelectedUploadedByFilter}
                onAddedByChange={setSelectedAddedByFilter}
                uploadedOnDate={uploadedOnDate}
                recordedOnDate={recordedOnDate}
                onUploadedOnChange={setUploadedOnDate}
                onRecordedOnChange={setRecordedOnDate}
              />

              {/* Evidence content */}
              <div className="flex-1 min-w-0">
                {viewMode === 'table' ? (
                  <EvidenceSearchTable
                    evidence={filteredEvidence}
                    selectedItems={selectedItems}
                    onSelectionChange={setSelectedItems}
                  />
                ) : (
                  <EvidenceGallery
                    evidence={filteredEvidence}
                    selectedItems={selectedItems}
                    onSelectionChange={setSelectedItems}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assistant Panel — slides in from the right when items are selected */}
      <AssistantPanel
        isOpen={isAssistantOpen}
        items={filteredEvidence
          .filter(e => selectedItems.has(e.uuid))
          .map(e => ({
            id: e.uuid,
            title: e.title,
            vector_file_id: e.vector_file_id,
            description: e.description,
            category: e.category,
            officer: e.owner,
            date_recorded: e.recordedOn.toISOString(),
            media_class: e.fileType,
            objects_detected: e.objects_detected?.map(o => `${o.color ? o.color + ' ' : ''}${o.label}`).join(', '),
          }))}
        onClose={() => setSelectedItems(new Set())}
      />

      {/* Action Bar - appears when items are selected */}
      {selectedItems.size > 0 && (
        <ActionBar
          selectedCount={selectedItems.size}
          actions={evidenceActions}
          onClearSelection={() => setSelectedItems(new Set())}
          pageType="evidence"
        />
      )}

      {/* Edit Category Dialog */}
      <EditCategoryDialog
        open={editCategoryDialogOpen}
        onOpenChange={setEditCategoryDialogOpen}
        selectedCount={selectedItems.size}
      />

    </div>
  );
}