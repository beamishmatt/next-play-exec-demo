import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Video,
  FileText,
  Image,
  File,
  Loader2,
  LayoutGrid,
  FolderOpen,
  Users,
  Car,
  Smartphone,
} from 'lucide-react';
import { agentSearch } from '../engine/agentSearch';
import { SearchOutput, SearchEvidenceResult, MediaClass } from '../data/types';

// ─── Scope chips ──────────────────────────────────────────────────────────────

export interface ScopeChip {
  id: string;
  label: string;
  icon: React.ReactNode;
  filter: (r: SearchEvidenceResult) => boolean;
}

export const SCOPE_CHIPS: ScopeChip[] = [
  {
    id: 'all',
    label: 'All',
    icon: <LayoutGrid size={13} />,
    filter: () => true,
  },
  {
    id: 'cases',
    label: 'Cases',
    icon: <FolderOpen size={13} />,
    filter: (r) => !!r.case_id,
  },
  {
    id: 'evidence',
    label: 'Evidence',
    icon: <FileText size={13} />,
    filter: () => true,
  },
  {
    id: 'vehicles',
    label: 'Vehicles',
    icon: <Car size={13} />,
    filter: (r) => r.category?.toLowerCase().includes('vehicle') || r.tags?.some(t => t.toLowerCase().includes('vehicle')) || false,
  },
  {
    id: 'people',
    label: 'People',
    icon: <Users size={13} />,
    filter: (r) => r.category?.toLowerCase().includes('user') || r.officer !== undefined || false,
  },
  {
    id: 'devices',
    label: 'Devices',
    icon: <Smartphone size={13} />,
    filter: (r) => r.category?.toLowerCase().includes('device') || r.tags?.some(t => t.toLowerCase().includes('device')) || false,
  },
  {
    id: 'images',
    label: 'Images',
    icon: <Image size={13} />,
    filter: (r) => r.media_class === 'image',
  },
  {
    id: 'video',
    label: 'Video',
    icon: <Video size={13} />,
    filter: (r) => r.media_class === 'video',
  },
];

const RECENT_SEARCHES_KEY = 'command_recent_searches';

function loadRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || 'null') ?? [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string, current: string[]): string[] {
  const updated = [query, ...current.filter(s => s !== query)].slice(0, 10);
  try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  return updated;
}

const STOP_WORDS = new Set([
  'the', 'and', 'or', 'for', 'not', 'but', 'nor', 'yet', 'so',
  'a', 'an', 'in', 'on', 'at', 'to', 'of', 'up', 'by', 'as',
  'is', 'it', 'its', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'with', 'from', 'that', 'this', 'these',
  'those', 'there', 'their', 'they', 'what', 'which', 'who', 'when',
  'where', 'how', 'any', 'all', 'some', 'than', 'then', 'into', 'about',
]);

function SuggestionText({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong style={{ color: 'var(--foreground)', fontWeight: 600 }}>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim() || !text) return <>{text}</>;
  const words = query.trim().split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));
  if (words.length === 0) return <>{text}</>;
  const escaped = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const re = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(re);
  const matchRe = new RegExp(`^(?:${escaped})$`, 'i');
  return (
    <>
      {parts.map((part, i) =>
        matchRe.test(part)
          ? <mark key={i} style={{ backgroundColor: 'rgba(254,198,46,0.5)', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>{part}</mark>
          : part
      )}
    </>
  );
}

function MediaIcon({ mediaClass }: { mediaClass: MediaClass | string }) {
  const style: React.CSSProperties = { color: 'var(--text-weak)', flexShrink: 0 };
  switch (mediaClass) {
    case 'video': return <Video size={13} style={style} />;
    case 'image': return <Image size={13} style={style} />;
    case 'audio': return <File size={13} style={style} />;
    default: return <FileText size={13} style={style} />;
  }
}


function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

function ChipBadge({ chip, onRemove }: { chip: FilterChip; onRemove: (id: string) => void }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 8px 3px 10px', borderRadius: 99,
        backgroundColor: 'var(--fill-weaker)', border: '1px solid var(--border)',
        fontSize: 12, fontWeight: 500, color: 'var(--foreground)',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >
      {chip.label}
      <button
        onClick={() => onRemove(chip.id)}
        style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-weak)' }}
      >
        <X size={10} />
      </button>
    </span>
  );
}

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({ result, query, onClick }: { result: SearchEvidenceResult; query: string; onClick: () => void }) {
  const metaParts = [
    result.evidence_id ? `ID: ${result.evidence_id}` : null,
    formatDate(result.date_recorded) || null,
    result.officer || null,
  ].filter(Boolean).join(' • ');

  return (
    <button
      onClick={onClick}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        padding: '10px 14px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
      }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)', marginBottom: 3 }}>
        <HighlightText text={result.title} query={query} />
      </div>

      {/* Icon + meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: result.relevance ? 2 : 0 }}>
        <MediaIcon mediaClass={result.media_class} />
        <span style={{ fontSize: 12, color: 'var(--text-weak)' }}>{metaParts}</span>
      </div>

      {/* Matched on */}
      {result.relevance && (
        <div style={{ fontSize: 12, color: 'var(--text-weak)' }}>
          {result.relevance}
        </div>
      )}

    </button>
  );
}


// ─── Main component ───────────────────────────────────────────────────────────

interface SearchDropdownProps {
  inputRef: React.RefObject<HTMLInputElement>;
  query: string;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onOpenSearch: (query: string, selectedId?: string, output?: SearchOutput) => void;
}

export function SearchDropdown({ inputRef, query, onQueryChange, onClose, onOpenSearch }: SearchDropdownProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<SearchOutput | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [selectedScopes] = useState<Set<string>>(new Set());
  const searchVersion = useRef(0);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close on Esc
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [inputRef]);

  // Reset results when query clears
  useEffect(() => {
    if (query.trim().length < 3) {
      setOutput(null);
      setIsLoading(false);
    }
  }, [query]);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;

    setIsLoading(true);
    const version = ++searchVersion.current;

    const t = setTimeout(async () => {
      try {
        const result = await agentSearch(q, undefined, (partial) => {
          if (version !== searchVersion.current) return;
          setOutput(prev => ({
            summary: prev?.summary ?? '',
            results: partial,
            entities: prev?.entities ?? [],
            chips: prev?.chips ?? [],
            suggestions: prev?.suggestions ?? [],
            graph_context: prev?.graph_context ?? { cases_involved: [], total_scoped: 0, total_matched: 0 },
          }));
          setIsLoading(false);
        });
        if (version !== searchVersion.current) return;
        setOutput(result);
        const saved = saveRecentSearch(q, recentSearches);
        setRecentSearches(saved);
      } catch {
        // ignore
      } finally {
        if (version === searchVersion.current) setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [query]);

  const handleClear = () => {
    onQueryChange('');
    setOutput(null);
    inputRef.current?.focus();
  };

  const q = query.trim();
  const showRecents = q.length < 3;

  const autocompleteSuggestions = q.length > 0
    ? recentSearches
        .filter(s => s.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => {
          const aStarts = a.toLowerCase().startsWith(q.toLowerCase());
          const bStarts = b.toLowerCase().startsWith(q.toLowerCase());
          if (aStarts && !bStarts) return -1;
          if (!aStarts && bStarts) return 1;
          return 0;
        })
    : [];

  const activeScopes = SCOPE_CHIPS.filter(s => selectedScopes.has(s.id));
  const filteredResults = output
    ? (activeScopes.length > 0
        ? output.results.filter(r => activeScopes.some(s => s.filter(r)))
        : output.results)
    : [];
  const hasResults = filteredResults.length > 0;
  const topResults = filteredResults.slice(0, 5);
  const totalCount = output?.graph_context.total_matched ?? filteredResults.length ?? 0;

  // Derive cases and people from actual results, falling back to entities
  const uniqueCases = output
    ? [...new Set(output.results.map(r => r.case_id).filter(Boolean))]
    : [];
  const uniquePeople = output
    ? [...new Set(output.results.map(r => r.officer).filter(Boolean))]
    : [];
  const caseEntities = output?.entities.filter(e => e.type === 'case') ?? [];
  const officerEntities = output?.entities.filter(e => e.type === 'officer') ?? [];

  const dropdownVisible = isOpen && (showRecents ? true : (isLoading || hasResults || output !== null));

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: '1 1 0', minWidth: 0, maxWidth: 600 }}>

      {/* ── Input ── */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={15} style={{ position: 'absolute', left: 10, color: 'var(--text-weak)', pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          placeholder="Search evidence..."
          style={{
            width: '100%',
            height: 32,
            paddingLeft: 32,
            paddingRight: query ? 32 : 12,
            borderRadius: 6,
            border: '1px solid var(--border)',
            backgroundColor: 'transparent',
            color: 'var(--foreground)',
            fontSize: 13,
            outline: 'none',
          }}
        />
        {query && (
          <button
            onClick={handleClear}
            style={{
              position: 'absolute', right: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-weak)',
              borderRadius: 99,
            }}
          >
            <X size={13} />
          </button>
        )}
        {isLoading && !query && (
          <Loader2 size={13} style={{ position: 'absolute', right: 10, color: 'var(--text-weak)', animation: 'spin 1s linear infinite' }} />
        )}
      </div>

      {/* ── Dropdown panel ── */}
      {dropdownVisible && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--raised)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: 'var(--elevation-md)',
            zIndex: 200,
            overflow: 'hidden',
            paddingBottom: 12,
          }}
        >

          {/* ── Recent searches / Autocomplete suggestions ── */}
          {showRecents && (
            <>
              {/* Recent searches / Autocomplete suggestions */}
              {q.length === 0 ? (
                recentSearches.length > 0 && (
                  <>
                    <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-weak)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Recent
                    </div>
                    {recentSearches.slice(0, 5).map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { onQueryChange(s); setIsOpen(true); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 14px',
                          backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                          fontSize: 10, color: '#9ca3af', textAlign: 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Search size={10} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s}</span>
                      </button>
                    ))}
                  </>
                )
              ) : (
                autocompleteSuggestions.length > 0 && (
                  <>
                    <div style={{ padding: '8px 14px 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-weak)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Suggestions
                    </div>
                    {autocompleteSuggestions.slice(0, 5).map((s, i) => (
                      <button
                        key={i}
                        onClick={() => { onQueryChange(s); setIsOpen(true); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 14px',
                          backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                          fontSize: 10, color: '#9ca3af', textAlign: 'left',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <Search size={10} style={{ color: '#9ca3af', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <SuggestionText text={s} query={q} />
                        </span>
                      </button>
                    ))}
                  </>
                )
              )}
            </>
          )}

          {/* ── Results view ── */}
          {!showRecents && (
            <>
              {/* Loading state */}
              {isLoading && topResults.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px', color: 'var(--text-weak)', fontSize: 13 }}>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  Searching...
                </div>
              )}

              {/* No results state */}
              {!isLoading && output && topResults.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 14px' }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>No results for "{q}"</div>
                </div>
              )}

              {/* Top Matches */}
              {topResults.length > 0 && (
                <>
                  <div style={{ padding: '8px 14px 2px', fontSize: 11, fontWeight: 600, color: 'var(--text-weak)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Top Matches
                  </div>
                  {topResults.map((result, i) => (
                    <React.Fragment key={result.evidence_id}>
                      <ResultRow
                        result={result}
                        query={q}
                        onClick={() => { setIsOpen(false); onQueryChange(''); navigate(`/search/evidence/${result.evidence_id}`); }}
                      />
                      {i < topResults.length - 1 && (
                        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 14px' }} />
                      )}
                    </React.Fragment>
                  ))}
                </>
              )}

              {/* Footer: Other Results + entity chips + See all */}
              {topResults.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '8px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-weak)' }}>Other Results</span>
                    <button
                      onClick={() => { setIsOpen(false); onOpenSearch(q, undefined, output ?? undefined); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500, color: '#2563eb', padding: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      See all {totalCount > 0 ? totalCount : ''} results
                    </button>
                  </div>
                  <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '0 -14px 10px' }} />
                  {(uniqueCases.length > 0 || caseEntities.length > 0) && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-weak)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Cases</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(uniqueCases.length > 0 ? uniqueCases : caseEntities.map(e => e.name)).map((name, i) => (
                          <button
                            key={i}
                            onClick={() => { setIsOpen(false); onOpenSearch(q, undefined, output ?? undefined); }}
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--foreground)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {(uniqueCases.length > 0 || caseEntities.length > 0) && (uniquePeople.length > 0 || officerEntities.length > 0) && (
                    <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '10px -14px' }} />
                  )}
                  {(uniquePeople.length > 0 || officerEntities.length > 0) && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-weak)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>People</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {(uniquePeople.length > 0 ? uniquePeople : officerEntities.map(e => e.name)).map((name, i) => (
                          <button
                            key={i}
                            onClick={() => { setIsOpen(false); onOpenSearch(q, undefined, output ?? undefined); }}
                            style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 99, border: '1px solid var(--border)', backgroundColor: 'transparent', color: 'var(--foreground)', fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
