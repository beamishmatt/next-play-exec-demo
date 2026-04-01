import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  ChevronRight,
  ChevronLeft,
  Hash,
  Calendar,
  User,
  Tag,
  Users,
  Car,
  Sparkles,
  Headphones,
} from 'lucide-react';

import { Badge } from './ui/badge';
import { SCOPE_CHIPS } from './SearchDropdown';
import { AssistantPanel } from './AssistantPanel';
import { FeedbackDrawer } from './FeedbackDrawer';
import { getContextGraph, updateGraphNode } from '../storage/config';
import { agentSearch, generateAndSaveDescription, SearchStep } from '../engine/agentSearch';
import {
  AgentAction,
  SearchOutput,
  SearchEvidenceResult,
  FilterChip,
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

// ─── Person row ──────────────────────────────────────────────────────────────

// ─── Entity scroll row ────────────────────────────────────────────────────────

function EntityScrollRow({ children, count }: { children: React.ReactNode; count: number }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => { updateScrollState(); }, [count]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' });
    setTimeout(updateScrollState, 300);
  };

  const btnStyle: React.CSSProperties = {
    width: 26, height: 26, borderRadius: '50%', border: 'none',
    backgroundColor: '#374151', color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background-color 0.1s', flexShrink: 0, position: 'relative', zIndex: 1,
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        style={{ display: 'flex', gap: 6, overflowX: 'hidden', paddingBottom: 2 }}
      >
        {children}
      </div>

      {canScrollLeft && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 2, width: 64,
          background: 'linear-gradient(to right, var(--base) 40%, transparent 100%)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', paddingLeft: 6,
        }}>
          <button onClick={() => scroll('left')} style={btnStyle}>
            <ChevronLeft size={13} />
          </button>
        </div>
      )}

      {canScrollRight && (
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 2, width: 64,
          background: 'linear-gradient(to left, var(--base) 40%, transparent 100%)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6,
        }}>
          <button onClick={() => scroll('right')} style={btnStyle}>
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Person card ─────────────────────────────────────────────────────────────

function PersonCard({ name }: { name: string }) {
  const initials = name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  const parts = name.split(' ');
  const lastName = parts[0] ?? name;
  const subtitle = parts.length > 1 ? parts.slice(1).join(' ') : '';
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', borderRadius: 6, border: 'none', backgroundColor: 'var(--fill-weak)', flexShrink: 0, cursor: 'pointer', transition: 'background-color 0.1s', width: 160 }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fill-hover)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fill-weak)'}
    >
      <Shield size={18} style={{ color: '#9ca3af' }} />
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        {subtitle && <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>Officer</p>}
      </div>
    </div>
  );
}

// ─── Case card ───────────────────────────────────────────────────────────────

function CaseCard({ name }: { name: string }) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', borderRadius: 6, border: 'none', backgroundColor: 'var(--fill-weak)', flexShrink: 0, cursor: 'pointer', transition: 'background-color 0.1s', width: 160 }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fill-hover)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fill-weak)'}
    >
      <FolderOpen size={18} style={{ color: '#9ca3af' }} />
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <p style={{ fontSize: 11, color: '#6b7280', margin: '2px 0 0' }}>Case</p>
      </div>
    </div>
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
            style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
            style={{ fontSize: 12, color: '#9ca3af', marginTop: 3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
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
function HighlightInput({ inputRef, value, committedQuery, chipTerms, onChange, placeholder }: {
  inputRef?: React.RefObject<HTMLInputElement>;
  value: string;
  committedQuery?: string;
  chipTerms?: string[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  // Build a set of individual words extracted from chip values
  const goldTerms = new Set(
    (chipTerms ?? [])
      .flatMap(t => t.toLowerCase().split(/\s+/))
      .filter(w => w.length > 1)
  );

  const highlighted = goldTerms.size === 0
    ? escapeHtml(value ?? '')
    : (value ?? '')
        .split(/(\s+)/)
        .map(part => {
          if (!part) return '';
          if (/^\s+$/.test(part)) return part;
          if (goldTerms.has(part.toLowerCase())) {
            return `<mark style="background:rgba(254,198,46,0.5);color:transparent;border-radius:2px;">${escapeHtml(part)}</mark>`;
          }
          return escapeHtml(part);
        })
        .join('');

  return (
    <div style={{ position: 'relative', height: 52 }}>
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0,
          border: '1px solid transparent',
          paddingLeft: 16, paddingRight: 48,
          font: 'inherit', fontSize: 14,
          lineHeight: '50px',
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
        className="w-full pl-4 pr-12 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300"
        style={{ position: 'absolute', inset: 0, height: 52, border: '1px solid var(--border)', background: 'transparent', boxSizing: 'border-box', fontSize: 14, fontFamily: 'inherit' }}
      />
    </div>
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
  const result = text.replace(regex, '<mark style="background:rgba(254,198,46,0.5);color:inherit;border-radius:2px;padding:0 1px;">$1</mark>');
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

  const bodyText = result.excerpt || result.relevance || '';

  return (
    <div style={{ width: 310, maxWidth: 310, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Two-part card */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, backgroundColor: 'transparent', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top: thumbnail for media (+ description below), text for documents */}
        {isMedia && result.thumbnailUrl ? (
          <div style={{ flexShrink: 0 }}>
            <img
              src={result.thumbnailUrl}
              alt={result.title}
              style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', margin: 0 }}>{result.title}</p>
              {bodyText && (
                <p style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.6, margin: 0 }}>{bodyText}</p>
              )}
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
  initialQuery?: string;
  initialSelectedId?: string;
  initialOutput?: SearchOutput;
}

export function SearchTakeover({ onClose, initialQuery, initialSelectedId, initialOutput }: SearchTakeoverProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(initialQuery ?? '');
  const [committedQuery, setCommittedQuery] = useState(initialOutput ? (initialQuery ?? '') : '');
  const [isLoading, setIsLoading] = useState(false);
  const [searchOutput, setSearchOutput] = useState<SearchOutput | null>(initialOutput ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? initialOutput?.results[0]?.evidence_id ?? null
  );
  const [activeChips, setActiveChips] = useState<FilterChip[]>(initialOutput?.chips ?? []);
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());

  const toggleScope = (id: string) => {
    setSelectedScopes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [showFeedback, setShowFeedback] = useState(false);
  // Version counter — incremented on each search; stale results are discarded
  const searchVersion = useRef(0);
  // Skip the first debounce trigger when pre-loaded output was provided
  const skipNextDebounce = useRef(!!initialOutput);

  // Focus on mount, close on Esc
  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Auto-run search only if no pre-loaded output was provided
  useEffect(() => {
    if (!initialOutput && initialQuery && initialQuery.trim().length >= 3) {
      runSearch(initialQuery.trim());
    }
  }, []); // intentionally only on mount

  const runSearch = async (q: string) => {
    const version = ++searchVersion.current;
    setIsLoading(true);
    setSearchOutput(null);
    setActiveChips([]);
    setSelectedId(null);

    try {
      const output = await agentSearch(q, () => {}, (partialResults) => {
        if (version !== searchVersion.current) return;
        setCommittedQuery(q);
        setSearchOutput(prev => ({
          summary: prev?.summary ?? '',
          results: partialResults,
          entities: prev?.entities ?? [],
          chips: prev?.chips ?? [],
          suggestions: prev?.suggestions ?? [],
          graph_context: prev?.graph_context ?? { cases_involved: [], total_scoped: 0, total_matched: 0 },
        }));
        // Auto-select first result when it first appears
        setSelectedId(prev => prev ?? (partialResults[0]?.evidence_id ?? null));
      });
      if (version !== searchVersion.current) return; // stale — newer search started
      setSearchOutput(output);
      setCommittedQuery(q);
      setActiveChips(output.chips);
      if (output.results.length > 0) setSelectedId(prev => prev ?? output.results[0].evidence_id);
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
    if (skipNextDebounce.current) { skipNextDebounce.current = false; return; }
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

  const handleAction = useCallback((action: AgentAction) => {
    // Persist to context graph
    action.item_ids.forEach(id => {
      const graph = getContextGraph();
      if (action.type === 'set_category') {
        updateGraphNode(id, { category: action.value });
      } else if (action.type === 'set_status') {
        updateGraphNode(id, { status: action.value });
      } else if (action.type === 'add_tag') {
        const existing = graph.nodes[id]?.tags ?? [];
        if (!existing.includes(action.value)) {
          updateGraphNode(id, { tags: [...existing, action.value] });
        }
      }
    });

    // Patch search results immediately so the UI reflects the change
    setSearchOutput(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        results: prev.results.map(r => {
          if (!action.item_ids.includes(r.evidence_id)) return r;
          if (action.type === 'set_category') return { ...r, category: action.value };
          if (action.type === 'set_status') return r; // status not shown in results list
          return r;
        }),
      };
    });
  }, []);

  const selectedEvidence = searchOutput?.results.find(r => r.evidence_id === selectedId);
  const hasResults = searchOutput !== null;

  // Lazy description generation — runs once per selected result that has no excerpt
  useEffect(() => {
    if (!selectedId || !searchOutput) return;
    const result = searchOutput.results.find(r => r.evidence_id === selectedId);
    if (!result || result.excerpt) return; // already has one

    generateAndSaveDescription(selectedId).then(description => {
      if (!description) return;
      setSearchOutput(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          results: prev.results.map(r =>
            r.evidence_id === selectedId ? { ...r, excerpt: description } : r
          ),
        };
      });
    });
  }, [selectedId]);
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

  const entityPeople: string[] = (() => {
    if (!searchOutput) return [];
    const unique = [...new Set(searchOutput.results.map(r => r.officer).filter(Boolean))];
    return unique.length > 0 ? unique : searchOutput.entities.filter(e => e.type === 'officer').map(e => e.name);
  })();

  const entityCases: string[] = (() => {
    if (!searchOutput) return [];
    const unique = [...new Set(searchOutput.results.map(r => r.case_id).filter(Boolean))];
    return unique.length > 0 ? unique : searchOutput.entities.filter(e => e.type === 'case').map(e => e.name);
  })();

  const activeScopes = SCOPE_CHIPS.filter(s => selectedScopes.has(s.id));
  const evidenceItems = searchOutput
    ? (activeScopes.length > 0
        ? searchOutput.results.filter(r => activeScopes.some(s => s.filter(r)))
        : searchOutput.results)
    : [];

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowFeedback(true)}
            style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-weak)', backgroundColor: 'transparent', lineHeight: '18px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Feedback
          </button>
          <a
            href="https://git.taservs.net/mbeamish/search2.0_takeover/tree/main"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--text-weak)', backgroundColor: 'transparent', lineHeight: '18px', textDecoration: 'none' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .322.216.694.825.576C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>
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
                chipTerms={activeChips.map(c => c.label)}
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
                committedQuery={committedQuery}
                chipTerms={activeChips.map(c => c.label)}
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

                {/* Scope chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
                  {SCOPE_CHIPS.map(chip => {
                    const active = chip.id === 'all'
                      ? selectedScopes.size === 0
                      : selectedScopes.has(chip.id);
                    return (
                      <button
                        key={chip.id}
                        onClick={() => chip.id === 'all' ? setSelectedScopes(new Set()) : toggleScope(chip.id)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '4px 10px', borderRadius: 99, cursor: 'pointer',
                          fontSize: 12, fontWeight: 500,
                          border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                          backgroundColor: active ? 'var(--foreground)' : 'transparent',
                          color: active ? 'var(--raised)' : 'var(--foreground)',
                          transition: 'all 0.1s',
                        }}
                        onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = 'var(--fill-hover)'; }}
                        onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {chip.icon}
                        {chip.label}
                      </button>
                    );
                  })}
                </div>

                {/* Cases scroll row */}
                {entityCases.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cases</p>
                    <EntityScrollRow count={entityCases.length}>
                      {entityCases.map(name => <CaseCard key={name} name={name} />)}
                    </EntityScrollRow>
                  </div>
                )}

                {/* People scroll row */}
                {entityPeople.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>People</p>
                    <EntityScrollRow count={entityPeople.length}>
                      {entityPeople.map(name => <PersonCard key={name} name={name} />)}
                    </EntityScrollRow>
                  </div>
                )}

                {/* Results header */}
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#4b5563' }}>
                    Results{evidenceItems.length > 0 ? ` (${evidenceItems.length})` : ''}
                  </p>
                  <div className="flex items-center gap-3">
                    {evidenceItems.length > 0 && !isLoading && (
                      <label className="flex items-center gap-1.5 cursor-pointer select-none" style={{ fontSize: 12, color: '#6b7280' }}>
                        <input
                          type="checkbox"
                          checked={evidenceItems.length > 0 && evidenceItems.every(r => checkedIds.has(r.evidence_id))}
                          ref={el => {
                            if (el) el.indeterminate = checkedIds.size > 0 && !evidenceItems.every(r => checkedIds.has(r.evidence_id));
                          }}
                          onChange={e => {
                            setCheckedIds(e.target.checked
                              ? new Set(evidenceItems.map(r => r.evidence_id))
                              : new Set()
                            );
                          }}
                          style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#111827' }}
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
                {evidenceItems.length === 0 && !isLoading && (
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
                {(isLoading || evidenceItems.length > 0) && (
                  <div className="flex-1 overflow-y-auto">
                    {isLoading && evidenceItems.length === 0
                      ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                      : evidenceItems.map(result => (
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
                {isLoading && searchOutput.results.length === 0
                  ? <SkeletonPreview />
                  : selectedEvidence && <PreviewPanel result={selectedEvidence} />}
              </div>

            </div>
          </div>
          </div>{/* end centering shell */}

          {/* Assistant panel — slides in from the right when items are checked */}
          <AssistantPanel
            isOpen={isAssistantOpen}
            items={checkedItems}
            onClose={() => setCheckedIds(new Set())}
            onAction={handleAction}
          />
        </div>
      )}

      <FeedbackDrawer
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        currentQuery={committedQuery || undefined}
      />
    </div>
  );
}

