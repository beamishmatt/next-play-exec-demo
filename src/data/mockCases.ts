import { Case } from './types';
import { isCaseShared } from './persistenceLayer';

export const mockCases: Case[] = [];

export function getCaseById(caseId: string): Case | undefined {
  return mockCases.find(c => c.caseId === caseId);
}

export function getAllCasesWithSharingStatus(): (Case & { isShared: boolean })[] {
  return mockCases.map(c => ({ ...c, isShared: isCaseShared(c.caseId) }));
}
