import React from 'react';
import { Skeleton } from './ui/skeleton';

interface SummaryTableLoadingSkeletonProps {
  /** Number of skeleton rows to display */
  rows?: number;
  /** Whether to show the table header */
  showHeader?: boolean;
  /** Whether to show zebra striping */
  showZebraStripes?: boolean;
}

export function SummaryTableLoadingSkeleton({ 
  rows = 8, 
  showHeader = true,
  showZebraStripes = true 
}: SummaryTableLoadingSkeletonProps) {
  return (
    <div className="border rounded-lg" style={{ borderColor: 'var(--border)' }}>
      {/* Table Header */}
      {showHeader && (
        <div 
          className="flex items-center px-4 py-3 border-b" 
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
        >
          <div className="w-8">
            <Skeleton className="h-4 w-4" /> {/* Checkbox column */}
          </div>
          <div className="flex-1 px-3">
            <Skeleton className="h-4 w-20" /> {/* Title column */}
          </div>
          <div className="w-24 px-3">
            <Skeleton className="h-4 w-16" /> {/* Type column */}
          </div>
          <div className="w-20 px-3">
            <Skeleton className="h-4 w-12" /> {/* Size column */}
          </div>
          <div className="w-28 px-3">
            <Skeleton className="h-4 w-20" /> {/* Date column */}
          </div>
          <div className="w-32 px-3">
            <Skeleton className="h-4 w-24" /> {/* Status column */}
          </div>
          <div className="w-12">
            <Skeleton className="h-4 w-8" /> {/* Actions column */}
          </div>
        </div>
      )}

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className={`flex items-center px-4 py-3 border-b last:border-b-0 ${
            showZebraStripes && index % 2 === 0 ? '' : showZebraStripes ? 'bg-table-zebra' : ''
          }`}
          style={{ borderColor: 'var(--border)' }}
        >
          {/* Checkbox */}
          <div className="w-8">
            <Skeleton className="h-4 w-4" />
          </div>

          {/* Title and subtitle */}
          <div className="flex-1 px-3">
            <div className="space-y-1">
              <Skeleton className="h-4 w-full max-w-sm" />
              <Skeleton className="h-3 w-3/4 max-w-xs" />
            </div>
          </div>

          {/* File type badge */}
          <div className="w-24 px-3">
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>

          {/* Size */}
          <div className="w-20 px-3">
            <Skeleton className="h-4 w-12" />
          </div>

          {/* Date */}
          <div className="w-28 px-3">
            <Skeleton className="h-4 w-20" />
          </div>

          {/* Status badge */}
          <div className="w-32 px-3">
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Actions */}
          <div className="w-12">
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Compact version of the summary table loading skeleton
 * Useful for smaller spaces or mobile views
 */
export function CompactSummaryTableLoadingSkeleton({ 
  rows = 5,
  showHeader = false 
}: Pick<SummaryTableLoadingSkeletonProps, 'rows' | 'showHeader'>) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between p-3 border rounded-lg"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--overlay)' }}
        >
          {/* Left side - checkbox and content */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Skeleton className="h-4 w-4 shrink-0" />
            <div className="space-y-1 flex-1 min-w-0">
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" /> {/* Type badge */}
                <Skeleton className="h-3 w-12" /> {/* Size */}
              </div>
            </div>
          </div>
          
          {/* Right side - actions */}
          <Skeleton className="h-8 w-8 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}