// Persistence layer for case sharing using localStorage
import { PartnerUser } from './types';

export interface SharedUser {
  id: string;
  name: string;
  role: string;
  type: 'owner' | 'collaborator' | 'viewer';
  avatarInitials: string;
  shareType?: string; // Partner name
  caseId: string; // Which case they have access to
  sharedOn: Date; // When they were added
}

export interface CaseShareData {
  caseId: string;
  isShared: boolean;
  sharedUsers: SharedUser[];
  lastSharedOn?: Date;
}

const STORAGE_KEY = 'figma_make_case_shares';

// Get all case share data from localStorage
export function getAllCaseShares(): Record<string, CaseShareData> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    
    const parsed = JSON.parse(stored);
    
    // Convert date strings back to Date objects
    Object.values(parsed).forEach((caseData: any) => {
      caseData.sharedUsers.forEach((user: any) => {
        user.sharedOn = new Date(user.sharedOn);
      });
      if (caseData.lastSharedOn) {
        caseData.lastSharedOn = new Date(caseData.lastSharedOn);
      }
    });
    
    return parsed;
  } catch (error) {
    console.error('Error loading case shares from localStorage:', error);
    return {};
  }
}

// Get share data for a specific case
export function getCaseShareData(caseId: string): CaseShareData {
  const allShares = getAllCaseShares();
  return allShares[caseId] || {
    caseId,
    isShared: false,
    sharedUsers: [],
  };
}

// Save case share data to localStorage
function saveCaseShareData(caseId: string, shareData: CaseShareData): void {
  try {
    const allShares = getAllCaseShares();
    allShares[caseId] = shareData;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allShares));
  } catch (error) {
    console.error('Error saving case shares to localStorage:', error);
  }
}

// Add a shared user to a case
export function addSharedUserToCase(
  caseId: string, 
  partnerUser: PartnerUser, 
  partnerName: string
): SharedUser {
  const shareData = getCaseShareData(caseId);
  
  const newSharedUser: SharedUser = {
    id: `shared-${partnerUser.id}-${Date.now()}`,
    name: partnerUser.name,
    role: 'Collaborator',
    type: 'collaborator',
    avatarInitials: partnerUser.name.split(' ').map(n => n[0]).join(''),
    shareType: partnerName,
    caseId,
    sharedOn: new Date()
  };
  
  const updatedShareData: CaseShareData = {
    ...shareData,
    isShared: true,
    sharedUsers: [...shareData.sharedUsers, newSharedUser],
    lastSharedOn: new Date()
  };
  
  saveCaseShareData(caseId, updatedShareData);
  return newSharedUser;
}

// Remove a shared user from a case
export function removeSharedUserFromCase(caseId: string, userId: string): void {
  const shareData = getCaseShareData(caseId);
  
  const updatedShareData: CaseShareData = {
    ...shareData,
    sharedUsers: shareData.sharedUsers.filter(user => user.id !== userId),
    isShared: shareData.sharedUsers.filter(user => user.id !== userId).length > 0
  };
  
  saveCaseShareData(caseId, updatedShareData);
}

// Get all shared users for a case (excluding the owner)
export function getSharedUsersForCase(caseId: string): SharedUser[] {
  const shareData = getCaseShareData(caseId);
  return shareData.sharedUsers;
}

// Check if a case has been shared
export function isCaseShared(caseId: string): boolean {
  const shareData = getCaseShareData(caseId);
  return shareData.isShared;
}

// Get cases that have been shared (for analytics/reporting)
export function getAllSharedCases(): CaseShareData[] {
  const allShares = getAllCaseShares();
  return Object.values(allShares).filter(caseData => caseData.isShared);
}

// Clear all sharing data (for testing/reset purposes)
export function clearAllShareData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing share data:', error);
  }
}