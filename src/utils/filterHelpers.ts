/**
 * Counts the number of active filters in the FilterPanel
 */
export function countActiveFilters(filters: {
  selectedOwner?: string;
  selectedUploadedBy?: string;
  selectedAddedBy?: string;
  uploadedOnDate?: Date;
  recordedOnDate?: Date;
}): number {
  let count = 0;
  
  if (filters.selectedOwner) count++;
  if (filters.selectedUploadedBy) count++;
  if (filters.selectedAddedBy) count++;
  if (filters.uploadedOnDate) count++;
  if (filters.recordedOnDate) count++;
  
  return count;
}
