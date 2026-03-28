import { Case, Evidence } from './types';

/**
 * Filters cases based on a search query that matches against multiple fields
 * @param cases - Array of cases to filter
 * @param searchQuery - Search string to match against
 * @returns Filtered array of cases
 */
export function filterCases(cases: Case[], searchQuery: string): Case[] {
  if (!searchQuery.trim()) {
    return cases;
  }

  const query = searchQuery.toLowerCase().trim();

  return cases.filter((case_) => {
    // Search in Case ID
    const matchesCaseId = case_.caseId.toLowerCase().includes(query);
    
    // Search in Owner
    const matchesOwner = case_.owner.toLowerCase().includes(query);
    
    // Search in Status
    const matchesStatus = case_.status.toLowerCase().includes(query);
    
    // Search in Created On (formatted as locale date string)
    const matchesCreatedOn = case_.createdOn.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toLowerCase().includes(query);
    
    // Search in Last Updated On (formatted as locale date string)
    const matchesLastUpdatedOn = case_.lastUpdatedOn.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toLowerCase().includes(query);

    // Return true if any field matches
    return matchesCaseId || matchesOwner || matchesStatus || matchesCreatedOn || matchesLastUpdatedOn;
  });
}

/**
 * Filters evidence based on a search query that matches against multiple fields
 * @param evidence - Array of evidence to filter
 * @param searchQuery - Search string to match against
 * @returns Filtered array of evidence
 */
export function filterEvidence(evidence: Evidence[], searchQuery: string): Evidence[] {
  if (!searchQuery.trim()) {
    return evidence;
  }

  const query = searchQuery.toLowerCase().trim();

  return evidence.filter((item) => {
    // Search in ID (case ID)
    const matchesId = item.id.toLowerCase().includes(query);
    
    // Search in Title
    const matchesTitle = item.title.toLowerCase().includes(query);
    
    // Search in Owner
    const matchesOwner = item.owner.toLowerCase().includes(query);
    
    // Search in Uploaded By
    const matchesUploadedBy = item.uploadedBy.toLowerCase().includes(query);
    
    // Search in Added By
    const matchesAddedBy = item.addedBy.toLowerCase().includes(query);
    
    // Search in Status
    const matchesStatus = item.status.toLowerCase().includes(query);
    
    // Search in File Type
    const matchesFileType = item.fileType.toLowerCase().includes(query);
    
    // Search in Duration
    const matchesDuration = item.duration.toLowerCase().includes(query);
    
    // Search in Uploaded On (formatted as locale date string)
    const matchesUploadedOn = item.uploadedOn.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toLowerCase().includes(query);
    
    // Search in Recorded On (formatted as locale date string)
    const matchesRecordedOn = item.recordedOn.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).toLowerCase().includes(query);

    // Return true if any field matches
    return matchesId || matchesTitle || matchesOwner || matchesUploadedBy || 
           matchesAddedBy || matchesStatus || matchesFileType || matchesDuration ||
           matchesUploadedOn || matchesRecordedOn;
  });
}

/**
 * Highlights search terms in a string by wrapping matches in HTML
 * @param text - Text to highlight
 * @param searchQuery - Search query to highlight
 * @returns Text with highlighted matches
 */
export function highlightSearchTerm(text: string, searchQuery: string): string {
  if (!searchQuery.trim()) {
    return text;
  }

  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}