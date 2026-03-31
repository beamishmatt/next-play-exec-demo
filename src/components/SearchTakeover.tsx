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
  Hash,
  Calendar,
  User,
  Tag,
} from 'lucide-react';

import { Badge } from './ui/badge';
import { AssistantPanel } from './AssistantPanel';
import { FeedbackDrawer } from './FeedbackDrawer';
import { getContextGraph, updateGraphNode } from '../storage/config';
import { agentSearch, generateAndSaveDescription, SearchStep } from '../engine/agentSearch';
import {
  AgentAction,
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
                {isLoading && searchOutput.results.length === 0
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
                    {isLoading && searchOutput.results.length === 0
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

