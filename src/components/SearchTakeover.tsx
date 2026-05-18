import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  Search,
  Loader2,
  ArrowLeft,
  ArrowUpRight,
  Download,
  Share2,
  Bookmark,
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
  Headphones,
} from 'lucide-react';

import { Badge } from './ui/badge';
import { SCOPE_CHIPS } from './SearchDropdown';
import { SearchFilterBar, useSearchFilters } from './SearchFilterBar';
import { FeedbackDrawer } from './FeedbackDrawer';
import { agentSearch, generateAndSaveDescription, SearchStep } from '../engine/agentSearch';
import { ActionBar } from './ActionBar';
import { chatWithEvidenceStream, ChatMessage as EngineChatMessage } from '../engine/assistantChat';
import { parseDraft, DraftReport } from '../utils/draftUtils';
import { ChatDrawer, ChatMessage, parseThinkingFromRaw, parseNeedsEvidence } from './pages/HomePage';
import { parseMetadataEdits, stripMetadataEditTags, parseActions, stripActionTags, ToolCall, DraftDrawer } from './AssistantPanel';
import {
  SearchOutput,
  SearchEvidenceResult,
  FilterChip,
  MediaClass,
  Case,
  GraphNode,
  MetadataEdit,
} from '../data/types';
import { mockCases } from '../data/mockCases';
import { loadTextIndex, findMatches, type Match } from '../lib/pdfTextIndex';
import { findAttributeMatches, type AttributeMatch } from '../lib/attributeIndex';
import { PdfViewer } from './PdfViewer';
import { getContextGraph } from '../storage/config';

const RECENT_SEARCHES_KEY = 'command_recent_searches';

const PLACEHOLDER_RECENT: string[] = [];

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
  const props = { size, style: { color: '#9ca3af', flexShrink: 0 as const } };
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
  return (
    <div
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, border: 'none', backgroundColor: 'var(--fill-weak)', flexShrink: 0, cursor: 'pointer', transition: 'background-color 0.1s', width: 160 }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fill-hover)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fill-weak)'}
    >
      <Shield size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Officer</p>
      </div>
    </div>
  );
}

// ─── Case card ───────────────────────────────────────────────────────────────

function CaseCard({ name }: { name: string }) {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, border: 'none', backgroundColor: 'var(--fill-weak)', flexShrink: 0, cursor: 'pointer', transition: 'background-color 0.1s', width: 160 }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fill-hover)'}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fill-weak)'}
    >
      <FolderOpen size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
        <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Case</p>
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
  onClick,
  checked,
  onCheck,
}: {
  result: SearchEvidenceResult;
  isSelected: boolean;
  query: string;
  onHover: () => void;
  onClick: () => void;
  checked: boolean;
  onCheck: (checked: boolean) => void;
}) {
  return (
    <div
      className="w-full text-left flex transition-colors cursor-pointer pr-4"
      style={{
        backgroundColor: isSelected ? 'var(--fill-weaker)' : 'transparent',
      }}
      onClick={onClick}
      onMouseEnter={e => {
        onHover();
        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fill-weaker)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = isSelected ? 'var(--fill-weaker)' : 'transparent';
      }}
    >
      {/* Checkbox */}
      <div className="flex items-center justify-center shrink-0 pl-4">
        <input
          type="checkbox"
          checked={checked}
          onChange={e => { e.stopPropagation(); onCheck(e.target.checked); }}
          onClick={e => e.stopPropagation()}
          style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#111827', flexShrink: 0 }}
        />
      </div>
      {/* Content */}
      <div className="flex flex-col py-3 px-3 flex-1 min-w-0">
        <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} dangerouslySetInnerHTML={{ __html: highlightText(result.title, query) }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, overflow: 'hidden' }}>
          <MediaIcon mediaClass={result.media_class} size={13} />
          <p
            style={{ fontSize: 13, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}
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
            style={{ fontSize: 13, color: '#9ca3af', marginTop: 3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
            dangerouslySetInnerHTML={{ __html: highlightText(result.excerpt || result.relevance || '', query) }}
          />
        )}
      </div>
    </div>
  );
}

function CaseRow({ c, query }: { c: Case; query: string }) {
  const [hovered, setHovered] = React.useState(false);
  const statusColor = c.status === 'Active' ? 'var(--fill-success-strong)' : c.status === 'Closed' ? 'var(--muted-foreground)' : 'var(--fill-warning-strong)';
  return (
    <div
      className="w-full text-left flex transition-colors cursor-pointer pr-4"
      style={{ backgroundColor: hovered ? 'var(--fill-weaker)' : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center justify-center shrink-0 pl-4">
        <FolderOpen size={18} style={{ color: '#9ca3af' }} />
      </div>
      <div className="flex flex-col py-3 px-3 flex-1 min-w-0">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, margin: 0 }}
            dangerouslySetInnerHTML={{ __html: highlightText(c.caseId, query) }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, flexShrink: 0 }}>{c.status}</span>
        </div>
        <p style={{ fontSize: 13, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}
          dangerouslySetInnerHTML={{ __html: [
            c.owner && highlightText(c.owner, query),
            c.accessClass,
            c.lastUpdatedOn && `Updated ${c.lastUpdatedOn.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`,
          ].filter(Boolean).join(' • ') }} />
        {c.description && (
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            dangerouslySetInnerHTML={{ __html: highlightText(c.description, query) }} />
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

function getMatchedInputTerms(query: string, results: SearchEvidenceResult[]): Set<string> {
  const words = query
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()));
  const matched = new Set<string>();
  for (const word of words) {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    for (const r of results) {
      const haystack = [r.title, r.evidence_id, r.case_id, r.officer, r.category, r.excerpt, r.relevance]
        .filter(Boolean).join(' ');
      if (re.test(haystack)) { matched.add(word.toLowerCase()); break; }
    }
  }
  return matched;
}

function highlightInputText(value: string, matchedTerms: Set<string>): string {
  if (!value || matchedTerms.size === 0) return escapeHtml(value ?? '');
  return value
    .split(/(\s+)/)
    .map(part => {
      if (!part) return '';
      if (/^\s+$/.test(part)) return part;
      if (matchedTerms.has(part.toLowerCase())) {
        return `<mark style="background:rgba(254,198,46,0.5);color:transparent;border-radius:2px;">${escapeHtml(part)}</mark>`;
      }
      return escapeHtml(part);
    })
    .join('');
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

function PreviewPanel({ result, onViewEvidence }: { result: SearchEvidenceResult; onViewEvidence: () => void }) {
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
      <div style={{ border: '1px solid var(--border)', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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
      <button
        onClick={onViewEvidence}
        style={{ alignSelf: 'center', padding: '6px 14px', borderRadius: 6, backgroundColor: '#111827', color: '#fff', fontSize: 12, fontWeight: 500, border: 'none', cursor: 'pointer', flexShrink: 0 }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1f2937')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#111827')}
      >
        View evidence
      </button>
    </div>
  );
}

// ─── Kind metadata ────────────────────────────────────────────────────────────

const KIND_META: Record<string, { label: string; color: string }> = {
  video:    { label: 'Video',    color: '#6366f1' },
  image:    { label: 'Image',    color: '#0ea5e9' },
  audio:    { label: 'Audio',    color: '#f59e0b' },
  document: { label: 'Document', color: '#10b981' },
  pdf:      { label: 'PDF',      color: '#ef4444' },
  text:     { label: 'Text',     color: '#8b5cf6' },
};

// ─── Facet helpers ────────────────────────────────────────────────────────────

const TYPE_LABEL_PLURAL: Record<string, string> = {
  video: 'Videos', image: 'Images', audio: 'Audio',
  document: 'Documents', pdf: 'PDFs', text: 'Text',
};

function TypeIcon({ mediaClass }: { mediaClass: string }) {
  const s = { size: 14, style: { flexShrink: 0 as const, color: 'var(--text-weak)' } };
  switch (mediaClass) {
    case 'video':    return <Video      {...s} />;
    case 'image':    return <Image      {...s} />;
    case 'audio':    return <Headphones {...s} />;
    case 'document': return <FileText   {...s} />;
    case 'pdf':      return <FileText   {...s} />;
    default:         return <File       {...s} />;
  }
}

function PersonAvatar({ name }: { name: string }) {
  const initials = name.split(/\s+/).map(w => w[0] ?? '').slice(0, 2).join('').toUpperCase();
  return (
    <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: 'var(--fill-weak)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--text-weak)', lineHeight: 1, letterSpacing: '0.01em' }}>{initials}</span>
    </div>
  );
}

// ─── Facet group ──────────────────────────────────────────────────────────────

function FacetGroup({
  title,
  items,
  activeValue,
  onSelect,
  renderIcon,
  renderLabel,
}: {
  title: string;
  items: [string, number][];
  activeValue: string | null;
  onSelect: (value: string | null) => void;
  renderIcon?: (value: string) => React.ReactNode;
  renderLabel?: (value: string) => string;
}) {
  const [expanded, setExpanded] = useState(true);
  if (items.length === 0) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer', marginBottom: 2, fontFamily: 'inherit' }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-weak)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
        {expanded ? <ChevronDown size={11} style={{ color: 'var(--text-weak)' }} /> : <ChevronRight size={11} style={{ color: 'var(--text-weak)' }} />}
      </button>
      {expanded && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {items.map(([value, count]) => {
            const isActive = activeValue === value;
            const label = renderLabel ? renderLabel(value) : value;
            return (
              <li key={value}>
                <button
                  onClick={() => onSelect(isActive ? null : value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    width: '100%', padding: '5px 6px', borderRadius: 5,
                    backgroundColor: isActive ? 'var(--fill-weak)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--fill-weaker)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  {renderIcon && <span style={{ display: 'flex', flexShrink: 0 }}>{renderIcon(value)}</span>}
                  <span style={{ fontSize: 13, color: 'var(--foreground)', fontWeight: isActive ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', flex: 1, minWidth: 0 }}>{label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-weak)', flexShrink: 0 }}>{count}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Match navigator (Text / Attributes) ──────────────────────────────────────

function MatchNavigator({
  title,
  count,
  activeIdx,
  onPrev,
  onNext,
}: {
  title: string;
  count: number;
  activeIdx: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const disabled = count === 0;
  const arrowBtn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: 4, border: 'none',
    background: 'none', color: disabled ? 'var(--border)' : 'var(--text-weak)',
    cursor: disabled ? 'default' : 'pointer', flexShrink: 0,
    transition: 'background-color 0.1s',
  };
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', marginBottom: 2 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-weak)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px', borderRadius: 5, backgroundColor: 'var(--fill-weaker)' }}>
        <span style={{ fontSize: 13, color: 'var(--foreground)', flex: 1, minWidth: 0 }}>
          {count === 0 ? 'No matches' : `${count} ${count === 1 ? 'match' : 'matches'}`}
        </span>
        <button
          onClick={onPrev}
          disabled={disabled}
          style={arrowBtn}
          onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--fill-weak)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          title="Previous match"
        >
          <ChevronLeft size={14} />
        </button>
        {count > 0 && (
          <span style={{ fontSize: 12, color: 'var(--foreground)', flexShrink: 0, minWidth: 16, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
            {activeIdx + 1}
          </span>
        )}
        <button
          onClick={onNext}
          disabled={disabled}
          style={arrowBtn}
          onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--fill-weak)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          title="Next match"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Compact row ──────────────────────────────────────────────────────────────

function CompactRow({
  result,
  isSelected,
  query,
  onHover,
  onClick,
  checked,
  onCheck,
}: {
  result: SearchEvidenceResult;
  isSelected: boolean;
  query: string;
  onHover: () => void;
  onClick: () => void;
  checked: boolean;
  onCheck: (checked: boolean) => void;
}) {
  const kind = KIND_META[result.media_class] ?? { label: result.media_class, color: '#9ca3af' };
  return (
    <div
      data-evidence-id={result.evidence_id}
      onClick={onClick}
      onMouseEnter={e => {
        onHover();
        (e.currentTarget as HTMLDivElement).style.backgroundColor = 'var(--fill-weaker)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = isSelected ? 'var(--fill-weaker)' : 'transparent';
      }}
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 40px 1fr',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px 6px 10px',
        cursor: 'pointer',
        borderLeft: `2px solid ${isSelected ? 'var(--foreground)' : 'transparent'}`,
        backgroundColor: isSelected ? 'var(--fill-weaker)' : 'transparent',
        transition: 'background-color 0.1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={e => { e.stopPropagation(); onCheck(e.target.checked); }}
          onClick={e => e.stopPropagation()}
          style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#111827', flexShrink: 0 }}
        />
      </div>
      <div style={{ width: 40, height: 30, borderRadius: 3, overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--fill-weak)' }}>
        {result.thumbnailUrl ? (
          <img src={result.thumbnailUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MediaIcon mediaClass={result.media_class} size={14} />
          </div>
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <p
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          dangerouslySetInnerHTML={{ __html: highlightText(result.title, query) }}
        />
        <p style={{ fontSize: 11, color: 'var(--text-weak)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {[result.evidence_id, result.case_id, result.officer].filter(Boolean).join(' · ')}
        </p>
      </div>
    </div>
  );
}

// ─── Meta field ───────────────────────────────────────────────────────────────

function MetaField({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-weak)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

// ─── Doc preview ──────────────────────────────────────────────────────────────

function DocPreview({
  fileUrl,
  searchQuery,
  scrollToMatch,
}: {
  fileUrl?: string;
  searchQuery: string;
  scrollToMatch?: Match;
}) {
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);

  React.useEffect(() => {
    if (scrollToMatch) setPage(scrollToMatch.pageIndex + 1);
  }, [scrollToMatch]);

  React.useEffect(() => {
    setPage(1);
  }, [fileUrl]);

  if (!fileUrl) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FileText size={32} style={{ color: '#4b5563', opacity: 0.5 }} />
      </div>
    );
  }

  const isPdf = fileUrl.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    return (
      <iframe
        src={`${fileUrl}#toolbar=0&navpanes=0`}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        title="Document preview"
      />
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#1c1c1e' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <PdfViewer
          fileUrl={fileUrl}
          searchQuery={searchQuery}
          page={page}
          onTotalPagesChange={setTotalPages}
          scrollToMatch={scrollToMatch}
        />
      </div>
      {totalPages > 1 && (
        <div style={{ height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderTop: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ background: 'none', border: 'none', cursor: page > 1 ? 'pointer' : 'default', color: page > 1 ? '#9ca3af' : '#374151', display: 'flex', alignItems: 'center', padding: '0 4px' }}
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>{page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ background: 'none', border: 'none', cursor: page < totalPages ? 'pointer' : 'default', color: page < totalPages ? '#9ca3af' : '#374151', display: 'flex', alignItems: 'center', padding: '0 4px' }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Preview pane ─────────────────────────────────────────────────────────────

function PreviewPane({
  result,
  onViewEvidence,
  searchQuery,
  scrollToMatch,
}: {
  result: SearchEvidenceResult;
  onViewEvidence: () => void;
  searchQuery: string;
  scrollToMatch?: Match;
}) {
  const kind = KIND_META[result.media_class] ?? { label: result.media_class, color: '#9ca3af' };
  const formattedDate = result.date_recorded
    ? new Date(result.date_recorded).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    : undefined;
  const tags: string[] = (result as any).tags ?? [];
  const bodyText = result.excerpt || result.relevance || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', padding: '16px 20px', gap: 16 }}>
      {/* Header: ID on left, actions on right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: 'var(--text-weak)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{result.evidence_id}</span>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {(() => {
            const btnBase: React.CSSProperties = {
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
              fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
              cursor: 'pointer', transition: 'background-color 0.1s',
              backgroundColor: 'var(--foreground)', color: '#ffffff',
            };
            const btnSecondary: React.CSSProperties = {
              ...btnBase, backgroundColor: 'transparent', color: 'var(--foreground)',
            };
            return (
              <>
                <button style={btnSecondary}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-weak)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <Download size={12} /> Download
                </button>
                <button style={btnSecondary}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-weak)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                  <Share2 size={12} /> Share
                </button>
                <button onClick={onViewEvidence} style={btnBase}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  <ArrowUpRight size={12} /> View
                </button>
              </>
            );
          })()}
        </div>
      </div>

      {/* Title */}
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--foreground)', margin: 0, lineHeight: 1.3, flexShrink: 0 }}>{result.title}</h2>

      {/* Media preview — 16:10 */}
      {(() => {
        const isDoc = ['document', 'pdf', 'text'].includes(result.media_class);
        return (
          <div style={{ flexShrink: 0, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', backgroundColor: 'var(--fill-weak)', ...(isDoc ? { height: 'clamp(320px, 78vh, 1400px)' } : { aspectRatio: '16 / 10' }) }}>
            {isDoc ? (
              <DocPreview fileUrl={result.fileUrl} searchQuery={searchQuery} scrollToMatch={scrollToMatch} />
            ) : result.thumbnailUrl ? (
              <img src={result.thumbnailUrl} alt={result.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MediaIcon mediaClass={result.media_class} size={32} />
              </div>
            )}
          </div>
        );
      })()}

      {/* Metadata grid — 2 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', flexShrink: 0 }}>
        <MetaField label="Case" value={result.case_id} />
        <MetaField label="Officer" value={result.officer} />
        <MetaField label="Category" value={result.category} />
        <MetaField label="Recorded" value={formattedDate} />
      </div>

      {/* Description */}
      {bodyText && (
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-weak)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Description</p>
          <p style={{ fontSize: 13, color: 'var(--foreground)', lineHeight: 1.6, margin: 0 }}>{bodyText}</p>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ flexShrink: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-weak)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Tags</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {tags.map(tag => (
              <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '2px 8px', borderRadius: 99, backgroundColor: 'var(--fill-weak)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 40px 1fr',
      alignItems: 'center',
      gap: 8,
      padding: '6px 10px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 13, height: 13, borderRadius: 2, backgroundColor: 'var(--border)' }} className="animate-pulse" />
      </div>
      <div style={{ width: 40, height: 30, borderRadius: 3, backgroundColor: 'var(--border)' }} className="animate-pulse" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
        <div style={{ height: 13, width: '80%', borderRadius: 3, backgroundColor: 'var(--border)' }} className="animate-pulse" />
        <div style={{ height: 11, width: '55%', borderRadius: 3, backgroundColor: 'var(--border)' }} className="animate-pulse" />
      </div>
    </div>
  );
}

function SkeletonPreview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 20px', gap: 16, overflowY: 'auto' }}>
      {/* Header: kind badge + evidence ID + action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{ width: 52, height: 22, borderRadius: 99, backgroundColor: 'var(--border)' }} className="animate-pulse" />
        <div style={{ flex: 1, height: 13, borderRadius: 3, backgroundColor: 'var(--border)', maxWidth: 120 }} className="animate-pulse" />
        <div style={{ display: 'flex', gap: 6 }}>
          {[80, 72, 60].map((w, i) => (
            <div key={i} style={{ width: w, height: 28, borderRadius: 6, backgroundColor: 'var(--border)' }} className="animate-pulse" />
          ))}
        </div>
      </div>
      {/* Title */}
      <div style={{ height: 20, width: '65%', borderRadius: 3, backgroundColor: 'var(--border)', flexShrink: 0 }} className="animate-pulse" />
      {/* Media preview — 16:10 */}
      <div style={{ flexShrink: 0, borderRadius: 6, backgroundColor: 'var(--border)', aspectRatio: '16 / 10' }} className="animate-pulse" />
      {/* Metadata grid — 2 columns matching Case / Officer / Category / Recorded */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px', flexShrink: 0 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ height: 10, width: '40%', borderRadius: 2, backgroundColor: 'var(--border)' }} className="animate-pulse" />
            <div style={{ height: 13, width: '70%', borderRadius: 3, backgroundColor: 'var(--border)' }} className="animate-pulse" />
          </div>
        ))}
      </div>
      {/* Description */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ height: 10, width: '28%', borderRadius: 2, backgroundColor: 'var(--border)' }} className="animate-pulse" />
        {[92, 85, 60].map((w, i) => (
          <div key={i} style={{ height: 13, width: `${w}%`, borderRadius: 3, backgroundColor: 'var(--border)' }} className="animate-pulse" />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SearchTakeover() {
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { query: initialQuery, selectedId: initialSelectedId, output: initialOutput } = (location.state as { query?: string; selectedId?: string; output?: SearchOutput } | null) ?? {};

  const handleViewEvidence = (evidenceId: string) => {
    navigate(`/search/evidence/${evidenceId}`);
  };

  const handleViewCase = (caseId: string) => {
    navigate(`/cases/${caseId}`);
  };
  const [query, setQuery] = useState(initialQuery ?? '');
  const [committedQuery, setCommittedQuery] = useState(initialOutput ? (initialQuery ?? '') : '');
  const [isLoading, setIsLoading] = useState(false);
  const [searchOutput, setSearchOutput] = useState<SearchOutput | null>(initialOutput ?? null);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId ?? initialOutput?.results[0]?.evidence_id ?? null
  );
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeMatchIdx, setActiveMatchIdx] = useState(0);
  const [attributeMatches, setAttributeMatches] = useState<AttributeMatch[]>([]);
  const [activeAttrIdx, setActiveAttrIdx] = useState(0);
  const [textIndexReady, setTextIndexReady] = useState(false);
  const resultsListRef = useRef<HTMLDivElement | null>(null);
  const [activeChips, setActiveChips] = useState<FilterChip[]>(initialOutput?.chips ?? []);
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set());
  const searchFilters = useSearchFilters();
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStreamingId, setChatStreamingId] = useState<string | null>(null);
  const [chatSkill, setChatSkill] = useState<string | null>(null);
  const [openDraft, setOpenDraft] = useState<DraftReport | null>(null);

  const checkedEvidenceItems: GraphNode[] = [...checkedIds].map(id => {
    const r = searchOutput?.results.find(r => r.evidence_id === id);
    if (!r) return null;
    return {
      id: r.evidence_id,
      title: r.title,
      media_class: r.media_class,
      mime_type: '',
      size: 0,
      case_id: r.case_id,
      date_recorded: r.date_recorded ?? '',
      date_ingested: '',
      officer: r.officer,
      category: r.category,
      status: '',
      objects_detected: [],
      description: r.relevance || r.excerpt || '',
      thumbnailUrl: r.thumbnailUrl,
    } as GraphNode;
  }).filter((x): x is GraphNode => x !== null);

  const sendChatMessage = async (text: string, history: ChatMessage[], items: GraphNode[]) => {
    const assistantId = `asst-${Date.now()}`;
    setChatMessages(prev => [...prev, { id: assistantId, role: 'assistant', text: '', evidenceSnapshot: items }]);
    setChatStreamingId(assistantId);

    const apiItems = items.map(e => ({
      id: e.id, title: e.title, media_class: e.media_class,
      date_recorded: e.date_recorded, description: e.description ?? '',
      officer: e.officer, category: e.category, vector_file_id: e.vector_file_id,
    }));
    const engineHistory: EngineChatMessage[] = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));

    const raw = { current: '' };
    const getTitle = (id: string) => items.find(e => e.id === id)?.title;
    try {
      const { chunksByFileId } = await chatWithEvidenceStream(text, engineHistory, apiItems, (chunk) => {
        raw.current += chunk;
        const { thinking, text: afterThinking } = parseThinkingFromRaw(raw.current);
        const { content: afterDraft, draft } = parseDraft(afterThinking);
        const { text: afterNeedsEvidence, needsEvidence } = parseNeedsEvidence(afterDraft);
        const stripped = stripActionTags(stripMetadataEditTags(afterNeedsEvidence));
        const pendingDraft = afterThinking.includes('<draft_report') && draft === null;
        setChatMessages(prev => prev.map(m => m.id === assistantId ? {
          ...m, thinking, text: stripped,
          draft: draft ?? m.draft, pendingDraft,
          showSelectEvidence: needsEvidence || m.showSelectEvidence,
        } : m));
      });
      const { text: afterThinking } = parseThinkingFromRaw(raw.current);
      const { content: afterDraft } = parseDraft(afterThinking);
      const { text: afterNeedsEvidence } = parseNeedsEvidence(afterDraft);
      const { edits: metaEdits } = parseMetadataEdits(afterNeedsEvidence, getTitle);
      const { actions } = parseActions(afterNeedsEvidence);
      const batchActions = actions.filter(a => a.type === 'add_to_case');
      const perItemActions = actions.filter(a => a.type !== 'add_to_case');
      const allEdits: MetadataEdit[] = [
        ...metaEdits.map(e => {
          const evidenceNode = items.find(n => n.id === e.evidence_id);
          const currentValue = evidenceNode ? (evidenceNode as any)[e.field] as string | undefined : undefined;
          return { ...e, current_value: currentValue, status: 'pending' as const };
        }),
        ...perItemActions.map(a => {
          const ACTION_FIELD_MAP: Record<string, string> = {
            set_category: 'category',
            set_status: 'status',
            add_tag: 'tags',
          };
          const field = ACTION_FIELD_MAP[a.type] ?? a.type;
          const count = a.item_ids.length;
          const isBatch = count > 1;
          const firstNode = items.find(n => n.id === a.item_ids[0]);
          const currentValue = !isBatch && firstNode ? (firstNode as any)[field] as string | undefined : undefined;
          return {
            id: `medit-action-${field}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            evidence_id: a.item_ids[0] ?? '',
            evidence_ids: a.item_ids,
            evidence_title: isBatch ? `${count} items` : (firstNode?.title ?? getTitle(a.item_ids[0])),
            field,
            current_value: Array.isArray(currentValue) ? (currentValue as string[]).join(', ') : currentValue,
            new_value: a.value,
            status: 'pending' as const,
          };
        }),
      ];
      if (allEdits.length > 0) {
        setChatMessages(prev => prev.map(m => m.id === assistantId ? { ...m, metadataEdits: allEdits } : m));
      }
      if (batchActions.length > 0) {
        const a = batchActions[0];
        const count = a.item_ids.length;
        const toolCall: ToolCall = {
          name: a.type,
          label: `Add to case: "${a.value}"`,
          description: `Add ${count} selected item${count !== 1 ? 's' : ''} to case "${a.value}".`,
          input: { case: a.value, items: `${count} item${count !== 1 ? 's' : ''}` },
          status: 'pending',
          successLabel: `${count} item${count !== 1 ? 's' : ''} added to case`,
        };
        setChatMessages(prev => prev.map(m => m.id === assistantId ? { ...m, toolCall } : m));
      }
      if (Object.keys(chunksByFileId).length > 0) {
        setChatMessages(prev => prev.map(m => m.id === assistantId ? { ...m, chunkMap: chunksByFileId } : m));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setChatMessages(prev => prev.map(m => m.id === assistantId ? { ...m, text: msg } : m));
    } finally {
      setChatStreamingId(null);
    }
  };

  const handleChatSend = (text: string) => {
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    sendChatMessage(text, [...chatMessages, userMsg], checkedEvidenceItems);
  };

  const handleMetadataEditApply = (msgId: string, editId: string) => {
    setChatMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.metadataEdits) return m;
      const edit = m.metadataEdits.find(e => e.id === editId);
      if (!edit) return m;
      const idsToUpdate = edit.evidence_ids ?? [edit.evidence_id];
      setSearchOutput(prevOutput => {
        if (!prevOutput) return prevOutput;
        const updatedResults = prevOutput.results.map(r => {
          if (!idsToUpdate.includes(r.evidence_id)) return r;
          if (edit.field === 'tags') {
            const existing: string[] = (r as any).tags ?? [];
            return { ...r, tags: [...existing.filter(t => t !== edit.new_value), edit.new_value] };
          }
          return { ...r, [edit.field]: edit.new_value };
        });
        return { ...prevOutput, results: updatedResults };
      });
      return {
        ...m,
        metadataEdits: m.metadataEdits.map(e => e.id === editId ? { ...e, status: 'applied' as const } : e),
      };
    }));
  };

  const handleMetadataEditDismiss = (msgId: string, editId: string) => {
    setChatMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.metadataEdits) return m;
      return {
        ...m,
        metadataEdits: m.metadataEdits.map(e => e.id === editId ? { ...e, status: 'dismissed' as const } : e),
      };
    }));
  };

  const handleToolCallApprove = (msgId: string) => {
    setChatMessages(prev => prev.map(m =>
      m.id === msgId && m.toolCall
        ? { ...m, toolCall: { ...m.toolCall, status: 'approved' as const } }
        : m
    ));
  };

  const handleToolCallDeny = (msgId: string) => {
    setChatMessages(prev => prev.map(m =>
      m.id === msgId && m.toolCall
        ? { ...m, toolCall: { ...m.toolCall, status: 'denied' as const } }
        : m
    ));
  };

  const toggleScope = (id: string) => {
    setSelectedScopes(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const [recentSearches, setRecentSearches] = useState<string[]>(loadRecentSearches);
  const [showFeedback, setShowFeedback] = useState(false);
  // Version counter — incremented on each search; stale results are discarded
  const searchVersion = useRef(0);
  // Skip the first debounce trigger when pre-loaded output was provided
  const skipNextDebounce = useRef(!!initialOutput);


  // Focus on mount, close on Esc
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') navigate(-1); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

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

  const selectedEvidence: SearchEvidenceResult | undefined = React.useMemo(() => {
    const fromResults = searchOutput?.results.find(r => r.evidence_id === selectedId);
    if (fromResults) return fromResults;
    if (!selectedId) return undefined;
    const node = getContextGraph().nodes[selectedId];
    if (!node) return undefined;
    return {
      evidence_id: node.id,
      title: node.title,
      media_class: node.media_class,
      case_id: node.case_id,
      officer: node.officer,
      category: node.category,
      relevance: '',
      excerpt: node.description,
      confidence: 'medium',
      thumbnailUrl: node.thumbnailUrl,
      fileUrl: node.fileUrl,
      date_recorded: node.date_recorded,
    };
  }, [searchOutput?.results, selectedId]);
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

  const entityPeople: string[] = (() => {
    if (!searchOutput) return [];
    const unique = [...new Set(searchOutput.results.map(r => r.officer).filter(Boolean))];
    return unique.length > 0 ? unique : searchOutput.entities.filter(e => e.type === 'officer').map(e => e.name);
  })();

  const entityCases: { id: string; category?: string }[] = (() => {
    if (!searchOutput) return [];
    const seen = new Map<string, string | undefined>();
    searchOutput.results.forEach(r => { if (r.case_id && !seen.has(r.case_id)) seen.set(r.case_id, r.category); });
    if (seen.size > 0) return [...seen.entries()].map(([id, category]) => ({ id, category }));
    return searchOutput.entities.filter(e => e.type === 'case').map(e => ({ id: e.name }));
  })();

  const activeScopes = SCOPE_CHIPS.filter(s => selectedScopes.has(s.id));

  const matchedCases: Case[] = React.useMemo(() => {
    const caseIds = [...new Set(entityCases.map(e => e.id))];
    return caseIds.map(id => mockCases.find(c => c.caseId === id)).filter(Boolean) as Case[];
  }, [entityCases]);

  const evidenceItems = searchOutput
    ? searchFilters.filterResults(searchOutput.results)
    : [];

  const [activeFacetType, setActiveFacetType] = useState<string | null>(null);
  const [activeFacetCase, setActiveFacetCase] = useState<string | null>(null);
  const [activeFacetPerson, setActiveFacetPerson] = useState<string | null>(null);
  const [activeFacetStatus, setActiveFacetStatus] = useState<string | null>(null);
  const [activeFacetDate, setActiveFacetDate] = useState<string | null>(null);

  const typeFacets = React.useMemo(() => {
    const counts: Record<string, number> = {};
    evidenceItems.forEach(r => { const k = r.media_class || 'unknown'; counts[k] = (counts[k] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]) as [string, number][];
  }, [evidenceItems]);

  const caseFacets = React.useMemo(() => {
    const counts: Record<string, number> = {};
    evidenceItems.forEach(r => { if (r.case_id) counts[r.case_id] = (counts[r.case_id] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8) as [string, number][];
  }, [evidenceItems]);

  const peopleFacets = React.useMemo(() => {
    const counts: Record<string, number> = {};
    evidenceItems.forEach(r => { if (r.officer) counts[r.officer] = (counts[r.officer] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8) as [string, number][];
  }, [evidenceItems]);

  const statusFacets = React.useMemo(() => {
    const counts: Record<string, number> = {};
    evidenceItems.forEach(r => { const s = (r as any).status; if (s) counts[s] = (counts[s] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]) as [string, number][];
  }, [evidenceItems]);

  const dateFacets = React.useMemo(() => {
    const counts: Record<string, number> = {};
    evidenceItems.forEach(r => {
      if (r.date_recorded) {
        const d = new Date(r.date_recorded).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        counts[d] = (counts[d] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]) as [string, number][];
  }, [evidenceItems]);

  const facetFilteredItems = React.useMemo(() => {
    const byId = new Map<string, SearchEvidenceResult>();
    for (const r of evidenceItems) byId.set(r.evidence_id, r);

    // Surface any doc with an exact text match or attribute match that the
    // AI search omitted, so the list highlight has a row to scroll to when
    // the user cycles either navigator.
    const matchOrder = new Map<string, number>();
    matches.forEach((m, i) => { if (!matchOrder.has(m.evidenceId)) matchOrder.set(m.evidenceId, i); });
    const attrOrder = new Map<string, number>();
    attributeMatches.forEach((m, i) => { if (!attrOrder.has(m.evidenceId)) attrOrder.set(m.evidenceId, i); });
    const graph = getContextGraph();
    const ensureNode = (id: string) => {
      if (byId.has(id)) return;
      const node = graph.nodes[id];
      if (!node) return;
      byId.set(id, {
        evidence_id: node.id,
        title: node.title,
        media_class: node.media_class,
        case_id: node.case_id,
        officer: node.officer,
        category: node.category,
        relevance: '',
        excerpt: node.description,
        confidence: 'medium',
        thumbnailUrl: node.thumbnailUrl,
        fileUrl: node.fileUrl,
        date_recorded: node.date_recorded,
      });
    };
    for (const id of matchOrder.keys()) ensureNode(id);
    for (const id of attrOrder.keys()) ensureNode(id);

    const filtered = [...byId.values()].filter(r => {
      if (activeFacetType && r.media_class !== activeFacetType) return false;
      if (activeFacetCase && r.case_id !== activeFacetCase) return false;
      if (activeFacetPerson && r.officer !== activeFacetPerson) return false;
      if (activeFacetStatus && (r as any).status !== activeFacetStatus) return false;
      if (activeFacetDate && r.date_recorded) {
        const d = new Date(r.date_recorded).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
        if (d !== activeFacetDate) return false;
      }
      return true;
    });

    // Stable sort: text-matched docs first, then attribute-matched docs,
    // then everything else in its original AI ranking.
    const aiOrder = new Map<string, number>();
    evidenceItems.forEach((r, i) => aiOrder.set(r.evidence_id, i));
    const tier = (id: string) => {
      if (matchOrder.has(id)) return 0;
      if (attrOrder.has(id)) return 1;
      return 2;
    };
    return filtered.sort((a, b) => {
      const ta = tier(a.evidence_id);
      const tb = tier(b.evidence_id);
      if (ta !== tb) return ta - tb;
      if (ta === 0) return matchOrder.get(a.evidence_id)! - matchOrder.get(b.evidence_id)!;
      if (ta === 1) return attrOrder.get(a.evidence_id)! - attrOrder.get(b.evidence_id)!;
      const ao = aiOrder.get(a.evidence_id) ?? Number.MAX_SAFE_INTEGER;
      const bo = aiOrder.get(b.evidence_id) ?? Number.MAX_SAFE_INTEGER;
      return ao - bo;
    });
  }, [evidenceItems, matches, attributeMatches, activeFacetType, activeFacetCase, activeFacetPerson, activeFacetStatus, activeFacetDate]);

  // Load the prebuilt PDF text index once.
  useEffect(() => {
    loadTextIndex().then(() => setTextIndexReady(true));
  }, []);

  // Recompute matches whenever the query changes. Scope to the whole indexed
  // corpus, not just AI-surfaced results — exact-phrase finds shouldn't be
  // hidden when the agent search didn't rank that doc.
  useEffect(() => {
    if (!textIndexReady) return;
    const graph = getContextGraph();
    const entries = Object.values(graph.nodes)
      .filter(n => !!n.fileUrl)
      .map(n => ({ evidenceId: n.id, fileUrl: n.fileUrl! }));
    const next = findMatches(entries, committedQuery);
    setMatches(next);
    setActiveMatchIdx(0);
  }, [textIndexReady, committedQuery]);

  // When the active match changes, drive selectedId to that result.
  const activeMatch = matches[activeMatchIdx];
  useEffect(() => {
    if (activeMatch) setSelectedId(activeMatch.evidenceId);
  }, [activeMatch?.evidenceId, activeMatch?.pageIndex, activeMatch?.itemIndex, activeMatch?.charStart]);

  // Attribute matches: scan visual evidence (image/video) attributes for the
  // query, independent of the AI search ranking.
  useEffect(() => {
    const graph = getContextGraph();
    const next = findAttributeMatches(Object.values(graph.nodes), committedQuery);
    setAttributeMatches(next);
    setActiveAttrIdx(0);
  }, [committedQuery]);

  const activeAttr = attributeMatches[activeAttrIdx];
  useEffect(() => {
    if (activeAttr) setSelectedId(activeAttr.evidenceId);
  }, [activeAttr?.evidenceId]);

  const cycleAttr = (direction: 1 | -1) => {
    if (attributeMatches.length === 0) return;
    setActiveAttrIdx(i => (i + direction + attributeMatches.length) % attributeMatches.length);
  };

  // Auto-scroll the selected row into view in the results list.
  useEffect(() => {
    if (!selectedId || !resultsListRef.current) return;
    const row = resultsListRef.current.querySelector<HTMLElement>(`[data-evidence-id="${CSS.escape(selectedId)}"]`);
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedId]);

  const cycleMatch = (direction: 1 | -1) => {
    if (matches.length === 0) return;
    setActiveMatchIdx(i => (i + direction + matches.length) % matches.length);
  };

  return (
    <div className="h-full flex flex-col">

      {/* Body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>

          {/* Filter bar — shown when results are present */}
          {hasResults && (
            <div style={{ paddingTop: 16, paddingBottom: 8, paddingLeft: 24, flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
              <SearchFilterBar filters={searchFilters} />
            </div>
          )}

          {/* Content */}
          {!hasResults && !isLoading ? (
            /* Empty state — recent searches / suggestions */
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!isLoading && (() => {
                const trimmed = query.trim();
                const isFiltering = trimmed.length > 0;
                const suggestions = isFiltering
                  ? recentSearches
                      .filter(s => s.toLowerCase().includes(trimmed.toLowerCase()))
                      .sort((a, b) => {
                        const aStarts = a.toLowerCase().startsWith(trimmed.toLowerCase());
                        const bStarts = b.toLowerCase().startsWith(trimmed.toLowerCase());
                        if (aStarts && !bStarts) return -1;
                        if (!aStarts && bStarts) return 1;
                        return 0;
                      })
                  : recentSearches;
                return (
                  <>
                    <p style={{ fontSize: 12, color: 'var(--text-weak)', padding: '16px 0 6px', margin: 0 }}>
                      {isFiltering ? 'Suggestions' : 'Recent searches'}
                    </p>
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => handleRecentClick(s)}
                        className="w-full text-left transition-colors"
                        style={{ display: 'block', width: '100%', padding: '12px 0', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: 'var(--foreground)', textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        {isFiltering ? (() => {
                          const idx = s.toLowerCase().indexOf(trimmed.toLowerCase());
                          if (idx === -1) return <span>{s}</span>;
                          return (
                            <span>
                              {s.slice(0, idx)}
                              <strong style={{ fontWeight: 600 }}>{s.slice(idx, idx + trimmed.length)}</strong>
                              {s.slice(idx + trimmed.length)}
                            </span>
                          );
                        })() : s}
                      </button>
                    ))}
                    {isFiltering && suggestions.length === 0 && (
                      <p style={{ fontSize: 13, color: 'var(--text-weak)', paddingTop: 12, margin: 0 }}>No matching searches</p>
                    )}
                  </>
                );
              })()}
            </div>
          ) : (
            /* Results state — V4 3-column layout */
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>

              {/* Facet rail — 200px */}
              <aside style={{ width: 200, flexShrink: 0, overflowY: 'auto', padding: '16px 12px', borderRight: '1px solid var(--border)', scrollbarWidth: 'none' }}>
                <FacetGroup
                  title="Type"
                  items={typeFacets}
                  activeValue={activeFacetType}
                  onSelect={setActiveFacetType}
                  renderIcon={v => <TypeIcon mediaClass={v} />}
                  renderLabel={v => TYPE_LABEL_PLURAL[v] ?? KIND_META[v]?.label ?? v}
                />
                {committedQuery.trim() && (
                  <>
                    <MatchNavigator
                      title="Text"
                      count={matches.length}
                      activeIdx={activeMatchIdx}
                      onPrev={() => cycleMatch(-1)}
                      onNext={() => cycleMatch(1)}
                    />
                    <MatchNavigator
                      title="Attributes"
                      count={attributeMatches.length}
                      activeIdx={activeAttrIdx}
                      onPrev={() => cycleAttr(-1)}
                      onNext={() => cycleAttr(1)}
                    />
                  </>
                )}
                <FacetGroup
                  title="Case"
                  items={caseFacets}
                  activeValue={activeFacetCase}
                  onSelect={setActiveFacetCase}
                />
                <FacetGroup
                  title="People"
                  items={peopleFacets}
                  activeValue={activeFacetPerson}
                  onSelect={setActiveFacetPerson}
                  renderIcon={v => <PersonAvatar name={v} />}
                />
                <FacetGroup
                  title="Status"
                  items={statusFacets}
                  activeValue={activeFacetStatus}
                  onSelect={setActiveFacetStatus}
                />
                <FacetGroup
                  title="Date"
                  items={dateFacets}
                  activeValue={activeFacetDate}
                  onSelect={setActiveFacetDate}
                />
              </aside>

              {/* Results list — fluid, 420–580px */}
              <div style={{ flex: '1 1 420px', minWidth: 380, maxWidth: 580, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-weak)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {isLoading ? 'Searching…' : `${facetFilteredItems.length} ${facetFilteredItems.length === 1 ? 'result' : 'results'}`}
                  </span>
                  {facetFilteredItems.length > 0 && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={facetFilteredItems.every(r => checkedIds.has(r.evidence_id))}
                        ref={el => {
                          if (el) el.indeterminate = checkedIds.size > 0 && !facetFilteredItems.every(r => checkedIds.has(r.evidence_id));
                        }}
                        onChange={() => {
                          const allSelected = facetFilteredItems.every(r => checkedIds.has(r.evidence_id));
                          setCheckedIds(allSelected ? new Set() : new Set(facetFilteredItems.map(r => r.evidence_id)));
                        }}
                        style={{ width: 13, height: 13, cursor: 'pointer', accentColor: '#111827' }}
                      />
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-weak)' }}>Select all</span>
                    </label>
                  )}
                </div>
                <div ref={resultsListRef} style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }} className="[&::-webkit-scrollbar]:hidden">
                  {isLoading && facetFilteredItems.length === 0
                    ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                    : facetFilteredItems.map(result => (
                        <CompactRow
                          key={result.evidence_id}
                          result={result}
                          isSelected={result.evidence_id === selectedId}
                          query={query}
                          onHover={() => setSelectedId(result.evidence_id)}
                          onClick={() => setSelectedId(result.evidence_id)}
                          checked={checkedIds.has(result.evidence_id)}
                          onCheck={c => {
                            setCheckedIds(prev => {
                              const next = new Set(prev);
                              c ? next.add(result.evidence_id) : next.delete(result.evidence_id);
                              return next;
                            });
                          }}
                        />
                      ))
                  }
                  {facetFilteredItems.length === 0 && !isLoading && (
                    <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                      <p style={{ fontSize: 13, color: 'var(--text-weak)', margin: 0 }}>No results match the selected filters.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview pane — fully fluid, fills remaining width */}
              <div style={{ flex: '2 1 600px', minWidth: 0, overflow: 'hidden' }}>
                {isLoading && !selectedEvidence ? (
                  <SkeletonPreview />
                ) : selectedEvidence ? (
                  <PreviewPane
                    result={selectedEvidence}
                    onViewEvidence={() => handleViewEvidence(selectedEvidence.evidence_id)}
                    searchQuery={committedQuery}
                    scrollToMatch={activeMatch && activeMatch.evidenceId === selectedEvidence.evidence_id ? activeMatch : undefined}
                  />
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-weak)', margin: 0 }}>Select a result to preview</p>
                  </div>
                )}
              </div>

            </div>
          )}

          <FeedbackDrawer
            isOpen={showFeedback}
            onClose={() => setShowFeedback(false)}
            currentQuery={committedQuery || undefined}
          />
        </div>
        </div>
        {checkedIds.size > 0 && (
          <ActionBar
            selectedCount={checkedIds.size}
            actions={[
              { key: 'assistant', label: 'Ask Assistant', variant: 'primary' as const, onClick: () => setAssistantOpen(true) },
              { key: 'add-to-case', label: 'Add to case', onClick: () => {} },
              { key: 'edit-category', label: 'Edit category', onClick: () => {} },
              { key: 'evidence-actions', label: 'Evidence actions', onClick: () => {} },
            ]}
            onClearSelection={() => setCheckedIds(new Set())}
            pageType="evidence"
          />
        )}
        <ChatDrawer
          open={assistantOpen}
          messages={chatMessages}
          onClose={() => setAssistantOpen(false)}
          onNewChat={() => setChatMessages([])}
          onSend={handleChatSend}
          onSelectEvidence={() => {}}
          evidenceOpen={false}
          evidenceCount={checkedIds.size}
          isStreaming={chatStreamingId !== null}
          skill={chatSkill}
          onSkillChange={setChatSkill}
          evidenceItems={checkedEvidenceItems}
          onOpenDraft={setOpenDraft}
          draftOpen={!!openDraft}
          onToolCallApprove={handleToolCallApprove}
          onToolCallDeny={handleToolCallDeny}
          onMetadataEditApply={handleMetadataEditApply}
          onMetadataEditDismiss={handleMetadataEditDismiss}
        />
        <DraftDrawer draft={openDraft} open={!!openDraft} onClose={() => setOpenDraft(null)} />
      </div>
    </div>
  );
}

