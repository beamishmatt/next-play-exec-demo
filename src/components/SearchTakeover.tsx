import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Search,
  Loader2,
  Video,
  FileText,
  Image,
  File,
  FolderOpen,
  Shield,
  ChevronDown,
  Hash,
  Calendar,
  User,
  Tag,
} from 'lucide-react';

import { Badge } from './ui/badge';
import { AssistantPanel } from './AssistantPanel';
import { getContextGraph } from '../storage/config';
import { agentSearch, SearchStep } from '../engine/agentSearch';
import {
  SearchOutput,
  SearchEvidenceResult,
  FilterChip,
  EntityResult,
  MediaClass,
} from '../data/types';

const RECENT_SEARCHES_KEY = 'command_recent_searches';

const PLACEHOLDER_RECENT: string[] = [
  'ID 2025 - 12345',
  'Uploads last week for officer 1223',
  'Man wearing red hat in piedmont park two weeks ago',
  'Body cam footage for case 33726',
  '2025-88292',
];

function loadRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || 'null') ?? PLACEHOLDER_RECENT;
  } catch {
    return PLACEHOLDER_RECENT;
  }
}

function saveRecentSearch(query: string, current: string[]): string[] {
  const updated = [query, ...current.filter(s => s !== query)].slice(0, 10);
  try { localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  return updated;
}

// ─── Media type icon ─────────────────────────────────────────────────────────

function MediaIcon({ mediaClass, size = 16 }: { mediaClass: MediaClass | string; size?: number }) {
  const props = { size, className: 'text-gray-500 shrink-0' };
  switch (mediaClass) {
    case 'video': return <Video {...props} />;
    case 'image': return <Image {...props} />;
    case 'audio': return <File {...props} />;
    default: return <FileText {...props} />;
  }
}

// ─── Filter chip ─────────────────────────────────────────────────────────────

function Chip({ chip, onRemove }: { chip: FilterChip; onRemove: (id: string) => void }) {
  return (
    <Badge variant="neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '4px 8px 4px 10px', borderRadius: 99, backgroundColor: '#e5e7eb', color: '#374151', whiteSpace: 'nowrap', border: 'none' }}>
      {chip.label}
      <button
        onClick={() => onRemove(chip.id)}
        style={{ display: 'flex', alignItems: 'center', color: '#6b7280', lineHeight: 1, background: 'none', border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
        aria-label={`Remove ${chip.label}`}
      >
        <X size={10} />
      </button>
    </Badge>
  );
}

// ─── Entity card (Other Results) ─────────────────────────────────────────────

function EntityCard({ entity }: { entity: EntityResult }) {
  const Icon = entity.type === 'case' ? FolderOpen : Shield;
  return (
    <button
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, padding: '12px 14px', borderRadius: 6, border: '1px solid var(--border)', backgroundColor: 'transparent', width: 160, flexShrink: 0, textAlign: 'left', cursor: 'pointer', transition: 'background-color 0.1s' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-weak)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <Icon size={13} style={{ color: '#9ca3af' }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{entity.name}</span>
      {entity.subtitle && (
        <span style={{ fontSize: 10, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{entity.subtitle}</span>
      )}
    </button>
  );
}

// ─── Evidence row ─────────────────────────────────────────────────────────────

function EvidenceRow({
  result,
  isSelected,
  query,
  onHover,
  isChecked,
  onCheck,
}: {
  result: SearchEvidenceResult;
  isSelected: boolean;
  query: string;
  onHover: () => void;
  isChecked: boolean;
  onCheck: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="w-full text-left flex transition-colors cursor-pointer pr-4"
      style={{
        backgroundColor: isSelected ? 'var(--fill-weaker)' : 'transparent',
      }}
      onMouseEnter={e => {
        onHover();
        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fill-weaker)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = isSelected ? 'var(--fill-weaker)' : 'transparent';
      }}
    >
      {/* Checkbox column */}
      <div
        className="flex items-center justify-center shrink-0 self-stretch px-3"
        onClick={onCheck}
        style={{ cursor: 'default' }}
      >
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => {}}
          onClick={e => { e.stopPropagation(); onCheck(e); }}
          className="w-3.5 h-3.5 rounded cursor-pointer"
          style={{ accentColor: '#000000' }}
        />
      </div>
      {/* Content */}
      <div className="flex flex-col py-3 pr-4 flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dangerouslySetInnerHTML={{ __html: highlightText(result.title, query) }} />
        <div className="flex items-center gap-1.5 mt-0.5">
          <MediaIcon mediaClass={result.media_class} size={12} />
          <p
            style={{ fontSize: 11, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            dangerouslySetInnerHTML={{ __html: [
              result.evidence_id && highlightText(result.evidence_id, query),
              result.case_id && highlightText(result.case_id, query),
              result.date_recorded && new Date(result.date_recorded).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
              result.officer && highlightText(result.officer, query),
              result.category && highlightText(result.category, query),
            ].filter(Boolean).join(' • ') }}
          />
        </div>
        {(result.excerpt || result.relevance) && (
          <p
            style={{ fontSize: 11, color: '#9ca3af', marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            dangerouslySetInnerHTML={{ __html: highlightText(result.excerpt || result.relevance || '', query) }}
          />
        )}
      </div>
    </div>
  );
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

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Layered input: a transparent-text backing div shows mark highlights beneath the real input
function HighlightInput({ inputRef, value, committedQuery, onChange, placeholder }: {
  inputRef?: React.RefObject<HTMLInputElement>;
  value: string;
  committedQuery: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  // Only highlight terms from the last completed search, not the live value
  const terms = new Set(
    (committedQuery ?? '')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOP_WORDS.has(w))
  );

  const highlighted = terms.size === 0
    ? escapeHtml(value ?? '')
    : (value ?? '')
        .split(/(\s+)/)
        .map(part => {
          if (!part) return '';
          if (/^\s+$/.test(part)) return part;
          if (terms.has(part.toLowerCase())) {
            return `<mark style="background:#bfdbfe;color:inherit;border-radius:2px;padding:0 1px;">${escapeHtml(part)}</mark>`;
          }
          return escapeHtml(part);
        })
        .join('');

  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          paddingLeft: 16, paddingRight: 48,
          fontSize: 14, lineHeight: '52px',
          fontFamily: 'inherit', letterSpacing: 'normal',
          whiteSpace: 'pre', overflow: 'hidden',
          pointerEvents: 'none', color: 'transparent',
          borderRadius: 6, boxSizing: 'border-box',
        }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
      <input
        ref={inputRef}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-4 pr-12 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-gray-300"
        style={{ height: 52, border: '1px solid var(--border)', background: 'transparent', position: 'relative' }}
      />
    </>
  );
}

function highlightText(text: string, query: string): string {
  if (!query.trim()) return text;
  const words = query
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()))
    .map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (words.length === 0) return text;
  const regex = new RegExp(`(${words.join('|')})`, 'gi');
  const result = text.replace(regex, '<mark style="background:#bfdbfe;color:inherit;border-radius:2px;padding:0 1px;">$1</mark>');
  return result;
}

// ─── Preview panel ────────────────────────────────────────────────────────────

function PreviewPanel({ result }: { result: SearchEvidenceResult }) {
  const formattedDate = result.date_recorded
    ? new Date(result.date_recorded).toLocaleDateString('en-US', {
        month: '2-digit', day: '2-digit', year: 'numeric',
      })
    : undefined;

  const isDocument = ['pdf', 'document', 'text'].includes(result.media_class);
  const isMedia = ['image', 'video'].includes(result.media_class);
  const bodyText = result.excerpt || result.relevance;

  return (
    <div style={{ width: 310, maxWidth: 310, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Two-part card */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top: image/video thumbnail for media, text excerpt for documents */}
        {isMedia && result.thumbnailUrl ? (
          <div style={{ flexShrink: 0 }}>
            <img
              src={result.thumbnailUrl}
              alt={result.title}
              style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ padding: '10px 14px' }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', margin: 0 }}>{result.title}</p>
            </div>
          </div>
        ) : (
          <div style={{ flexShrink: 0, overflowY: isDocument ? 'auto' : 'visible', padding: 14 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', marginBottom: bodyText ? 8 : 0 }}>{result.title}</p>
            {bodyText && (
              <p style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6, margin: 0 }}>{bodyText}</p>
            )}
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'var(--border)', flexShrink: 0 }} />

        {/* Bottom: metadata badges */}
        <div style={{ flexShrink: 0, padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {([
            result.case_id   ? { value: result.case_id,   Icon: Hash     } : null,
            formattedDate    ? { value: formattedDate,     Icon: Calendar } : null,
            result.officer   ? { value: result.officer,   Icon: User     } : null,
            result.category  ? { value: result.category,  Icon: Tag      } : null,
          ] as const).filter(Boolean).map(({ value, Icon }, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, padding: '4px 10px', borderRadius: 99, backgroundColor: 'transparent', border: '1px solid var(--border)', color: '#374151', whiteSpace: 'nowrap' }}>
              <Icon size={11} strokeWidth={2} />
              {value}
            </span>
          ))}
        </div>
      </div>

      {/* View evidence button */}
      <button style={{ alignSelf: 'center', padding: '6px 14px', borderRadius: 6, backgroundColor: '#111827', color: '#fff', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', flexShrink: 0 }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1f2937')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#111827')}
      >
        View evidence
      </button>
    </div>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="px-4 py-3 flex gap-3 items-start">
      <div style={{ width: 16, height: 16, borderRadius: 3, backgroundColor: 'var(--border)', marginTop: 2, flexShrink: 0 }} className="animate-pulse" />
      <div className="flex-1 flex flex-col gap-2">
        <div style={{ height: 13, width: '55%', borderRadius: 3, backgroundColor: 'var(--border)' }} className="animate-pulse" />
        <div style={{ height: 11, width: '35%', borderRadius: 3, backgroundColor: 'var(--border)' }} className="animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonEntityCards() {
  return (
    <div style={{ marginBottom: 24, paddingTop: 8 }}>
      <div style={{ height: 12, width: 80, borderRadius: 3, backgroundColor: 'var(--border)', marginBottom: 16 }} className="animate-pulse" />
      <div style={{ display: 'flex', gap: 8 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: 160, height: 72, borderRadius: 6, backgroundColor: 'var(--border)' }} className="animate-pulse" />
        ))}
      </div>
    </div>
  );
}

function SkeletonPreview() {
  return (
    <div className="shrink-0 flex flex-col gap-3" style={{ width: 310, maxWidth: 310 }}>
      <div style={{ border: '1px solid var(--border)', borderRadius: 6, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ height: 13, width: '65%', borderRadius: 3, backgroundColor: 'var(--border)' }} className="animate-pulse" />
        {[55, 40, 50].map((w, i) => (
          <div key={i} style={{ height: 11, width: `${w}%`, borderRadius: 3, backgroundColor: 'var(--border)' }} className="animate-pulse" />
        ))}
        <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '4px 0' }} />
        {[90, 85, 80, 70].map((w, i) => (
          <div key={i} style={{ height: 11, width: `${w}%`, borderRadius: 3, backgroundColor: 'var(--border)' }} className="animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface SearchTakeoverProps {
  onClose: () => void;
}

export function SearchTakeover({ onClose }: SearchTakeoverProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [committedQuery, setCommittedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchOutput, setSearchOutput] = useState<SearchOutput | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeChips, setActiveChips] = useState<FilterChip[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [showTechDocs, setShowTechDocs] = useState(false);

  // Version counter — incremented on each search; stale results are discarded
  const searchVersion = useRef(0);

  // Focus on mount, close on Esc
  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const runSearch = async (q: string) => {
    const version = ++searchVersion.current;
    setIsLoading(true);

    try {
      const output = await agentSearch(q, () => {});
      if (version !== searchVersion.current) return; // stale — newer search started
      setSearchOutput(output);
      setCommittedQuery(q);
      setActiveChips(output.chips);
      if (output.results.length > 0) setSelectedId(output.results[0].evidence_id);
    } catch (err) {
      if (version !== searchVersion.current) return;
      console.error('Search failed:', err);
    } finally {
      if (version === searchVersion.current) setIsLoading(false);
    }
  };

  // Debounce: 500ms after last keystroke, min 3 chars
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) return;
    const t = setTimeout(() => {
      saveRecentSearch(q, recentSearches);
      runSearch(q);
    }, 500);
    return () => clearTimeout(t);
  }, [query]);

  const handleRecentClick = (s: string) => {
    setQuery(s);
    saveRecentSearch(s, recentSearches);
    runSearch(s);
  };

  const handleRemoveChip = (chipId: string) => {
    setActiveChips(prev => prev.filter(c => c.id !== chipId));
  };

  const selectedEvidence = searchOutput?.results.find(r => r.evidence_id === selectedId);
  const hasResults = searchOutput !== null;
  const isAssistantOpen = checkedIds.size > 0;

  const checkedItems = (() => {
    if (!searchOutput) return [];
    const graph = getContextGraph();
    return searchOutput.results
      .filter(r => checkedIds.has(r.evidence_id))
      .map(r => {
        const node = graph.nodes[r.evidence_id];
        return {
          id: r.evidence_id,
          title: r.title,
          vector_file_id: node?.vector_file_id,
          description: node?.description,
          category: r.category,
          officer: r.officer,
          date_recorded: r.date_recorded,
          media_class: r.media_class,
          objects_detected: node?.objects_detected?.map(o => `${o.color ? o.color + ' ' : ''}${o.label}`).join(', '),
        };
      });
  })();

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--base)' }}>
      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{ height: 52, borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="transition-colors"
            aria-label="Close"
            style={{ padding: '6px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-weak)', backgroundColor: 'transparent' }}
          >
            <X size={16} />
          </button>
          <span style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--font-weight-medium)', color: 'var(--text-high-contrast)' }}>Search</span>
        </div>
        <button
          onClick={() => setShowTechDocs(true)}
          style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-weak)', backgroundColor: 'transparent', lineHeight: '18px', cursor: 'pointer' }}
        >
          Technical docs
        </button>
      </div>

      {/* ── Content ── */}
      {!hasResults ? (
        /* ── Empty state ── */
        <div className="flex-1 overflow-y-auto px-4" style={{ paddingTop: 48 }}>
          <div style={{ maxWidth: '70%', margin: '0 auto' }}>
            <div className="relative" style={{ padding: '2px 2px', overflow: 'visible' }}>
              <HighlightInput
                inputRef={inputRef}
                value={query}
                committedQuery={committedQuery}
                onChange={setQuery}
                placeholder="Describe what you want to find..."
              />
              <button
                onClick={() => { if (query.trim()) { setQuery(''); setCommittedQuery(''); setSearchOutput(null); setActiveChips([]); setSelectedId(null); } }}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
                aria-label="Clear"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : query ? <X size={16} /> : <Search size={16} />}
              </button>
            </div>

            {/* Skeleton rows while first search is running */}
            {isLoading && (
              <div className="mt-6">
                {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
              </div>
            )}

            {/* Recent searches */}
            {!isLoading && (
              <div style={{ marginTop: 48 }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: '#4b5563', marginBottom: 8 }}>Recent searches</p>
                {recentSearches.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleRecentClick(s)}
                    style={{ color: 'var(--text-weak)', fontSize: 14, textAlign: 'left', padding: '12px 0', display: 'block', width: '100%', background: 'none', borderBottom: '1px solid var(--border)' }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Results state ── */
        <div className="flex-1 overflow-hidden flex">
          {/* Centering shell — centers main content within remaining space, preserving original layout */}
          <div className="flex-1 overflow-hidden flex flex-col items-center">
          {/* Main results area — same 70% centered layout as original */}
          <div className="flex-1 overflow-hidden flex flex-col" style={{ width: '100%', maxWidth: isAssistantOpen ? '92%' : '70%', paddingTop: 48, transition: 'max-width 400ms cubic-bezier(0, 0.74, 0, 1)' }}>
            {/* Search input */}
            <div className="relative" style={{ marginBottom: 8, padding: '2px 2px', overflow: 'visible' }}>
              <HighlightInput
                inputRef={inputRef}
                value={query}
                onChange={setQuery}
                placeholder="Describe what you want to find..."
              />
              <button
                onClick={() => { if (query.trim()) { setQuery(''); setCommittedQuery(''); setSearchOutput(null); setActiveChips([]); setSelectedId(null); } }}
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-40 transition-colors"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : query ? <X size={16} /> : <Search size={16} />}
              </button>
            </div>

            {/* Two-column layout: results list + preview card */}
            <div className="flex-1 overflow-hidden flex gap-6">

              {/* Left column */}
              <div className="flex-1 overflow-hidden flex flex-col min-w-0">

                {/* Filter chips */}
                {activeChips.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
                    {activeChips.map(chip => (
                      <Chip key={chip.id} chip={chip} onRemove={handleRemoveChip} />
                    ))}
                  </div>
                )}

                {/* Other Results */}
                {isLoading
                  ? <SkeletonEntityCards />
                  : searchOutput.entities.length > 0 && (
                    <div style={{ marginBottom: 24, paddingTop: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 500, color: '#4b5563', marginBottom: 8 }}>Other Results</p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 8 }}>
                        {searchOutput.entities.map(e => (
                          <EntityCard key={`${e.type}:${e.id}`} entity={e} />
                        ))}
                      </div>
                    </div>
                  )
                }

                {/* Results header */}
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#4b5563' }}>
                    Results{searchOutput.results.length > 0 ? ` (${searchOutput.results.length})` : ''}
                  </p>
                  <div className="flex items-center gap-3">
                    {searchOutput.results.length > 0 && !isLoading && (
                      <label className="flex items-center gap-1.5 cursor-pointer select-none" style={{ fontSize: 12, color: '#6b7280' }}>
                        <input
                          type="checkbox"
                          checked={searchOutput.results.length > 0 && searchOutput.results.every(r => checkedIds.has(r.evidence_id))}
                          ref={el => {
                            if (el) el.indeterminate = checkedIds.size > 0 && !searchOutput.results.every(r => checkedIds.has(r.evidence_id));
                          }}
                          onChange={e => {
                            setCheckedIds(e.target.checked
                              ? new Set(searchOutput.results.map(r => r.evidence_id))
                              : new Set()
                            );
                          }}
                          style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#1a73e8' }}
                        />
                        Select all
                      </label>
                    )}
                    <button className="flex items-center gap-1 transition-colors" style={{ fontSize: 12, color: '#6b7280' }}>
                      Best matches
                      <ChevronDown size={11} />
                    </button>
                  </div>
                </div>

                {/* No results */}
                {searchOutput.results.length === 0 && !isLoading && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                    <Search size={32} className="text-gray-200 mb-3" />
                    <p className="text-[14px] text-gray-500 font-medium">No evidence found</p>
                    <p className="text-[13px] text-gray-400 mt-1">
                      {searchOutput.summary || 'Try uploading evidence first, or refine your query.'}
                    </p>
                    {searchOutput.suggestions.length > 0 && (
                      <div className="mt-6 flex flex-col gap-2">
                        {searchOutput.suggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => { setQuery(s); saveRecentSearch(s, recentSearches); runSearch(s); }}
                            className="text-[13px] text-[#1a73e8] hover:underline"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Results list */}
                {(isLoading || searchOutput.results.length > 0) && (
                  <div className="flex-1 overflow-y-auto">
                    {isLoading
                      ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                      : searchOutput.results.map(result => (
                          <EvidenceRow
                            key={result.evidence_id}
                            result={result}
                            isSelected={result.evidence_id === selectedId}
                            query={query}
                            onHover={() => setSelectedId(result.evidence_id)}
                            isChecked={checkedIds.has(result.evidence_id)}
                            onCheck={e => {
                              e.stopPropagation();
                              setCheckedIds(prev => {
                                const next = new Set(prev);
                                next.has(result.evidence_id) ? next.delete(result.evidence_id) : next.add(result.evidence_id);
                                return next;
                              });
                            }}
                          />
                        ))
                    }
                  </div>
                )}
              </div>

              {/* Right column — preview card */}
              <div style={{ width: 310, maxWidth: 310, flexShrink: 0 }}>
                {isLoading ? <SkeletonPreview /> : selectedEvidence && <PreviewPanel result={selectedEvidence} />}
              </div>

            </div>
          </div>
          </div>{/* end centering shell */}

          {/* Assistant panel — slides in from the right when items are checked */}
          <AssistantPanel
            isOpen={isAssistantOpen}
            items={checkedItems}
            onClose={() => setCheckedIds(new Set())}
          />
        </div>
      )}

      {/* Technical docs drawer */}
      {showTechDocs && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowTechDocs(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 200 }}
          />
          {/* Drawer */}
          <div style={{
            position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '90vw',
            backgroundColor: 'var(--bg-surface, #fff)', borderLeft: '1px solid var(--border)',
            zIndex: 201, overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}>
            {/* Drawer header */}
            <div className="flex items-center justify-between" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-high-contrast)' }}>Technical Documentation</span>
              <button
                onClick={() => setShowTechDocs(false)}
                style={{ padding: 4, borderRadius: 4, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-weak)' }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Drawer content */}
            <div style={{ padding: '24px 20px', fontSize: 13, lineHeight: 1.65, color: 'var(--text-high-contrast)', display: 'flex', flexDirection: 'column', gap: 28 }}>

              {/* Overview */}
              <section>
                <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-weak)', marginBottom: 10 }}>Overview</h2>
                <p style={{ color: 'var(--text-medium, #374151)' }}>
                  Search runs a four-stage agentic pipeline. Each natural language query is parsed into
                  structured intent, scoped against a local evidence graph, retrieved from a semantic vector
                  store, and finally synthesized into ranked results by an LLM.
                </p>
              </section>

              {/* Stage 1 */}
              <section>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: 'var(--bg-subtle, #f3f4f6)', borderRadius: 4, padding: '1px 7px', color: 'var(--text-weak)' }}>Step 1</span>
                  <h3 style={{ fontSize: 13, fontWeight: 600 }}>Query Analysis</h3>
                </div>
                <p style={{ color: 'var(--text-medium, #374151)', marginBottom: 8 }}>
                  The raw query is sent to <code style={codeStyle}>gpt-4o-mini</code> with a structured
                  extraction prompt (<code style={codeStyle}>queryAnalysis.ts</code>). The model returns JSON
                  with the following fields:
                </p>
                <ul style={listStyle}>
                  <li><strong>intent</strong> — one of <em>lookup, investigation, comparison, timeline, relationship, object_search</em></li>
                  <li><strong>entities</strong> — case IDs, officers, date ranges, evidence types, locations, detected objects, keywords, categories</li>
                  <li><strong>reformulated_query</strong> — a cleaner restatement used for vector search</li>
                  <li><strong>search_strategy</strong> — a short description of how to search</li>
                </ul>
                <p style={{ color: 'var(--text-medium, #374151)' }}>
                  The structured output drives filter chips displayed below the search bar.
                </p>
              </section>

              {/* Stage 2 */}
              <section>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: 'var(--bg-subtle, #f3f4f6)', borderRadius: 4, padding: '1px 7px', color: 'var(--text-weak)' }}>Step 2</span>
                  <h3 style={{ fontSize: 13, fontWeight: 600 }}>Graph Scoping</h3>
                </div>
                <p style={{ color: 'var(--text-medium, #374151)', marginBottom: 8 }}>
                  The local evidence graph (<code style={codeStyle}>graphScope.ts</code>) is filtered down to a
                  candidate set before any network calls. This keeps synthesis prompts small and focused.
                </p>
                <ul style={listStyle}>
                  <li>If structured entities are present, nodes are filtered sequentially: evidence type → date range → officer → case ID → category → detected objects.</li>
                  <li>If strict filters eliminate everything, the engine falls back to <strong>fuzzy keyword matching</strong> across title, description, category, officer, case ID, source, detected objects, and tags.</li>
                  <li>Once a candidate set is found, <strong>graph edges are traversed one hop</strong> to pull in directly related evidence nodes, broadening recall without opening the full corpus.</li>
                </ul>
              </section>

              {/* Stage 3 */}
              <section>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: 'var(--bg-subtle, #f3f4f6)', borderRadius: 4, padding: '1px 7px', color: 'var(--text-weak)' }}>Step 3</span>
                  <h3 style={{ fontSize: 13, fontWeight: 600 }}>Vector Retrieval</h3>
                </div>
                <p style={{ color: 'var(--text-medium, #374151)', marginBottom: 8 }}>
                  Evidence files are indexed in an <strong>OpenAI vector store</strong>. At search time,
                  <code style={codeStyle}>vectorRetrieval.ts</code> queries the store with the reformulated query
                  plus a focus hint listing the titles of graph-scoped nodes. Up to 10 chunks are returned.
                </p>
                <p style={{ color: 'var(--text-medium, #374151)' }}>
                  The vector store is created lazily on first use and its ID is persisted locally.
                  Retrieved chunk text is passed verbatim to synthesis so the LLM can extract
                  direct quotes for result excerpts.
                </p>
              </section>

              {/* Stage 4 */}
              <section>
                <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, backgroundColor: 'var(--bg-subtle, #f3f4f6)', borderRadius: 4, padding: '1px 7px', color: 'var(--text-weak)' }}>Step 4</span>
                  <h3 style={{ fontSize: 13, fontWeight: 600 }}>Synthesis</h3>
                </div>
                <p style={{ color: 'var(--text-medium, #374151)', marginBottom: 8 }}>
                  <code style={codeStyle}>synthesis.ts</code> sends the scoped graph nodes and vector text to
                  <code style={codeStyle}>gpt-4o-mini</code> with a ranking prompt. The model returns:
                </p>
                <ul style={listStyle}>
                  <li><strong>summary</strong> — a one-sentence description of what was found</li>
                  <li><strong>results</strong> — ranked evidence items, each with title, media class, case ID, officer, category, a one-sentence relevance explanation, a verbatim excerpt from file content, and a confidence level (high / medium / low)</li>
                  <li><strong>suggestions</strong> — follow-up query ideas</li>
                </ul>
                <p style={{ color: 'var(--text-medium, #374151)' }}>
                  After synthesis, supplemental <em>Other Results</em> entity cards are built from any
                  case IDs present in results but not already extracted from the query. Case ID variants
                  (e.g. <code style={codeStyle}>088142</code>, <code style={codeStyle}>2025-088142</code>,{' '}
                  <code style={codeStyle}>PBPD-2025-088142</code>) are normalised to their base number and
                  deduplicated before display.
                </p>
              </section>

              {/* Assistant */}
              <section>
                <h2 style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-weak)', marginBottom: 10 }}>Evidence Assistant</h2>
                <p style={{ color: 'var(--text-medium, #374151)', marginBottom: 8 }}>
                  Selecting one or more evidence items from the results list opens an AI chat panel
                  (<code style={codeStyle}>AssistantPanel</code>) anchored to the right side of the search view.
                  The assistant is scoped strictly to the selected items — it cannot reference evidence
                  outside the selection.
                </p>
                <p style={{ color: 'var(--text-medium, #374151)', marginBottom: 8 }}>
                  Each turn in <code style={codeStyle}>assistantChat.ts</code> runs two operations before calling the model:
                </p>
                <ul style={listStyle}>
                  <li><strong>Vector scoping</strong> — the vector store is queried using the selected item titles plus the user's message as a combined hint (up to 20 chunks). Only chunks whose file IDs match the selected evidence are kept, ensuring the model sees actual file content rather than unrelated documents.</li>
                  <li><strong>System prompt construction</strong> — a structured prompt is assembled containing metadata for each selected item (title, ID, category, officer, date, type, description, detected objects) followed by the scoped vector text. The model is instructed to cite evidence IDs inline using bracket notation (e.g. <code style={codeStyle}>[EV-16M3TQA7]</code>).</li>
                </ul>
                <p style={{ color: 'var(--text-medium, #374151)', marginBottom: 8 }}>
                  The model is <code style={codeStyle}>gpt-4o</code> with streaming enabled — response tokens
                  are appended to the message in real time. After streaming completes, items whose vector
                  file IDs contributed chunks are returned as sources and rendered as hoverable citation
                  marks next to the assistant's reply.
                </p>
                <p style={{ color: 'var(--text-medium, #374151)' }}>
                  Conversation history is maintained in local component state and passed to each subsequent
                  call, enabling multi-turn investigation threads. Clicking <em>New chat</em> clears the
                  history without deselecting the evidence.
                </p>
              </section>

            </div>
          </div>
        </>
      )}
    </div>
  );
}

const codeStyle: React.CSSProperties = {
  fontFamily: 'monospace',
  fontSize: 11.5,
  backgroundColor: 'var(--bg-subtle, #f3f4f6)',
  borderRadius: 3,
  padding: '1px 4px',
};

const listStyle: React.CSSProperties = {
  paddingLeft: 18,
  marginBottom: 8,
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  color: 'var(--text-medium, #374151)',
};
