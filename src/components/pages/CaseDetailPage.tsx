import React, { useState, useMemo, useEffect, Suspense } from 'react';
import { useParams, Navigate, useSearchParams } from 'react-router-dom';
import { getCaseById } from '../../data/mockCases';
import { getEvidenceByCaseId } from '../../data/mockEvidence';
import { Case, FileType } from '../../data/types';
import { CaseHeader } from '../CaseHeader';
import { CaseActions } from '../CaseActions';
import { ViewSwitcher, ViewMode } from '../ViewSwitcher';
import { EvidenceTable } from '../EvidenceTable';
import { CaseEvidenceList } from '../CaseEvidenceList';
import { MediaGallery } from '../MediaGallery';
import { FilterPanel } from '../FilterPanel';
import { QuickViewsPanel } from '../QuickViewsPanel';
import { ShareDialog } from '../ShareDialog';
import { PolicyDetails } from '../PolicyDetails';
import { ActionBar } from '../ActionBar';
import { CaseDetailLoadingSkeleton } from '../CaseDetailLoadingSkeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { useIsMobile } from '../ui/use-mobile';
import { Share2, Eye, Edit3 } from 'lucide-react';
import { countActiveFilters } from '../../utils/filterHelpers';

export function CaseDetailPage() {
  const { caseId } = useParams<{ caseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  
  // Loading state for simulating data fetch
  const [isLoading, setIsLoading] = useState(true);
  
  // State to track sharing updates
  const [sharingUpdated, setSharingUpdated] = useState(0);
  
  // Find the case by caseId (re-fetch when sharing is updated)
  const case_: Case | undefined = useMemo(() => {
    return getCaseById(caseId || '');
  }, [caseId, sharingUpdated]);
  
  // Get evidence associated with this case - memoized to prevent recalculation
  const caseEvidence = useMemo(() => {
    return getEvidenceByCaseId(caseId || '');
  }, [caseId]);

  // State for file type filters - initialize from URL params
  const [selectedFileTypes, setSelectedFileTypes] = useState<FileType[]>(() => {
    const filtersParam = searchParams.get('filters');
    if (filtersParam) {
      try {
        const parsed = JSON.parse(filtersParam);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  
  // State for owner filters - initialize from URL params
  const [selectedOwners, setSelectedOwners] = useState<string[]>(() => {
    const ownersParam = searchParams.get('owners');
    if (ownersParam) {
      try {
        const parsed = JSON.parse(ownersParam);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  
  // State for ID filters
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // State for User/Group filters
  const [selectedOwnerFilter, setSelectedOwnerFilter] = useState<string>('');
  const [selectedUploadedByFilter, setSelectedUploadedByFilter] = useState<string>('');
  const [selectedAddedByFilter, setSelectedAddedByFilter] = useState<string>('');
  
  // State for Date and Time filters
  const [uploadedOnDate, setUploadedOnDate] = useState<Date | undefined>(undefined);
  const [recordedOnDate, setRecordedOnDate] = useState<Date | undefined>(undefined);
  
  // State for view mode with persistence
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    // Load saved view mode for this case from localStorage
    const savedViewMode = localStorage.getItem(`caseViewMode_${caseId}`);
    return (savedViewMode as ViewMode) || 'table';
  });
  
  // State for filter panel
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  // State for quick views panel with persistence
  const [isQuickViewsPanelOpen, setIsQuickViewsPanelOpen] = useState(() => {
    // Load saved quick views panel state for this case from localStorage
    const savedState = localStorage.getItem(`quickViewsPanelOpen_${caseId}`);
    return savedState === 'true';
  });
  
  // State for share dialog
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  
  // State for policy details drawer
  const [policyDetailsOpen, setPolicyDetailsOpen] = useState(false);
  const [selectedPolicyName, setSelectedPolicyName] = useState<string>('');
  
  // State for evidence selection (table uses indices, gallery uses unique keys)
  const [selectedEvidenceItems, setSelectedEvidenceItems] = useState<Set<number>>(new Set());
  const [selectedGalleryItems, setSelectedGalleryItems] = useState<Set<string>>(new Set());

  // Get unique owners from case evidence
  const uniqueOwners = useMemo(() => {
    const owners = new Set<string>();
    caseEvidence.forEach(evidence => {
      if (evidence.owner) {
        owners.add(evidence.owner);
      }
    });
    return Array.from(owners).sort();
  }, [caseEvidence]);

  // Get unique IDs from case evidence
  const uniqueIds = useMemo(() => {
    const ids = new Set<string>();
    caseEvidence.forEach(evidence => {
      if (evidence.id) {
        ids.add(evidence.id);
      }
    });
    return Array.from(ids).sort();
  }, [caseEvidence]);

  // Get available file types from case evidence
  const availableFileTypes = useMemo(() => {
    const types = new Set<FileType>();
    caseEvidence.forEach(evidence => {
      types.add(evidence.fileType);
    });
    return Array.from(types);
  }, [caseEvidence]);

  // Calculate counts for each file type
  const fileTypeCounts = useMemo(() => {
    const counts: Record<FileType, number> = {
      video: 0,
      audio: 0,
      image: 0,
      zip: 0,
      other: 0
    };
    caseEvidence.forEach(evidence => {
      counts[evidence.fileType] = (counts[evidence.fileType] || 0) + 1;
    });
    return counts;
  }, [caseEvidence]);

  // Calculate counts for each owner
  const ownerCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    caseEvidence.forEach(evidence => {
      if (evidence.owner) {
        counts[evidence.owner] = (counts[evidence.owner] || 0) + 1;
      }
    });
    return counts;
  }, [caseEvidence]);

  // Calculate counts for each ID
  const idCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    caseEvidence.forEach(evidence => {
      if (evidence.id) {
        counts[evidence.id] = (counts[evidence.id] || 0) + 1;
      }
    });
    return counts;
  }, [caseEvidence]);

  // Get unique values for filter dropdowns
  const ownerOptions = useMemo(() => {
    const owners = new Set<string>();
    caseEvidence.forEach(evidence => {
      if (evidence.owner) {
        owners.add(evidence.owner);
      }
    });
    return Array.from(owners).sort().map(owner => ({ value: owner, label: owner }));
  }, [caseEvidence]);

  const uploadedByOptions = useMemo(() => {
    const uploaders = new Set<string>();
    caseEvidence.forEach(evidence => {
      if (evidence.uploadedBy) {
        uploaders.add(evidence.uploadedBy);
      }
    });
    return Array.from(uploaders).sort().map(uploader => ({ value: uploader, label: uploader }));
  }, [caseEvidence]);

  const addedByOptions = useMemo(() => {
    const adders = new Set<string>();
    caseEvidence.forEach(evidence => {
      if (evidence.addedBy) {
        adders.add(evidence.addedBy);
      }
    });
    return Array.from(adders).sort().map(adder => ({ value: adder, label: adder }));
  }, [caseEvidence]);

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

  // Filter evidence based on selected file types and owners
  const filteredEvidence = useMemo(() => {
    let filtered = caseEvidence;
    
    // Apply file type filter
    if (selectedFileTypes.length > 0) {
      filtered = filtered.filter(evidence => selectedFileTypes.includes(evidence.fileType));
    }
    
    // Apply owner filter
    if (selectedOwners.length > 0) {
      filtered = filtered.filter(evidence => selectedOwners.includes(evidence.owner));
    }
    
    // Apply ID filter
    if (selectedIds.length > 0) {
      filtered = filtered.filter(evidence => selectedIds.includes(evidence.id));
    }
    
    // Apply owner filter from FilterPanel
    if (selectedOwnerFilter) {
      filtered = filtered.filter(evidence => evidence.owner === selectedOwnerFilter);
    }
    
    // Apply uploadedBy filter
    if (selectedUploadedByFilter) {
      filtered = filtered.filter(evidence => evidence.uploadedBy === selectedUploadedByFilter);
    }
    
    // Apply addedBy filter
    if (selectedAddedByFilter) {
      filtered = filtered.filter(evidence => evidence.addedBy === selectedAddedByFilter);
    }
    
    return filtered;
  }, [caseEvidence, selectedFileTypes, selectedOwners, selectedIds, selectedOwnerFilter, selectedUploadedByFilter, selectedAddedByFilter]);

  // Handle file type toggle
  const handleFileTypeToggle = (fileType: FileType) => {
    setSelectedFileTypes(prev => 
      prev.includes(fileType)
        ? prev.filter(type => type !== fileType)
        : [...prev, fileType]
    );
  };

  // Handle owner toggle
  const handleOwnerToggle = (owner: string) => {
    setSelectedOwners(prev => 
      prev.includes(owner)
        ? prev.filter(o => o !== owner)
        : [...prev, owner]
    );
  };

  // Handle ID toggle
  const handleIdToggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id)
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSelectedFileTypes([]);
    setSelectedOwners([]);
    setSelectedIds([]);
    // Clear FilterPanel filters
    setSelectedOwnerFilter('');
    setSelectedUploadedByFilter('');
    setSelectedAddedByFilter('');
    setUploadedOnDate(undefined);
    setRecordedOnDate(undefined);
  };

  // Handle view mode change
  const handleViewModeChange = (newViewMode: ViewMode) => {
    setViewMode(newViewMode);
    // Clear selections when switching views
    setSelectedEvidenceItems(new Set());
    setSelectedGalleryItems(new Set());
  };

  // Persist view mode changes to localStorage
  useEffect(() => {
    if (caseId) {
      localStorage.setItem(`caseViewMode_${caseId}`, viewMode);
    }
  }, [viewMode, caseId]);

  // Persist quick views panel state to localStorage
  useEffect(() => {
    if (caseId) {
      localStorage.setItem(`quickViewsPanelOpen_${caseId}`, isQuickViewsPanelOpen.toString());
    }
  }, [isQuickViewsPanelOpen, caseId]);

  // Persist filter state to URL params
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams);
    
    if (selectedFileTypes.length > 0) {
      newParams.set('filters', JSON.stringify(selectedFileTypes));
    } else {
      newParams.delete('filters');
    }
    
    if (selectedOwners.length > 0) {
      newParams.set('owners', JSON.stringify(selectedOwners));
    } else {
      newParams.delete('owners');
    }
    
    setSearchParams(newParams, { replace: true });
  }, [selectedFileTypes, selectedOwners]);

  // Handle filter panel toggle
  const handleFilterPanelToggle = () => {
    setIsFilterPanelOpen(prev => !prev);
  };

  // Handle quick views panel toggle
  const handleQuickViewsPanelToggle = () => {
    setIsQuickViewsPanelOpen(prev => !prev);
  };

  // Handle share dialog
  const handleShare = () => {
    setShareDialogOpen(true);
  };

  const handleShareClose = () => {
    setShareDialogOpen(false);
  };

  const handleShareConfirm = () => {
    // Trigger a re-render by updating the sharing state
    setSharingUpdated(prev => prev + 1);
  };

  // Handle policy details drawer
  const handleOpenPolicyDetails = (policyName: string) => {
    // Close the share dialog first to avoid conflicts
    setShareDialogOpen(false);
    // Then open the policy details drawer
    setSelectedPolicyName(policyName);
    setPolicyDetailsOpen(true);
  };

  const handleClosePolicyDetails = () => {
    setPolicyDetailsOpen(false);
    setSelectedPolicyName('');
  };

  // Handle back to share from policy details
  const handleBackToShare = () => {
    setPolicyDetailsOpen(false);
    setSelectedPolicyName('');
    setShareDialogOpen(true);
  };

  // Handle evidence selection change
  const handleEvidenceSelectionChange = (selectedItems: Set<number>) => {
    setSelectedEvidenceItems(selectedItems);
  };

  // Action bar handlers
  const handleShareSelected = () => {
    console.log('Share selected items:', selectedEvidenceItems);
    // TODO: Implement share functionality
  };

  const handleReview = () => {
    console.log('Review selected items:', selectedEvidenceItems);
    // TODO: Implement review functionality
  };

  const handleClearSelection = () => {
    setSelectedEvidenceItems(new Set());
    setSelectedGalleryItems(new Set());
  };

  // Define evidence actions for ActionBar
  const evidenceActions = [
    {
      key: 'share',
      label: 'Share',
      icon: <Share2 size={14} className="mr-1.5" />,
      onClick: handleShareSelected
    },
    {
      key: 'review',
      label: 'Review',
      icon: <Eye size={14} className="mr-1.5" />,
      onClick: handleReview
    },
    {
      key: 'edit-metadata',
      label: 'Edit metadata',
      hasDropdown: true,
      dropdownItems: [
        {
          key: 'edit-id',
          label: 'ID',
          onClick: () => console.log(`Edit ID action triggered for ${selectedEvidenceItems.size} items`)
        },
        {
          key: 'edit-category',
          label: 'Category', 
          onClick: () => console.log(`Edit Category action triggered for ${selectedEvidenceItems.size} items`)
        },
        {
          key: 'edit-tag',
          label: 'Tag',
          onClick: () => console.log(`Edit Tag action triggered for ${selectedEvidenceItems.size} items`)
        },
        {
          key: 'edit-evidence-group',
          label: 'Evidence Group',
          onClick: () => console.log(`Edit Evidence Group action triggered for ${selectedEvidenceItems.size} items`)
        }
      ]
    }
  ];

  // Simulate loading delay when case changes
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [caseId]);

  // If case is not found, redirect to cases page
  if (!case_) {
    return <Navigate to="/cases" replace />;
  }

  // Early return with loading if caseId is missing
  if (!caseId) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">
            Invalid case ID
          </p>
        </div>
      </div>
    );
  }

  // Show loading state while case evidence is being fetched
  if (isLoading) {
    return <CaseDetailLoadingSkeleton />;
  }

  return (
    <div className="p-4 md:p-6">
      <CaseHeader case_={case_} onShare={handleShare} />
      
      {/* Tab navigation for case details */}
      <div className="mt-6">
        <Tabs defaultValue="evidence" className="w-full gap-6">
          <TabsList className="flex w-full">
            <TabsTrigger value="evidence">
              Evidence {caseEvidence.length}
            </TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            {/* Invisible stretching tab to fill remaining space */}
            <div className="flex-1 border-b-2 border-transparent"></div>
          </TabsList>
          
          <TabsContent value="evidence" className="space-y-4">
            <CaseActions 
              selectedFileTypes={selectedFileTypes}
              onFileTypeToggle={handleFileTypeToggle}
              onClearFilters={handleClearFilters}
              isFilterPanelOpen={isFilterPanelOpen}
              onFilterPanelToggle={handleFilterPanelToggle}
              isQuickViewsPanelOpen={isQuickViewsPanelOpen}
              onQuickViewsPanelToggle={handleQuickViewsPanelToggle}
              selectedOwners={selectedOwners}
              activeFilterCount={activeFilterCount}
            />
            
            {/* Main Content Area */}
            <div className="space-y-4">
              {/* View switcher and results count container */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Results count */}
                  <p className="text-muted-foreground">
                    {(selectedFileTypes.length > 0 || selectedOwners.length > 0 || selectedIds.length > 0)
                      ? `${filteredEvidence.length} of ${caseEvidence.length} items`
                      : `${caseEvidence.length} items`
                    }
                  </p>
                </div>
                
                {/* View switcher - Desktop only */}
                {!isMobile && (
                  <ViewSwitcher 
                    viewMode={viewMode}
                    onViewModeChange={handleViewModeChange}
                  />
                )}
              </div>
              
              {/* Evidence Content - Mobile List, Desktop Table/Gallery with Panels */}
              {isMobile ? (
                <CaseEvidenceList 
                  evidence={filteredEvidence}
                  caseId={caseId || ''}
                  selectedItems={selectedEvidenceItems}
                  onSelectionChange={handleEvidenceSelectionChange}
                />
              ) : (
                <div className="flex">
                  {/* Quick Views Panel - always rendered but animated */}
                  <QuickViewsPanel 
                    isOpen={isQuickViewsPanelOpen}
                    selectedFileTypes={selectedFileTypes}
                    onFileTypeToggle={handleFileTypeToggle}
                    owners={uniqueOwners}
                    selectedOwners={selectedOwners}
                    onOwnerToggle={handleOwnerToggle}
                    ids={uniqueIds}
                    selectedIds={selectedIds}
                    onIdToggle={handleIdToggle}
                    availableFileTypes={availableFileTypes}
                    fileTypeCounts={fileTypeCounts}
                    ownerCounts={ownerCounts}
                    idCounts={idCounts}
                  />
                  
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
                  <div className="flex-1">
                    {viewMode === 'table' ? (
                      <EvidenceTable 
                        evidence={filteredEvidence}
                        selectedItems={selectedEvidenceItems}
                        onSelectionChange={handleEvidenceSelectionChange}
                        caseId={caseId}
                      />
                    ) : (
                      <MediaGallery 
                        evidence={filteredEvidence}
                        caseId={caseId}
                        allEvidence={caseEvidence}
                        selectedItems={selectedGalleryItems}
                        onSelectionChange={setSelectedGalleryItems}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="notes">
            {/* Notes content will be added here */}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Share Dialog */}
      <ShareDialog 
        isOpen={shareDialogOpen}
        onClose={handleShareClose}
        caseId={case_.caseId}
        onShare={handleShareConfirm}
        onOpenPolicyDetails={handleOpenPolicyDetails}
      />
      
      {/* Action Bar - appears when items are selected */}
      {(selectedEvidenceItems.size > 0 || selectedGalleryItems.size > 0) && (
        <ActionBar
          selectedCount={viewMode === 'table' ? selectedEvidenceItems.size : selectedGalleryItems.size}
          actions={evidenceActions}
          onClearSelection={handleClearSelection}
          pageType="case-detail"
        />
      )}
      
      {/* Policy Details Drawer */}
      <PolicyDetails 
        isOpen={policyDetailsOpen}
        onClose={handleClosePolicyDetails}
        policyName={selectedPolicyName}
        onBackToShare={handleBackToShare}
      />
    </div>
  );
}