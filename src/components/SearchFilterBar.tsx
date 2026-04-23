import React, { useState, useRef, useEffect } from 'react';
import {
  SlidersHorizontal, ChevronDown, Search, Check,
  Video, Image, FileText,
} from 'lucide-react';
import { SearchEvidenceResult } from '../data/types';

// ─── Shared constants ─────────────────────────────────────────────────────────

export const CATEGORY_OPTIONS = [
  'Homicide', 'Burglary', 'DUI', 'Assault', 'Robbery', 'Theft',
  'Shooting', 'Domestic Violence', 'Drug Offense', 'Traffic Stop',
  'Vandalism', 'Police Event', 'Other',
];

export const DATE_OPTIONS = ['Last 24 hours', 'Last 7 days', 'Last 30 days', 'Last 90 days', 'Last year'];

const STATUS_OPTIONS = ['Active', 'Inactive', 'Archived', 'Under Review', 'Flagged'];
const SOURCE_OPTIONS = ['Body Worn Cameras', 'Dash Cameras', 'Drones', 'Interview Room', 'CCTV', 'Mobile', 'Doorbell', 'Surveillance', 'Laptop', 'Desktop', 'Tablet', 'Other', 'Unknown'];

export const MEDIA_TYPE_CHIPS: { id: string; label: string; Icon: React.ElementType; match: (r: SearchEvidenceResult) => boolean }[] = [
  { id: 'videos',    label: 'Videos',    Icon: Video,    match: r => r.media_class === 'video' },
  { id: 'images',    label: 'Images',    Icon: Image,    match: r => r.media_class === 'image' },
  { id: 'documents', label: 'Documents', Icon: FileText, match: r => r.media_class === 'document' || r.media_class === 'pdf' || r.media_class === 'text' },
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
    const activeMedia = MEDIA_TYPE_CHIPS.filter(c => selectedMediaTypes.has(c.id));
    if (activeMedia.length > 0) out = out.filter(r => activeMedia.some(c => c.match(r)));
    return out;
  };

  return {
    selectedStatuses, setSelectedStatuses,
    selectedSources, setSelectedSources,
    selectedCategories, setSelectedCategories,
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
    selectedDates, setSelectedDates,
    selectedMediaTypes, setSelectedMediaTypes,
    toggleSet,
  } = filters;

  const filterRef   = useRef<HTMLDivElement>(null);
  const dateRef     = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const categorySearchRef = useRef<HTMLInputElement>(null);

  const [filterOpen,   setFilterOpen]   = useState(false);
  const [dateOpen,     setDateOpen]     = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current   && !filterRef.current.contains(e.target as Node))   { setFilterOpen(false); }
      if (dateRef.current     && !dateRef.current.contains(e.target as Node))     { setDateOpen(false); }
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) { setCategoryOpen(false); setCategorySearch(''); }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>

      {/* Filter dropdown */}
      <div ref={filterRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setFilterOpen(p => !p); setDateOpen(false); setCategoryOpen(false); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 99,
            border: '1px solid var(--border)', backgroundColor: 'transparent',
            color: 'var(--foreground)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <SlidersHorizontal size={12} />
          Filter
          <ChevronDown size={11} style={{ opacity: 0.6 }} />
        </button>
        {filterOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            width: 240, zIndex: 400,
            backgroundColor: 'var(--raised)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.14)',
            padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 14,
          }}>
            <FilterSection label="Status" options={STATUS_OPTIONS} selected={selectedStatuses} onToggle={v => toggleSet(selectedStatuses, setSelectedStatuses, v)} />
            <FilterSection label="Source" options={SOURCE_OPTIONS} selected={selectedSources}  onToggle={v => toggleSet(selectedSources,  setSelectedSources,  v)} />
          </div>
        )}
      </div>

      {/* Category dropdown */}
      <div ref={categoryRef} style={{ position: 'relative' }}>
        <button
          onClick={() => {
            const next = !categoryOpen;
            setCategoryOpen(next); setFilterOpen(false); setDateOpen(false);
            if (next) { setCategorySearch(''); setTimeout(() => categorySearchRef.current?.focus(), 0); }
          }}
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
        {categoryOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', left: 0,
            width: 200, zIndex: 400,
            backgroundColor: 'var(--raised)', border: '1px solid var(--border)',
            borderRadius: 10, boxShadow: '0 6px 20px rgba(0,0,0,0.14)', overflow: 'hidden',
          }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={12} style={{ position: 'absolute', left: 8, color: 'var(--text-weak)', pointerEvents: 'none' }} />
                <input
                  ref={categorySearchRef}
                  type="text"
                  value={categorySearch}
                  onChange={e => setCategorySearch(e.target.value)}
                  placeholder="Search categories..."
                  onKeyDown={e => e.stopPropagation()}
                  style={{
                    width: '100%', height: 28, paddingLeft: 26, paddingRight: 8,
                    border: '1px solid var(--border)', borderRadius: 6,
                    backgroundColor: 'var(--fill-weaker)', color: 'var(--foreground)',
                    fontSize: 12, outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </div>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
              {CATEGORY_OPTIONS.filter(opt => opt.toLowerCase().includes(categorySearch.toLowerCase())).map(opt => (
                <button
                  key={opt}
                  onClick={() => toggleSet(selectedCategories, setSelectedCategories, opt)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 12px',
                    backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
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
              {categorySearch && !CATEGORY_OPTIONS.some(o => o.toLowerCase().includes(categorySearch.toLowerCase())) && (
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

      {/* Date dropdown */}
      <div ref={dateRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setDateOpen(p => !p); setFilterOpen(false); setCategoryOpen(false); }}
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

      {/* Media type toggle chips */}
      {MEDIA_TYPE_CHIPS.map(chip => {
        const active = selectedMediaTypes.has(chip.id);
        const color = active ? '#fff' : 'var(--foreground)';
        return (
          <button
            key={chip.id}
            onClick={() => toggleSet(selectedMediaTypes, setSelectedMediaTypes, chip.id)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 99,
              border: `1px solid ${active ? 'var(--foreground)' : 'var(--border)'}`,
              backgroundColor: active ? 'var(--foreground)' : 'transparent',
              color, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <chip.Icon size={12} style={{ color }} />
            {chip.label}
          </button>
        );
      })}

    </div>
  );
}
