import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from './ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Checkbox } from './ui/checkbox';
import { ArrowUpAZ, ArrowDownAZ, ArrowDownUp, Users } from 'lucide-react';
import { Case } from '../data/types';

interface CasesTableProps {
  cases?: Case[];
  selectedItems?: Set<number>;
  onSelectionChange?: (selectedItems: Set<number>) => void;
}

type SortColumn = keyof Case;
type SortDirection = 'asc' | 'desc' | null;

export function CasesTable({ 
  cases = [], 
  selectedItems: externalSelectedItems,
  onSelectionChange
}: CasesTableProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<number>>(new Set());
  
  // Use external selection state if provided, otherwise use internal state
  const selectedItems = externalSelectedItems || internalSelectedItems;
  const setSelectedItems = onSelectionChange || setInternalSelectedItems;

  // Sort cases based on current sort settings
  const sortedCases = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return cases;
    }

    return [...cases].sort((a, b) => {
      let aValue = a[sortColumn];
      let bValue = b[sortColumn];

      // Handle date sorting
      if (aValue instanceof Date && bValue instanceof Date) {
        const comparison = aValue.getTime() - bValue.getTime();
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Handle string sorting (case insensitive)
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
        return sortDirection === 'asc' ? comparison : -comparison;
      }

      // Fallback for other types
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [cases, sortColumn, sortDirection]);

  // Calculate pagination values
  const totalPages = Math.ceil(sortedCases.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCases = sortedCases.slice(startIndex, endIndex);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Generate page numbers for pagination
  const getPageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('ellipsis');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('ellipsis');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value);
    setItemsPerPage(newItemsPerPage);
    // Reset to first page when changing items per page
    setCurrentPage(1);
  };

  // Handle column sorting
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      // If clicking the same column, cycle through: asc -> desc -> none
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      }
    } else {
      // If clicking a new column, start with ascending
      setSortColumn(column);
      setSortDirection('asc');
      setCurrentPage(1); // Reset to first page when sorting
    }
  };

  // Render sort icon for column headers
  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowDownUp size={14} className="ml-1 opacity-30" />;
    }

    if (sortDirection === 'asc') {
      return <ArrowUpAZ size={14} className="ml-1" />;
    } else if (sortDirection === 'desc') {
      return <ArrowDownAZ size={14} className="ml-1" />;
    }

    return <ArrowDownUp size={14} className="ml-1 opacity-30" />;
  };

  // Selection handler for individual items
  const handleSelectItem = (itemIndex: number, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemIndex);
    } else {
      newSelected.delete(itemIndex);
    }
    setSelectedItems(newSelected);
  };

  // Select all handler
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all case items (by their indices in the original cases array)
      const allIndices = new Set<number>();
      for (let i = 0; i < cases.length; i++) {
        allIndices.add(i);
      }
      setSelectedItems(allIndices);
    } else {
      // Deselect all
      setSelectedItems(new Set());
    }
  };

  // Calculate select all state
  const getSelectAllState = () => {
    if (cases.length === 0) return { checked: false, indeterminate: false };
    
    const totalItems = cases.length;
    const selectedCount = selectedItems.size;
    
    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === totalItems) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  };

  const selectAllState = getSelectAllState();

  // Handle navigation to case detail page
  const handleCaseClick = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };

  // Handle empty state
  if (!cases || cases.length === 0) {
    return (
      <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--raised)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">
                {/* No select all for empty state */}
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('caseId')}
              >
                <div className="flex items-center">
                  Case ID
                  {renderSortIcon('caseId')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('owner')}
              >
                <div className="flex items-center">
                  Owner
                  {renderSortIcon('owner')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('createdOn')}
              >
                <div className="flex items-center">
                  Created On
                  {renderSortIcon('createdOn')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('lastUpdatedOn')}
              >
                <div className="flex items-center">
                  Last Updated On
                  {renderSortIcon('lastUpdatedOn')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {renderSortIcon('status')}
                </div>
              </TableHead>
              <TableHead>Shared</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No cases found
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border" style={{ backgroundColor: 'var(--raised)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-sm)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">
                <Checkbox 
                  checked={selectAllState.indeterminate ? "indeterminate" : selectAllState.checked}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all cases"
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('caseId')}
              >
                <div className="flex items-center">
                  Case ID
                  {renderSortIcon('caseId')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('owner')}
              >
                <div className="flex items-center">
                  Owner
                  {renderSortIcon('owner')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('createdOn')}
              >
                <div className="flex items-center">
                  Created On
                  {renderSortIcon('createdOn')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('lastUpdatedOn')}
              >
                <div className="flex items-center">
                  Last Updated On
                  {renderSortIcon('lastUpdatedOn')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status
                  {renderSortIcon('status')}
                </div>
              </TableHead>
              <TableHead>Shared</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentCases.map((case_, index) => {
              // Find the original index of this item in the cases array
              const originalIndex = cases.findIndex(item => 
                item.caseId === case_.caseId
              );

              const handleRowClick = () => {
                handleCaseClick(case_.caseId);
              };

              return (
                <TableRow 
                  key={case_.caseId}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={handleRowClick}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedItems.has(originalIndex)}
                      onCheckedChange={(checked) => handleSelectItem(originalIndex, !!checked)}
                      aria-label={`Select case ${case_.caseId}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-accent hover:underline">
                    {case_.caseId}
                  </TableCell>
                  <TableCell>{case_.owner}</TableCell>
                  <TableCell>{formatDate(case_.createdOn)}</TableCell>
                  <TableCell>{formatDate(case_.lastUpdatedOn)}</TableCell>
                  <TableCell>{case_.status}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      {case_.isShared ? (
                        <Users size={16} className="text-accent" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {sortedCases.length > 0 && (
        <div className="flex w-full">
          <div className="flex justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show</span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                </SelectContent>
              </Select>
              <span className="caption text-muted-foreground whitespace-nowrap">per page</span>
            </div>
            
            {totalPages > 1 && (
              <Pagination>
                <PaginationContent className="ml-auto">
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                  
                  {getPageNumbers.map((page, index) => (
                    <PaginationItem key={index}>
                      {page === 'ellipsis' ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => handlePageChange(page as number)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}