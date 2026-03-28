import { Evidence } from './types';

export const mockEvidence: Evidence[] = [];

export function getEvidenceByCaseId(caseId: string): Evidence[] {
  return mockEvidence.filter(e => e.id === caseId);
}
