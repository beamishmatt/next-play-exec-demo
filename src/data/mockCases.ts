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
  { caseId: '17750555570274389235-923605', owner: 'Nguyen, Ace (acnguyen)', createdOn: d(11, 6, 14), lastUpdatedOn: d(11, 6, 14), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750555570210673255-012116', owner: 'Nguyen, Ace (acnguyen)', createdOn: d(11, 6, 11), lastUpdatedOn: d(11, 6, 11), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750555570141685786-799762', owner: 'Nguyen, Ace (acnguyen)', createdOn: d(11, 6, 8),  lastUpdatedOn: d(11, 6, 8),  status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750555570081587412-856388', owner: 'Nguyen, Ace (acnguyen)', createdOn: d(11, 5, 58), lastUpdatedOn: d(11, 5, 58), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750555570053374636-036789', owner: 'Nguyen, Ace (acnguyen)', createdOn: d(11, 5, 52), lastUpdatedOn: d(11, 5, 52), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750546669680062747-157881', owner: 'Nguyen, Ace (acnguyen)', createdOn: d(11, 5, 44), lastUpdatedOn: d(11, 5, 44), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750552703185828700-605382', owner: 'Nguyen, Ace (acnguyen)', createdOn: d(11, 5, 37), lastUpdatedOn: d(11, 5, 37), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750549694500004204-089328', owner: 'Nguyen, Ace (acnguyen)', createdOn: d(11, 5, 29), lastUpdatedOn: d(11, 5, 29), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750537694832136100-732944', owner: 'Nguyen, Ace (acnguyen)', createdOn: d(11, 5, 21), lastUpdatedOn: d(11, 5, 21), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750531482610057823-441207', owner: 'Nguyen, Ace (acnguyen)', createdOn: d(11, 5, 14), lastUpdatedOn: d(11, 5, 14), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750528937461002847-663519', owner: 'Nguyen, Ace (acnguyen)', createdOn: d(11, 5, 6),  lastUpdatedOn: d(11, 5, 6),  status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750524810293847561-228834', owner: 'Johnson, Mark (mjohnson)', createdOn: d(11, 4, 58), lastUpdatedOn: d(11, 4, 58), status: 'Active', description: '', accessClass: 'Restricted' },
  { caseId: '17750521394827563910-771093', owner: 'Johnson, Mark (mjohnson)', createdOn: d(11, 4, 50), lastUpdatedOn: d(11, 4, 50), status: 'Active', description: '', accessClass: 'Restricted' },
  { caseId: '17750517283640182734-339261', owner: 'Smith, Rachel (rsmith)',   createdOn: d(11, 4, 41), lastUpdatedOn: d(11, 4, 41), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750513827461093847-882047', owner: 'Smith, Rachel (rsmith)',   createdOn: d(11, 4, 33), lastUpdatedOn: d(11, 4, 33), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750508374619283746-114562', owner: 'Davis, Chris (cdavis)',    createdOn: d(11, 4, 25), lastUpdatedOn: d(11, 4, 25), status: 'Closed',  description: '', accessClass: 'Confidential' },
  { caseId: '17750503928461728394-556781', owner: 'Davis, Chris (cdavis)',    createdOn: d(11, 4, 17), lastUpdatedOn: d(11, 4, 17), status: 'Closed',  description: '', accessClass: 'Confidential' },
  { caseId: '17750498374610293847-998234', owner: 'Nguyen, Ace (acnguyen)',   createdOn: d(11, 4, 9),  lastUpdatedOn: d(11, 4, 9),  status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750492837461029384-331098', owner: 'Nguyen, Ace (acnguyen)',   createdOn: d(11, 4, 1),  lastUpdatedOn: d(11, 4, 1),  status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750487293841027364-774412', owner: 'Wilson, Tom (twilson)',    createdOn: d(11, 3, 53), lastUpdatedOn: d(11, 3, 53), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750481728364019283-215637', owner: 'Wilson, Tom (twilson)',    createdOn: d(11, 3, 44), lastUpdatedOn: d(11, 3, 44), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750476283940182736-668854', owner: 'Martinez, Lisa (lmartinez)', createdOn: d(11, 3, 36), lastUpdatedOn: d(11, 3, 36), status: 'Dismissed', description: '', accessClass: 'Restricted' },
  { caseId: '17750471928374610293-991073', owner: 'Martinez, Lisa (lmartinez)', createdOn: d(11, 3, 28), lastUpdatedOn: d(11, 3, 28), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750466283749102834-443219', owner: 'Thompson, Ben (bthompson)', createdOn: d(11, 3, 20), lastUpdatedOn: d(11, 3, 20), status: 'Active', description: '', accessClass: 'Unrestricted' },
  { caseId: '17750461837492018374-886435', owner: 'Thompson, Ben (bthompson)', createdOn: d(11, 3, 11), lastUpdatedOn: d(11, 3, 11), status: 'Closed',  description: '', accessClass: 'Unrestricted' },
];

export function getCaseById(caseId: string): Case | undefined {
  return mockCases.find(c => c.caseId === caseId);
}

export function getAllCasesWithSharingStatus(): (Case & { isShared: boolean })[] {
  return mockCases.map(c => ({ ...c, isShared: isCaseShared(c.caseId) }));
}
