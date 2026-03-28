import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ArrowUpAZ, ArrowDownAZ, ArrowDownUp, SquarePlay, Volume2, Image, FolderArchive, FileText, MoreHorizontal, Trash2 } from 'lucide-react';
import { Evidence } from '../data/types';
import { deleteEvidence } from '../data/deleteEvidence';

interface EvidenceTableProps {
  evidence?: Evidence[];
  selectedItems?: Set<number>;
  onSelectionChange?: (selectedItems: Set<number>) => void;
  caseId?: string;
}

type SortColumn = keyof Evidence;
type SortDirection = 'asc' | 'desc' | null;

export function EvidenceTable({ 
  evidence = [], 
  selectedItems: externalSelectedItems,
  onSelectionChange,
  caseId
}: EvidenceTableProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<number>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  
  // Use external selection state if provided, otherwise use internal state
  const selectedItems = externalSelectedItems ?? internalSelectedItems;
  const setSelectedItems = onSelectionChange ?? setInternalSelectedItems;


  // Reset to first page when evidence data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [evidence]);

  // Reset selections when evidence changes
  useEffect(() => {
    setSelectedItems(new Set());
  }, [evidence]);

  // Sort evidence based on current sort settings
  const sortedEvidence = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return evidence;
    }

    return [...evidence].sort((a, b) => {
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
  }, [evidence, sortColumn, sortDirection]);

  // Calculate pagination values
  const totalPages = Math.ceil(sortedEvidence.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEvidence = sortedEvidence.slice(startIndex, endIndex);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get file type icon
  const getFileTypeIcon = (fileType: string) => {
    const iconProps = { size: 16, className: "text-muted-foreground mr-2 shrink-0" };
    
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
      default:
        return <FileText {...iconProps} />;
    }
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
      // Select all evidence items (by their indices in the original evidence array)
      const allIndices = new Set<number>();
      for (let i = 0; i < evidence.length; i++) {
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
    if (evidence.length === 0) return { checked: false, indeterminate: false };
    
    const totalItems = evidence.length;
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

  // Handle empty state
  if (!evidence || evidence.length === 0) {
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
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center">
                  Title
                  {renderSortIcon('title')}
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
                onClick={() => handleSort('uploadedOn')}
              >
                <div className="flex items-center">
                  Uploaded On
                  {renderSortIcon('uploadedOn')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('duration')}
              >
                <div className="flex items-center">
                  Duration
                  {renderSortIcon('duration')}
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
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No evidence found for this case
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {openMenuId && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpenMenuId(null)} />
      )}
      <div className="rounded-lg border" style={{ backgroundColor: 'var(--raised)', borderColor: 'var(--border)', boxShadow: 'var(--elevation-sm)' }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">
                <Checkbox 
                  checked={selectAllState.indeterminate ? "indeterminate" : selectAllState.checked}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all evidence"
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center">
                  Title
                  {renderSortIcon('title')}
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
                onClick={() => handleSort('uploadedOn')}
              >
                <div className="flex items-center">
                  Uploaded On
                  {renderSortIcon('uploadedOn')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('duration')}
              >
                <div className="flex items-center">
                  Duration
                  {renderSortIcon('duration')}
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
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentEvidence.map((evidenceItem, index) => {
              // Find the original index of this item in the evidence array
              const originalIndex = evidence.findIndex(item => 
                item.title === evidenceItem.title && 
                item.owner === evidenceItem.owner && 
                item.uploadedOn.getTime() === evidenceItem.uploadedOn.getTime()
              );

              const handleRowClick = () => {
                if (caseId) {
                  // Preserve filter params when navigating to evidence detail
                  const filtersParam = searchParams.get('filters');
                  const path = `/cases/${caseId}/evidence/${originalIndex}`;
                  if (filtersParam) {
                    navigate(`${path}?filters=${encodeURIComponent(filtersParam)}`);
                  } else {
                    navigate(path);
                  }
                }
              };
              
              return (
                <TableRow 
                  key={`evidence-${startIndex + index}`}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={handleRowClick}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedItems.has(originalIndex)}
                      onCheckedChange={(checked) => handleSelectItem(originalIndex, !!checked)}
                      aria-label={`Select ${evidenceItem.title}`}
                    />
                  </TableCell>
                <TableCell className="max-w-xs" title={evidenceItem.title}>
                  <div className="flex items-center">
                    {getFileTypeIcon(evidenceItem.fileType)}
                    <div className="truncate">{evidenceItem.title}</div>
                  </div>
                </TableCell>
                <TableCell>{evidenceItem.owner}</TableCell>
                <TableCell>{formatDate(evidenceItem.uploadedOn)}</TableCell>
                <TableCell>{evidenceItem.duration}</TableCell>
                <TableCell>
                  {evidenceItem.status}
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()} style={{ position: 'relative', width: 40, paddingRight: 8 }}>
                  <button
                    onClick={e => { e.stopPropagation(); setOpenMenuId(openMenuId === evidenceItem.uuid ? null : evidenceItem.uuid); }}
                    style={{ padding: '2px 4px', borderRadius: 4, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-weak)', display: 'flex', alignItems: 'center' }}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {openMenuId === evidenceItem.uuid && (
                    <div
                      onClick={e => e.stopPropagation()}
                      style={{
                        position: 'absolute', right: 8, top: '100%', zIndex: 50,
                        backgroundColor: 'var(--overlay)', border: '1px solid var(--border)',
                        borderRadius: 6, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                        minWidth: 140, padding: '4px 0',
                      }}
                    >
                      <button
                        onClick={async () => {
                          setOpenMenuId(null);
                          await deleteEvidence(evidenceItem.uuid, evidenceItem.vector_file_id);
                        }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          width: '100%', padding: '7px 12px',
                          background: 'none', border: 'none', cursor: 'pointer',
                          fontSize: 13, color: 'var(--fill-error-strong)', textAlign: 'left',
                        }}
                      >
                        <Trash2 size={13} />
                        Delete
                      </button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {sortedEvidence.length > 0 && (
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
              <span className="text-sm text-muted-foreground">per page</span>
            </div>
            
            {totalPages > 1 && (
              <Pagination className="justify-end">
                <PaginationContent>
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