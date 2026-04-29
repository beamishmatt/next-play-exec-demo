import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { SearchEvidenceResult } from '../data/types';

// ─── Shared constants ─────────────────────────────────────────────────────────

export const DATE_OPTIONS = ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'Last year'];

const STATUS_OPTIONS = ['Active', 'Processing', 'Queued for Deletion', 'Excluded', 'Deleted', 'Declined', 'Pending Triage'];
const SOURCE_OPTIONS = ['Body Worn Cameras', 'Fleet', 'TASER Energy Weapons', 'Interview', 'Community Request', 'Axon Air', 'Axon App', 'Axon Investigate', 'Capture', 'API Client', 'User Upload', 'Fixed ALPR', 'Other'];

export const FILE_TYPE_OPTIONS = ['Video', 'Audio', 'Document', 'Image', 'Weapon Logs', 'Zip', 'Other'];

const CATEGORY_OPTIONS = [
  'None / Uncategorized', '.Cold Case', '.Domestic Violence', '.Drug/Narcotics',
  '.Felony Standard', '.Gang/Organized Crime', '.Juvenile', '.Long Term',
  '.Permanent', '.Property Crime', '.Traffic', '.Use of Force',
  '.Witness Statement', '1 day retention',
];

const USER_OPTIONS = [
  'Alex Rivera', 'Bailey Kim', 'Cameron Price', 'Dana Flores', 'Elliott Nash',
  'Finley Torres', 'Harper Okafor', 'Indira Patel', 'Jordan Mercer', 'Kai Nguyen',
  'Lane Hoffman', 'Morgan Shaw', 'Nadia Reyes', 'Owen Castillo', 'Parker Yamamoto',
  'Quinn Delgado', 'Reece Andersen', 'Sage Kowalski', 'Taylor Osei', 'Valentina Cruz',
];

// ─── FilterSection (accordion) ────────────────────────────────────────────────

function FilterSection({ label, options, selected, onToggle }: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (val: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedCount = options.filter(o => selected.has(o)).length;

  return (
    <div>
      <button
        onClick={() => setExpanded(p => !p)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '6px 10px', borderRadius: 8,
          border: '1px solid var(--border)',
          backgroundColor: 'var(--fill-base, var(--raised))',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: selectedCount > 0 ? 'var(--foreground)' : 'var(--text-weak)' }}>{label}</span>
          <span style={{
            fontSize: 11, fontWeight: 500, color: 'var(--text-weak)',
            backgroundColor: 'var(--fill-weaker)', borderRadius: 99,
            padding: '1px 7px', border: '1px solid var(--border)',
          }}>
            {selectedCount === 0 || selectedCount === options.length ? 'All' : `+${selectedCount}`}
          </span>
        </div>
        <ChevronDown size={13} style={{ color: 'var(--text-weak)', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>
      {expanded && (
        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
                borderRadius: 6, border: 'none', backgroundColor: 'transparent',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <div style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                border: `1.5px solid ${selected.has(opt) ? 'var(--foreground)' : 'var(--border)'}`,
                backgroundColor: selected.has(opt) ? 'var(--foreground)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {selected.has(opt) && <Check size={10} style={{ color: 'var(--background)' }} strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 12, color: 'var(--foreground)' }}>{opt}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useSearchFilters() {
  const [selectedStatuses,    setSelectedStatuses]    = useState<Set<string>>(new Set());
  const [selectedSources,     setSelectedSources]     = useState<Set<string>>(new Set());
  const [selectedCategories,  setSelectedCategories]  = useState<Set<string>>(new Set());
  const [selectedUsers,       setSelectedUsers]       = useState<Set<string>>(new Set());
  const [selectedDates,       setSelectedDates]       = useState<Set<string>>(new Set());
  const [selectedMediaTypes,  setSelectedMediaTypes]  = useState<Set<string>>(new Set());

  const toggleSet = (set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, val: string) => {
    setFn(prev => {
      const next = new Set(prev);
      if (next.has(val)) { next.delete(val); } else { next.add(val); }
      return next;
    });
  };

  const filterResults = (results: SearchEvidenceResult[]) => {
    let out = results;

    // File type
    if (selectedMediaTypes.size > 0) {
      const known = ['video', 'audio', 'document', 'pdf', 'text', 'image', 'weapon_log', 'zip'];
      out = out.filter(r => {
        const mc = (r.media_class ?? '').toLowerCase();
        if (selectedMediaTypes.has('Video')       && mc === 'video') return true;
        if (selectedMediaTypes.has('Audio')       && mc === 'audio') return true;
        if (selectedMediaTypes.has('Document')    && (mc === 'document' || mc === 'pdf' || mc === 'text')) return true;
        if (selectedMediaTypes.has('Image')       && mc === 'image') return true;
        if (selectedMediaTypes.has('Weapon Logs') && mc === 'weapon_log') return true;
        if (selectedMediaTypes.has('Zip')         && mc === 'zip') return true;
        if (selectedMediaTypes.has('Other')       && !known.includes(mc)) return true;
        return false;
      });
    }

    // Category
    if (selectedCategories.size > 0) {
      out = out.filter(r => r.category && selectedCategories.has(r.category));
    }

    // User / officer
    if (selectedUsers.size > 0) {
      out = out.filter(r => r.officer && selectedUsers.has(r.officer));
    }

    // Sources
    if (selectedSources.size > 0) {
      out = out.filter(r => r.source && selectedSources.has(r.source));
    }

    // Date
    if (selectedDates.size > 0) {
      const now = Date.now();
      out = out.filter(r => {
        if (!r.date_recorded) return false;
        const days = (now - new Date(r.date_recorded).getTime()) / 86_400_000;
        if (selectedDates.has('Last 24 hours') && days <= 1)   return true;
        if (selectedDates.has('Last 7 days')   && days <= 7)   return true;
        if (selectedDates.has('Last 30 days')  && days <= 30)  return true;
        if (selectedDates.has('Last 90 days')  && days <= 90)  return true;
        if (selectedDates.has('Last year')     && days <= 365) return true;
        return false;
      });
    }

    return out;
  };

  return {
    selectedStatuses, setSelectedStatuses,
    selectedSources, setSelectedSources,
    selectedCategories, setSelectedCategories,
    selectedUsers, setSelectedUsers,
    selectedDates, setSelectedDates,
    selectedMediaTypes, setSelectedMediaTypes,
    toggleSet,
    filterResults,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SearchFilterBarProps {
  filters: ReturnType<typeof useSearchFilters>;
}

export function SearchFilterBar({ filters }: SearchFilterBarProps) {
  const {
    selectedStatuses, setSelectedStatuses,
    selectedSources, setSelectedSources,
    selectedCategories, setSelectedCategories,
    selectedUsers, setSelectedUsers,
    selectedDates, setSelectedDates,
    selectedMediaTypes, setSelectedMediaTypes,
    toggleSet,
  } = filters;

  const filterRef      = useRef<HTMLDivElement>(null);
  const dateRef        = useRef<HTMLDivElement>(null);
  const categoryRef    = useRef<HTMLDivElement>(null);
  const catFilterRef   = useRef<HTMLDivElement>(null);
  const fileTypeRef    = useRef<HTMLDivElement>(null);
  const userFilterRef  = useRef<HTMLDivElement>(null);
  const [filterOpen,    setFilterOpen]    = useState(false);
  const [dateOpen,      setDateOpen]      = useState(false);
  const [categoryOpen,  setCategoryOpen]  = useState(false);
  const [catFilterOpen, setCatFilterOpen] = useState(false);
  const [fileTypeOpen,  setFileTypeOpen]  = useState(false);
  const [userFilterOpen, setUserFilterOpen] = useState(false);
  const [catSearch,     setCatSearch]     = useState('');
  const [userSearch,    setUserSearch]    = useState('');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current     && !filterRef.current.contains(e.target as Node))     { setFilterOpen(false); }
      if (dateRef.current       && !dateRef.current.contains(e.target as Node))       { setDateOpen(false); }
      if (categoryRef.current   && !categoryRef.current.contains(e.target as Node))   { setCategoryOpen(false); }
      if (catFilterRef.current  && !catFilterRef.current.contains(e.target as Node))  { setCatFilterOpen(false); setCatSearch(''); }
      if (fileTypeRef.current   && !fileTypeRef.current.contains(e.target as Node))   { setFileTypeOpen(false); }
      if (userFilterRef.current && !userFilterRef.current.contains(e.target as Node)) { setUserFilterOpen(false); setUserSearch(''); }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>

      {/* Status dropdown */}
      <div ref={filterRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setFilterOpen(p => !p); setDateOpen(false); setCategoryOpen(false); setCatFilterOpen(false); setFileTypeOpen(false); setUserFilterOpen(false); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            border: '1px solid var(--border)',
            backgroundColor: selectedStatuses.size > 0 ? 'var(--fill-weaker)' : 'transparent',
            color: 'var(--foreground)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {selectedStatuses.size === 0 ? 'Status' : selectedStatuses.size === 1 ? [...selectedStatuses][0] : `${selectedStatuses.size} statuses`}
          <ChevronDown size={11} style={{ opacity: 0.6 }} />
        </button>
        {filterOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            width: 220, zIndex: 400,
            backgroundColor: 'var(--raised)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.14)', overflow: 'hidden',
          }}>
            <div style={{ padding: '4px 0' }}>
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleSet(selectedStatuses, setSelectedStatuses, opt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 12px',
                    backgroundColor: selectedStatuses.has(opt) ? 'var(--fill-weaker)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = selectedStatuses.has(opt) ? 'var(--fill-weaker)' : 'transparent')}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                    border: `1.5px solid ${selectedStatuses.has(opt) ? 'var(--foreground)' : 'var(--border)'}`,
                    backgroundColor: selectedStatuses.has(opt) ? 'var(--foreground)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedStatuses.has(opt) && <Check size={10} style={{ color: 'var(--background)' }} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{opt}</span>
                </button>
              ))}
            </div>
            {selectedStatuses.size > 0 && (
              <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setSelectedStatuses(new Set())} style={{ fontSize: 12, color: 'var(--text-weak)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sources dropdown */}
      <div ref={categoryRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setCategoryOpen(p => !p); setFilterOpen(false); setDateOpen(false); setCatFilterOpen(false); setFileTypeOpen(false); setUserFilterOpen(false); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            border: '1px solid var(--border)',
            backgroundColor: selectedSources.size > 0 ? 'var(--fill-weaker)' : 'transparent',
            color: 'var(--foreground)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {selectedSources.size === 0 ? 'Sources' : selectedSources.size === 1 ? [...selectedSources][0] : `${selectedSources.size} sources`}
          <ChevronDown size={11} style={{ opacity: 0.6 }} />
        </button>
        {categoryOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            width: 220, zIndex: 400,
            backgroundColor: 'var(--raised)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.14)', overflow: 'hidden',
          }}>
            <div style={{ maxHeight: 280, overflowY: 'auto', padding: '4px 0' }}>
              {SOURCE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleSet(selectedSources, setSelectedSources, opt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 12px',
                    backgroundColor: selectedSources.has(opt) ? 'var(--fill-weaker)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = selectedSources.has(opt) ? 'var(--fill-weaker)' : 'transparent')}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                    border: `1.5px solid ${selectedSources.has(opt) ? 'var(--foreground)' : 'var(--border)'}`,
                    backgroundColor: selectedSources.has(opt) ? 'var(--foreground)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedSources.has(opt) && <Check size={10} style={{ color: 'var(--background)' }} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{opt}</span>
                </button>
              ))}
            </div>
            {selectedSources.size > 0 && (
              <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setSelectedSources(new Set())} style={{ fontSize: 12, color: 'var(--text-weak)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Date dropdown */}
      <div ref={dateRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setDateOpen(p => !p); setFilterOpen(false); setCategoryOpen(false); setCatFilterOpen(false); setFileTypeOpen(false); setUserFilterOpen(false); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            border: '1px solid var(--border)',
            backgroundColor: selectedDates.size > 0 ? 'var(--fill-weaker)' : 'transparent',
            color: 'var(--foreground)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {selectedDates.size === 0 ? 'Date' : selectedDates.size === 1 ? [...selectedDates][0] : `${selectedDates.size} dates`}
          <ChevronDown size={11} style={{ opacity: 0.6 }} />
        </button>
        {dateOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            width: 180, zIndex: 400,
            backgroundColor: 'var(--raised)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.14)', overflow: 'hidden',
          }}>
            <div style={{ padding: '4px 0' }}>
              {DATE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleSet(selectedDates, setSelectedDates, opt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 12px',
                    backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                    border: `1.5px solid ${selectedDates.has(opt) ? 'var(--foreground)' : 'var(--border)'}`,
                    backgroundColor: selectedDates.has(opt) ? 'var(--foreground)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedDates.has(opt) && <Check size={10} style={{ color: 'var(--background)' }} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{opt}</span>
                </button>
              ))}
            </div>
            {selectedDates.size > 0 && (
              <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setSelectedDates(new Set())} style={{ fontSize: 12, color: 'var(--text-weak)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* File type dropdown */}
      <div ref={fileTypeRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setFileTypeOpen(p => !p); setFilterOpen(false); setDateOpen(false); setCategoryOpen(false); setCatFilterOpen(false); setUserFilterOpen(false); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            border: '1px solid var(--border)',
            backgroundColor: selectedMediaTypes.size > 0 ? 'var(--fill-weaker)' : 'transparent',
            color: 'var(--foreground)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {selectedMediaTypes.size === 0
            ? 'File type'
            : (() => {
                const arr = [...selectedMediaTypes];
                if (arr.length <= 2) return arr.join('  ');
                return `${arr[0]}  ${arr[1]}  +${arr.length - 2}`;
              })()}
          <ChevronDown size={11} style={{ opacity: 0.6 }} />
        </button>
        {fileTypeOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            width: 200, zIndex: 400,
            backgroundColor: 'var(--raised)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.14)', overflow: 'hidden',
          }}>
            <div style={{ padding: '4px 0' }}>
              {FILE_TYPE_OPTIONS.map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleSet(selectedMediaTypes, setSelectedMediaTypes, opt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 12px',
                    backgroundColor: selectedMediaTypes.has(opt) ? 'var(--fill-weaker)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = selectedMediaTypes.has(opt) ? 'var(--fill-weaker)' : 'transparent')}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                    border: `1.5px solid ${selectedMediaTypes.has(opt) ? 'var(--foreground)' : 'var(--border)'}`,
                    backgroundColor: selectedMediaTypes.has(opt) ? 'var(--foreground)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedMediaTypes.has(opt) && <Check size={10} style={{ color: 'var(--background)' }} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{opt}</span>
                </button>
              ))}
            </div>
            {selectedMediaTypes.size > 0 && (
              <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setSelectedMediaTypes(new Set())} style={{ fontSize: 12, color: 'var(--text-weak)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Category dropdown */}
      <div ref={catFilterRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setCatFilterOpen(p => !p); setFilterOpen(false); setDateOpen(false); setCategoryOpen(false); setFileTypeOpen(false); setUserFilterOpen(false); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            border: '1px solid var(--border)',
            backgroundColor: selectedCategories.size > 0 ? 'var(--fill-weaker)' : 'transparent',
            color: 'var(--foreground)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {selectedCategories.size === 0 ? 'Category' : selectedCategories.size === 1 ? [...selectedCategories][0] : `${selectedCategories.size} categories`}
          <ChevronDown size={11} style={{ opacity: 0.6 }} />
        </button>
        {catFilterOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            width: 240, zIndex: 400,
            backgroundColor: 'var(--raised)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.14)', overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={catSearch}
                  onChange={e => setCatSearch(e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                  autoFocus
                  style={{
                    width: '100%', height: 28, padding: '0 28px 0 8px',
                    border: '1px solid var(--border)', borderRadius: 6,
                    backgroundColor: 'var(--fill-weaker)', color: 'var(--foreground)',
                    fontSize: 12, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <Search size={12} style={{ position: 'absolute', right: 8, color: 'var(--text-weak)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto', padding: '4px 0' }}>
              {CATEGORY_OPTIONS
                .filter(opt => opt.toLowerCase().includes(catSearch.toLowerCase()))
                .map(opt => (
                  <button
                    key={opt}
                    onClick={() => toggleSet(selectedCategories, setSelectedCategories, opt)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 12px',
                      backgroundColor: selectedCategories.has(opt) ? 'var(--fill-weaker)' : 'transparent',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = selectedCategories.has(opt) ? 'var(--fill-weaker)' : 'transparent')}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      border: `1.5px solid ${selectedCategories.has(opt) ? 'var(--foreground)' : 'var(--border)'}`,
                      backgroundColor: selectedCategories.has(opt) ? 'var(--foreground)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selectedCategories.has(opt) && <Check size={10} style={{ color: 'var(--background)' }} strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{opt}</span>
                  </button>
                ))}
              {catSearch && !CATEGORY_OPTIONS.some(o => o.toLowerCase().includes(catSearch.toLowerCase())) && (
                <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-weak)' }}>No matches</div>
              )}
            </div>
            {selectedCategories.size > 0 && (
              <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setSelectedCategories(new Set())} style={{ fontSize: 12, color: 'var(--text-weak)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User dropdown */}
      <div ref={userFilterRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setUserFilterOpen(p => !p); setFilterOpen(false); setDateOpen(false); setCategoryOpen(false); setCatFilterOpen(false); setFileTypeOpen(false); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            border: '1px solid var(--border)',
            backgroundColor: selectedUsers.size > 0 ? 'var(--fill-weaker)' : 'transparent',
            color: 'var(--foreground)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          {selectedUsers.size === 0 ? 'User' : selectedUsers.size === 1 ? [...selectedUsers][0] : `${selectedUsers.size} users`}
          <ChevronDown size={11} style={{ opacity: 0.6 }} />
        </button>
        {userFilterOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            width: 220, zIndex: 400,
            backgroundColor: 'var(--raised)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.14)', overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  onKeyDown={e => e.stopPropagation()}
                  autoFocus
                  style={{
                    width: '100%', height: 28, padding: '0 28px 0 8px',
                    border: '1px solid var(--border)', borderRadius: 6,
                    backgroundColor: 'var(--fill-weaker)', color: 'var(--foreground)',
                    fontSize: 12, outline: 'none', fontFamily: 'inherit',
                  }}
                />
                <Search size={12} style={{ position: 'absolute', right: 8, color: 'var(--text-weak)', pointerEvents: 'none' }} />
              </div>
            </div>
            <div style={{ maxHeight: 260, overflowY: 'auto', padding: '4px 0' }}>
              {USER_OPTIONS
                .filter(opt => opt.toLowerCase().includes(userSearch.toLowerCase()))
                .map(opt => (
                  <button
                    key={opt}
                    onClick={() => toggleSet(selectedUsers, setSelectedUsers, opt)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 12px',
                      backgroundColor: selectedUsers.has(opt) ? 'var(--fill-weaker)' : 'transparent',
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = selectedUsers.has(opt) ? 'var(--fill-weaker)' : 'transparent')}
                  >
                    <div style={{
                      width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                      border: `1.5px solid ${selectedUsers.has(opt) ? 'var(--foreground)' : 'var(--border)'}`,
                      backgroundColor: selectedUsers.has(opt) ? 'var(--foreground)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {selectedUsers.has(opt) && <Check size={10} style={{ color: 'var(--background)' }} strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{opt}</span>
                  </button>
                ))}
              {userSearch && !USER_OPTIONS.some(o => o.toLowerCase().includes(userSearch.toLowerCase())) && (
                <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-weak)' }}>No matches</div>
              )}
            </div>
            {selectedUsers.size > 0 && (
              <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)' }}>
                <button onClick={() => setSelectedUsers(new Set())} style={{ fontSize: 12, color: 'var(--text-weak)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
