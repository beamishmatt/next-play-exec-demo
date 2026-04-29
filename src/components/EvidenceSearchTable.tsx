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
import { ArrowUpAZ, ArrowDownAZ, ArrowDownUp, SquarePlay, Volume2, Image, FolderArchive, FileText } from 'lucide-react';
import { Evidence } from '../data/types';

interface EvidenceSearchTableProps {
  evidence: Evidence[];
  selectedItems?: Set<string>;
  onSelectionChange?: (selectedItems: Set<string>) => void;
}

type SortColumn = keyof Evidence | 'id';
type SortDirection = 'asc' | 'desc' | null;

export function EvidenceSearchTable({ 
  evidence,
  selectedItems: externalSelectedItems,
  onSelectionChange,
}: EvidenceSearchTableProps) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [internalSelectedItems, setInternalSelectedItems] = useState<Set<string>>(new Set());
  
  // Use external selection state if provided, otherwise use internal state
  const selectedItems = externalSelectedItems || internalSelectedItems;
  const setSelectedItems = onSelectionChange || setInternalSelectedItems;


  // Create evidence list with unique keys
  const evidenceWithKeys = useMemo(() => {
    return evidence;
  }, [evidence]);

  // Sort evidence based on current sort settings
  const sortedEvidence = useMemo(() => {
    if (!sortColumn || !sortDirection) {
      return evidenceWithKeys;
    }

    return [...evidenceWithKeys].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortColumn === 'id') {
        aValue = a.id;
        bValue = b.id;
      } else {
        aValue = a[sortColumn as keyof Evidence];
        bValue = b[sortColumn as keyof Evidence];
      }

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
  }, [evidenceWithKeys, sortColumn, sortDirection]);

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
  const handleSelectItem = (uuid: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(uuid);
    } else {
      newSelected.delete(uuid);
    }
    setSelectedItems(newSelected);
  };

  // Select all handler
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Select all evidence items (by their unique keys)
      const allKeys = new Set<string>();
      evidenceWithKeys.forEach(item => {
        allKeys.add(item.uuid);
      });
      setSelectedItems(allKeys);
    } else {
      // Deselect all
      setSelectedItems(new Set());
    }
  };

  // Calculate select all state
  const getSelectAllState = () => {
    if (evidenceWithKeys.length === 0) return { checked: false, indeterminate: false };
    
    const totalItems = evidenceWithKeys.length;
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

  // Handle row click navigation
  const handleRowClick = (evidenceItem: Evidence) => {
    navigate(`/evidence/item/${evidenceItem.uuid}`);
  };

  // Handle empty state
  if (!evidenceWithKeys || evidenceWithKeys.length === 0) {
    return (
      <div className="p-6 rounded-lg" style={{ backgroundColor: 'var(--raised)' }}>
        <Table>
          <TableHeader>
            <TableRow key="header">
              <TableHead className="pl-4">
                {/* No select all for empty state */}
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center">
                  ID
                  {renderSortIcon('id')}
                </div>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow key="empty">
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No evidence found
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
            <TableRow key="header">
              <TableHead className="pl-4">
                <Checkbox 
                  checked={selectAllState.indeterminate ? "indeterminate" : selectAllState.checked}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all evidence"
                />
              </TableHead>
              <TableHead 
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('id')}
              >
                <div className="flex items-center">
                  ID
                  {renderSortIcon('id')}
                </div>  
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentEvidence.map((evidenceItem, index) => {
              return (
                <TableRow 
                  key={evidenceItem.uuid}
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleRowClick(evidenceItem)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={selectedItems.has(evidenceItem.uuid)}
                      onCheckedChange={(checked) => handleSelectItem(evidenceItem.uuid, !!checked)}
                      aria-label={`Select ${evidenceItem.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    {evidenceItem.id}
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
              <span 
                className="caption text-muted-foreground"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 'var(--text-caption)',
                  fontWeight: 'var(--font-weight-regular)'
                }}
              >
                Show
              </span>
              <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-24 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span 
                className="caption text-muted-foreground inline-block whitespace-nowrap"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontSize: 'var(--text-caption)',
                  fontWeight: 'var(--font-weight-regular)'
                }}
              >
                per page
              </span>
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