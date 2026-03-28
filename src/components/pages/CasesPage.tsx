import React, { useState, useMemo } from 'react';
import { CasesTable } from '../CasesTable';
import { CasesList } from '../CasesList';
import { SearchBar } from '../SearchBar';
import { CasesPageActions } from '../CasesPageActions';
import { ActionBar } from '../ActionBar';
import { getAllCasesWithSharingStatus } from '../../data/mockCases';
import { filterCases } from '../../data/searchHelpers';
import { useIsMobile } from '../ui/use-mobile';
import { UserX, Users, AlertCircle } from 'lucide-react';

export function CasesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useIsMobile();
  
  // State for case selection
  const [selectedCaseItems, setSelectedCaseItems] = useState<Set<number>>(new Set());
  
  // Force re-render to show updated sharing status when returning to page
  const [refreshKey, setRefreshKey] = useState(0);
  
  React.useEffect(() => {
    const handleFocus = () => {
      setRefreshKey(prev => prev + 1);
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Get cases with sharing status (refresh when key changes)
  const casesWithSharingStatus = useMemo(() => {
    return getAllCasesWithSharingStatus();
  }, [refreshKey]);

  // Filter cases based on search query
  const filteredCases = useMemo(() => {
    return filterCases(casesWithSharingStatus, searchQuery);
  }, [searchQuery, casesWithSharingStatus]);

  // Calculate results summary
  const resultsCount = filteredCases.length;
  const totalCount = casesWithSharingStatus.length;
  const showingFiltered = searchQuery.trim() !== '';

  // Handle case selection change
  const handleCaseSelectionChange = (selectedItems: Set<number>) => {
    setSelectedCaseItems(selectedItems);
  };

  // Action handlers
  const handleCreateCase = () => {
    // TODO: Implement create case functionality
    console.log('Create case clicked');
  };

  const handleExportResults = () => {
    // TODO: Implement export results functionality
    const selectedCases = Array.from(selectedCaseItems).map(index => filteredCases[index]);
    console.log('Export results clicked', { selectedCount: selectedCaseItems.size, selectedCases });
  };

  // Case ActionBar handlers
  const handleReassign = () => {
    const selectedCases = Array.from(selectedCaseItems).map(index => filteredCases[index]);
    console.log('Reassign cases:', selectedCases);
    // TODO: Implement reassign functionality
  };

  const handleManageAccess = () => {
    const selectedCases = Array.from(selectedCaseItems).map(index => filteredCases[index]);
    console.log('Manage access for cases:', selectedCases);
    // TODO: Implement manage access functionality
  };

  const handleUpdateStatus = () => {
    const selectedCases = Array.from(selectedCaseItems).map(index => filteredCases[index]);
    console.log('Update status for cases:', selectedCases);
    // TODO: Implement update status functionality
  };

  const handleClearCaseSelection = () => {
    setSelectedCaseItems(new Set());
  };

  // Define case actions for ActionBar
  const caseActions = [
    {
      key: 'reassign',
      label: 'Reassign',
      icon: <UserX size={14} className="mr-1.5" />,
      onClick: handleReassign
    },
    {
      key: 'manage-access',
      label: 'Manage Access',
      icon: <Users size={14} className="mr-1.5" />,
      onClick: handleManageAccess
    },
    {
      key: 'update-status',
      label: 'Update Status',
      icon: <AlertCircle size={14} className="mr-1.5" />,
      onClick: handleUpdateStatus
    }
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header Section with Search and Actions - Responsive layout */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-4">
        <div className="flex-1 space-y-2">
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full md:max-w-md"
          />
          {showingFiltered && (
            <p className="text-muted-foreground caption">
              Showing {resultsCount} of {totalCount} cases
              {resultsCount === 0 && ' - try adjusting your search terms'}
            </p>
          )}
        </div>
        
        {/* Page Actions */}
        <div className="flex-shrink-0">
          <CasesPageActions 
            onCreateCase={handleCreateCase}
            onExportResults={handleExportResults}
            selectedCount={selectedCaseItems.size}
          />
        </div>
      </div>

      {/* Cases Table (Desktop) / Cases List (Mobile) */}
      {isMobile ? (
        <CasesList 
          cases={filteredCases} 
          selectedItems={selectedCaseItems}
          onSelectionChange={handleCaseSelectionChange}
        />
      ) : (
        <CasesTable 
          cases={filteredCases} 
          selectedItems={selectedCaseItems}
          onSelectionChange={handleCaseSelectionChange}
        />
      )}

      {/* Action Bar for selected cases */}
      <ActionBar
        selectedCount={selectedCaseItems.size}
        actions={caseActions}
        onClearSelection={handleClearCaseSelection}
        pageType="cases"
      />
    </div>
  );
}