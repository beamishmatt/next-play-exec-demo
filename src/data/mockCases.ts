import { Case } from './types';
import { isCaseShared } from './persistenceLayer';

// Base date: Apr 1, 2026
const d = (h: number, m: number, s = 0) =>
  new Date(2026, 3, 1, h, m, s); // month is 0-indexed

export const mockCases: Case[] = [
  {
    caseId: 'PBPD-2025-088142',
    owner: 'Thibodaux, Maria (mthibodaux)',
    createdOn: new Date('2026-03-27T19:23:52Z'),
    lastUpdatedOn: new Date('2026-03-27T21:15:00Z'),
    status: 'Active',
    description: 'Homicide investigation — case assigned to Officer Maria Thibodaux.',
    accessClass: 'Confidential',
  },
];

export function getCaseById(caseId: string): Case | undefined {
  return mockCases.find(c => c.caseId === caseId);
}

export function getAllCasesWithSharingStatus(): (Case & { isShared: boolean })[] {
  return mockCases.map(c => ({ ...c, isShared: isCaseShared(c.caseId) }));
}
