import React, { useState, useMemo } from 'react';
import { CasesTable } from '../CasesTable';
import { CasesList } from '../CasesList';
import { ActionBar } from '../ActionBar';
import { getAllCasesWithSharingStatus } from '../../data/mockCases';
import { useIsMobile } from '../ui/use-mobile';
import { UserX, Users, AlertCircle, ChevronDown, SlidersHorizontal } from 'lucide-react';

const TOTAL_MOCK_COUNT = 229510;

const OWNERS = [
  'Nguyen, Ace (acnguyen)',
  'Johnson, Mark (mjohnson)',
  'Smith, Rachel (rsmith)',
  'Davis, Chris (cdavis)',
  'Wilson, Tom (twilson)',
  'Martinez, Lisa (lmartinez)',
  'Thompson, Ben (bthompson)',
];

export function CasesPage() {
  const isMobile = useIsMobile();

  // Filter state
  const [caseIdFilter, setCaseIdFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [createdStart, setCreatedStart] = useState('');
  const [createdEnd, setCreatedEnd] = useState('');
  const [updatedStart, setUpdatedStart] = useState('');
  const [updatedEnd, setUpdatedEnd] = useState('');

  const [selectedCaseItems, setSelectedCaseItems] = useState<Set<number>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  React.useEffect(() => {
    const handleFocus = () => setRefreshKey(prev => prev + 1);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const allCases = useMemo(() => getAllCasesWithSharingStatus(), [refreshKey]);

  const filteredCases = useMemo(() => {
    return allCases.filter(c => {
      if (caseIdFilter && !c.caseId.toLowerCase().includes(caseIdFilter.toLowerCase())) return false;
      if (ownerFilter && c.owner !== ownerFilter) return false;
      if (createdStart && c.createdOn < new Date(createdStart)) return false;
      if (createdEnd && c.createdOn > new Date(createdEnd + 'T23:59:59')) return false;
      if (updatedStart && c.lastUpdatedOn < new Date(updatedStart)) return false;
      if (updatedEnd && c.lastUpdatedOn > new Date(updatedEnd + 'T23:59:59')) return false;
      return true;
    });
  }, [allCases, caseIdFilter, ownerFilter, createdStart, createdEnd, updatedStart, updatedEnd]);

  const hasFilters = !!(caseIdFilter || ownerFilter || createdStart || createdEnd || updatedStart || updatedEnd);
  const displayedCount = hasFilters ? filteredCases.length : TOTAL_MOCK_COUNT;

  const handleCaseSelectionChange = (selectedItems: Set<number>) => setSelectedCaseItems(selectedItems);

  const caseActions = [
    { key: 'reassign',      label: 'Reassign',      icon: <UserX size={14} className="mr-1.5" />,     onClick: () => {} },
    { key: 'manage-access', label: 'Manage Access', icon: <Users size={14} className="mr-1.5" />,      onClick: () => {} },
    { key: 'update-status', label: 'Update Status', icon: <AlertCircle size={14} className="mr-1.5" />, onClick: () => {} },
  ];

  const inputStyle: React.CSSProperties = {
    height: 32,
    padding: '0 10px',
    border: '1px solid var(--border)',
    borderRadius: 6,
    backgroundColor: 'var(--background)',
    color: 'var(--text-strong)',
    fontSize: 13,
    outline: 'none',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Filter bar ────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, flexWrap: 'wrap' }}>

        {/* All Cases dropdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 32, padding: '0 10px',
              border: '1px solid var(--border)', borderRadius: 6,
              backgroundColor: 'var(--background)', color: 'var(--text-strong)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <ChevronDown size={14} style={{ color: 'var(--text-weak)' }} />
            All Cases
          </button>
        </div>

        {/* Case ID */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-weak)', fontWeight: 500 }}>Case ID</label>
          <input
            style={{ ...inputStyle, width: 160 }}
            value={caseIdFilter}
            onChange={e => setCaseIdFilter(e.target.value)}
            placeholder=""
          />
        </div>

        {/* Owner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-weak)', fontWeight: 500 }}>Owner</label>
          <select
            style={{ ...inputStyle, width: 160, paddingRight: 28, appearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
            }}
            value={ownerFilter}
            onChange={e => setOwnerFilter(e.target.value)}
          >
            <option value=""></option>
            {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Created on */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-weak)', fontWeight: 500 }}>Created on</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="date" style={{ ...inputStyle, width: 130 }} value={createdStart} onChange={e => setCreatedStart(e.target.value)} placeholder="Start" />
            <input type="date" style={{ ...inputStyle, width: 130 }} value={createdEnd}   onChange={e => setCreatedEnd(e.target.value)}   placeholder="End"   />
          </div>
        </div>

        {/* Updated on */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-weak)', fontWeight: 500 }}>Updated on</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="date" style={{ ...inputStyle, width: 130 }} value={updatedStart} onChange={e => setUpdatedStart(e.target.value)} placeholder="Start" />
            <input type="date" style={{ ...inputStyle, width: 130 }} value={updatedEnd}   onChange={e => setUpdatedEnd(e.target.value)}   placeholder="End"   />
          </div>
        </div>
      </div>

      {/* ── Filters button + Export Results ───────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 32, padding: '0 12px',
            border: '1px solid var(--border)', borderRadius: 6,
            backgroundColor: 'var(--background)', color: 'var(--text-strong)',
            fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <SlidersHorizontal size={14} />
          Filters
        </button>
        <button
          style={{
            background: 'none', border: 'none', padding: 0,
            color: 'var(--accent)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Export Results
        </button>
      </div>

      {/* ── Result count ─────────────────────────────── */}
      <p style={{ fontSize: 13, color: 'var(--text-weak)', margin: 0 }}>
        {displayedCount.toLocaleString()} results
      </p>

      {/* ── Table / List ─────────────────────────────── */}
      {isMobile ? (
        <CasesList
          cases={filteredCases}
          selectedItems={selectedCaseItems}
          onSelectionChange={handleCaseSelectionChange}
        />
      ) : (
        <CasesTable
          cases={filteredCases}
          selectedItems={selectedCaseItems}
          onSelectionChange={handleCaseSelectionChange}
        />
      )}

      <ActionBar
        selectedCount={selectedCaseItems.size}
        actions={caseActions}
        onClearSelection={() => setSelectedCaseItems(new Set())}
        pageType="cases"
      />
    </div>
  );
}
