import React from 'react';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export function CaseDetailLoadingSkeleton() {
  return (
    <div className="p-4 md:p-6">
      {/* Case Header Skeleton */}
      <div className="space-y-4">
        {/* Case title and metadata */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" /> {/* Case title */}
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-24" /> {/* Date */}
              <Skeleton className="h-6 w-20" /> {/* Status badge */}
              <Skeleton className="h-6 w-28" /> {/* Priority badge */}
            </div>
          </div>
          <Skeleton className="h-9 w-20" /> {/* Share button */}
        </div>

        {/* Case description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Case metadata grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" /> {/* Label */}
            <Skeleton className="h-4 w-32" /> {/* Value */}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" /> {/* Label */}
            <Skeleton className="h-4 w-28" /> {/* Value */}
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" /> {/* Label */}
            <Skeleton className="h-4 w-36" /> {/* Value */}
          </div>
        </div>
      </div>

      {/* Tab Navigation Skeleton */}
      <div className="mt-6">
        <Tabs defaultValue="evidence" className="w-full gap-6">
          <TabsList className="flex w-full">
            <TabsTrigger value="evidence" disabled>
              <Skeleton className="h-4 w-16" />
            </TabsTrigger>
            <TabsTrigger value="notes" disabled>
              <Skeleton className="h-4 w-12" />
            </TabsTrigger>
            <div className="flex-1 border-b-2 border-transparent"></div>
          </TabsList>
          
          <TabsContent value="evidence" className="space-y-4">
            {/* Case Actions Skeleton */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                {/* Filter badges */}
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-18" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-20" /> {/* Clear filters */}
                <Skeleton className="h-9 w-9" />   {/* Filter toggle */}
              </div>
            </div>

            {/* Results count and view switcher */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" /> {/* Results count */}
              <div className="hidden md:flex items-center gap-1">
                <Skeleton className="h-8 w-8" /> {/* Table view */}
                <Skeleton className="h-8 w-8" /> {/* Gallery view */}
              </div>
            </div>

            {/* Summary Table Skeleton */}
            <div className="border rounded-lg" style={{ borderColor: 'var(--border)' }}>
              {/* Table Header */}
              <div 
                className="flex items-center px-4 py-3 border-b" 
                style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}
              >
                <div className="flex-1">
                  <Skeleton className="h-4 w-20" /> {/* Column header */}
                </div>
                <div className="w-24">
                  <Skeleton className="h-4 w-16" /> {/* Column header */}
                </div>
                <div className="w-24">
                  <Skeleton className="h-4 w-18" /> {/* Column header */}
                </div>
                <div className="w-32">
                  <Skeleton className="h-4 w-24" /> {/* Column header */}
                </div>
                <div className="w-20">
                  <Skeleton className="h-4 w-14" /> {/* Column header */}
                </div>
              </div>

              {/* Table Rows */}
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className={`flex items-center px-4 py-3 border-b last:border-b-0 ${
                    index % 2 === 0 ? '' : 'bg-table-zebra'
                  }`}
                  style={{ borderColor: 'var(--border)' }}
                >
                  {/* Checkbox and title */}
                  <div className="flex-1 flex items-center gap-3">
                    <Skeleton className="h-4 w-4" /> {/* Checkbox */}
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-48" /> {/* Evidence title */}
                      <Skeleton className="h-3 w-32" /> {/* Evidence subtitle */}
                    </div>
                  </div>

                  {/* File type */}
                  <div className="w-24">
                    <Skeleton className="h-6 w-16 rounded-full" /> {/* File type badge */}
                  </div>

                  {/* Size */}
                  <div className="w-24">
                    <Skeleton className="h-4 w-12" />
                  </div>

                  {/* Date */}
                  <div className="w-32">
                    <Skeleton className="h-4 w-20" />
                  </div>

                  {/* Actions */}
                  <div className="w-20">
                    <Skeleton className="h-8 w-8 rounded" /> {/* Action button */}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Skeleton */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" /> {/* Page info */}
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8" /> {/* Previous */}
                <Skeleton className="h-8 w-8" /> {/* Page 1 */}
                <Skeleton className="h-8 w-8" /> {/* Page 2 */}
                <Skeleton className="h-8 w-8" /> {/* Page 3 */}
                <Skeleton className="h-8 w-8" /> {/* Next */}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}