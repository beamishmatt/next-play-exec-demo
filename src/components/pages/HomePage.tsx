import React, { useState, useRef, useEffect, useCallback, useLayoutEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AnimatePresence, motion } from 'motion/react';
import {
  Search,
  MessageSquare,
  ArrowUp,
  Shield,
  ChevronDown,
  Video,
  Circle,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileText,
  Car,
  Smartphone,
  Wind,
  Crosshair,
  Minus,
  TrendingUp,
  TrendingDown,
  X,
  Plus,
  Mic,
  Square,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ScanSearch,
  ClipboardCheck,
  Calendar,
  Plane,
} from 'lucide-react';
import { SCOPE_CHIPS, AnimatedPlaceholder, useCyclingPlaceholder } from '../SearchDropdown';
import assistantIcon from '../../assets/aiera.svg';
import { chatWithEvidenceStream, ChatMessage as EngineChatMessage } from '../../engine/assistantChat';
import { Checkbox } from '../ui/checkbox';
import { ThinkingBlock, DraftCard, DraftDrawer, ToolCall, ToolCallCard, MetadataEditCard, parseActions, parseMetadataEdits, stripActionTags, stripMetadataEditTags, FeatureRequestCard, parseFeatureRequest, stripFeatureRequestTags } from '../AssistantPanel';
import { DraftReport, parseDraft, DRAFT_PANEL_WIDTH } from '../../utils/draftUtils';
import { getContextGraph } from '../../storage/config';
import { GraphNode, MetadataEdit } from '../../data/types';
import { KnowledgeGraphPanel } from '../knowledge-graph/KnowledgeGraphPanel';

// ── Speech to text ────────────────────────────────────────────────────────────

function useSpeechToText(onTranscript: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const start = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .map((result: any) => result[0].transcript)
        .join('');
      onTranscript(transcript);
    };
    r.onend = () => setIsListening(false);
    r.onerror = () => setIsListening(false);
    recognitionRef.current = r;
    r.start();
    setIsListening(true);
  }, [onTranscript]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, start, stop };
}

function ListeningWave() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28, paddingLeft: 2 }}>
      {[0, 1, 2, 3, 4, 5, 6].map(i => (
        <div
          key={i}
          style={{
            width: 3,
            height: 4,
            borderRadius: 99,
            backgroundColor: 'var(--fill-key-strong)',
            animation: 'mic-wave 0.8s ease-in-out infinite',
            animationDelay: `${i * 0.08}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Animated border button ────────────────────────────────────────────────────

function AnimatedBorderButton({ onClick, style, children, animated = true }: {
  onClick?: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
  animated?: boolean;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [dims, setDims] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    if (btnRef.current) {
      const { width, height } = btnRef.current.getBoundingClientRect();
      setDims({ w: width, h: height });
    }
  }, []);

  const rx = 5;
  const perimeter = dims.w > 0 ? 2 * (dims.w + dims.h) : 0;
  const dashLen = 28;

  return (
    <button ref={btnRef} onClick={onClick} style={{ position: 'relative', ...style }}>
      {animated && dims.w > 0 && (
        <svg
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' }}
        >
          <motion.rect
            x={0.5} y={0.5}
            width={dims.w - 1} height={dims.h - 1}
            rx={rx} ry={rx}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1.5}
            strokeDasharray={`${dashLen} ${perimeter - dashLen}`}
            animate={{ strokeDashoffset: [0, -perimeter] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'linear' }}
          />
        </svg>
      )}
      {children}
    </button>
  );
}

// ── Skills dropdown ───────────────────────────────────────────────────────────

const SKILLS = [
  { id: 'deep-research', label: 'Deep Research', icon: <Search size={13} /> },
  { id: 'policy', label: 'Policy', icon: <Shield size={13} /> },
];

function SkillsDropdown({
  onSelectEvidence,
  evidenceCount = 0,
  value,
  onChange,
}: {
  onSelectEvidence?: () => void;
  evidenceCount?: number;
  value?: string | null;
  onChange?: (skill: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [internalSelected, setInternalSelected] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value !== undefined ? value : internalSelected;
  const setSelected = (s: string | null) => {
    if (onChange) onChange(s);
    else setInternalSelected(s);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const active = SKILLS.find(s => s.id === selected);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          height: 28, padding: '0 10px', borderRadius: 7,
          border: '1px solid var(--border)',
          backgroundColor: selected ? 'var(--fill-weak)' : 'transparent',
          color: selected ? 'var(--text-strong)' : 'var(--muted-foreground)',
          fontSize: 13, fontWeight: selected ? 500 : 400,
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'var(--fill-hover)'; }}
        onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {active ? active.label : 'Skills'}
        <ChevronDown size={11} style={{ opacity: 0.6 }} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', bottom: '100%', left: 0, marginBottom: 6,
            backgroundColor: 'var(--overlay)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            boxShadow: 'var(--elevation-md)',
            minWidth: 180,
            zIndex: 50,
            overflow: 'hidden',
            padding: '4px 0',
          }}
        >
          {selected && (
            <button
              onClick={() => { setSelected(null); setOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', fontSize: 13, color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              Clear skill
            </button>
          )}
          {SKILLS.map(skill => (
            <button
              key={skill.id}
              onClick={() => { setSelected(skill.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '7px 12px',
                fontSize: 13, color: 'var(--text-strong)',
                fontWeight: skill.id === selected ? 600 : 400,
                background: skill.id === selected ? 'var(--fill-weak)' : 'none',
                border: 'none', cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (skill.id !== selected) e.currentTarget.style.backgroundColor = 'var(--fill-hover)'; }}
              onMouseLeave={(e) => { if (skill.id !== selected) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ color: 'var(--muted-foreground)' }}>{skill.icon}</span>
              {skill.label}
            </button>
          ))}
        </div>
      )}
    </div>
    {selected === 'deep-research' && (
      <AnimatedBorderButton
        onClick={onSelectEvidence}
        animated={evidenceCount === 0}
        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 500, color: 'var(--text-strong)', background: 'none', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', padding: '2px 8px', fontFamily: 'inherit', whiteSpace: 'nowrap', height: 28 }}
      >
        Evidence
        {evidenceCount > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 16, borderRadius: 99, backgroundColor: 'var(--fill-key-strong)', color: 'var(--text-inverse-strong)', fontSize: 10, fontWeight: 700, padding: '0 4px' }}>
            {evidenceCount}
          </span>
        )}
      </AnimatedBorderButton>
    )}
    </div>
  );
}

// ── Greeting ─────────────────────────────────────────────────────────────────

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const ASSISTANT_ACTIONS = [
  'investigate a case',
  'summarize evidence',
  'correlate incidents',
  'categorize evidence',
  'draft a report',
  'edit metadata',
  'research a case',
  'change settings',
];

const WORD_VARIANTS = {
  hidden: { opacity: 0, filter: 'blur(10px)', y: 8 },
  visible: (i: number) => ({ opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.35, delay: i * 0.06 } }),
  exit: (i: number) => ({ opacity: 0, filter: 'blur(10px)', y: -8, transition: { duration: 0.2, delay: i * 0.04 } }),
};

const HEADING_STYLE: React.CSSProperties = {
  fontSize: 32, fontWeight: 400, letterSpacing: '-0.01em',
  fontFamily: 'inherit', color: 'var(--text-strong)', lineHeight: 'inherit',
};

function AnimatedSubtitle() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % ASSISTANT_ACTIONS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  const words = ASSISTANT_ACTIONS[index].split(' ');

  return (
    <AnimatePresence mode='popLayout'>
      <motion.span key={index} style={{ display: 'inline-flex', gap: '0.3em' }}>
        {words.map((word, i) => (
          <motion.span
            key={word + i}
            custom={i}
            variants={WORD_VARIANTS}
            initial='hidden'
            animate='visible'
            exit='exit'
            style={HEADING_STYLE}
          >
            {word}
          </motion.span>
        ))}
      </motion.span>
    </AnimatePresence>
  );
}

// ── Chat / Search input ───────────────────────────────────────────────────────

function HomeSearch({
  onSearch,
  onChat,
  onSelectEvidence,
  evidenceCount = 0,
  skill,
  onSkillChange,
}: {
  onSearch: (q: string) => void;
  onChat: (q: string) => void;
  onSelectEvidence?: () => void;
  evidenceCount?: number;
  skill?: string | null;
  onSkillChange?: (s: string | null) => void;
}) {
  const [tab, setTab] = useState<'chat' | 'search'>('chat');
  const [value, setValue] = useState('');
  const [activeScopes, setActiveScopes] = useState<Set<string>>(new Set(['all']));
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cyclingPlaceholder = useCyclingPlaceholder(!value);

  const { isListening, start: startListening, stop: stopListening } = useSpeechToText(
    useCallback((t: string) => setValue(prev => prev ? prev + ' ' + t : t), [])
  );

  const handleChatSubmit = () => {
    if (!value.trim()) return;
    onChat(value.trim());
    setValue('');
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const toggleScope = useCallback((id: string) => {
    setActiveScopes(prev => {
      if (id === 'all') return new Set(['all']);
      const next = new Set(prev);
      next.delete('all');
      if (next.has(id)) {
        next.delete(id);
        if (next.size === 0) return new Set(['all']);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--border)',
        backgroundColor: 'var(--overlay)',
        padding: '12px 16px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: 'var(--base)', borderRadius: 8, padding: 4 }}>
          {(['chat', 'search'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); if (t === 'search') setActiveScopes(new Set(['all'])); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px',
                fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                color: tab === t ? 'var(--text-strong)' : 'var(--muted-foreground)',
                backgroundColor: tab === t ? 'var(--overlay)' : 'transparent',
                border: 'none',
                borderRadius: 6,
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t === 'chat' ? <MessageSquare size={13} /> : <Search size={13} />}
              {t === 'chat' ? 'Chat' : 'Search'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'chat' && (
        <div style={{ borderRadius: 10, border: `1px solid ${isListening ? 'var(--fill-key-strong)' : 'var(--border)'}`, backgroundColor: 'var(--base)', padding: '12px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10, transition: 'border-color 0.15s' }}>
          {isListening ? (
            <ListeningWave />
          ) : (
            <div style={{ position: 'relative' }}>
              {!value && (
                <AnimatedPlaceholder
                  text={cyclingPlaceholder}
                  left={0}
                  right={0}
                  fontSize={16}
                  color="var(--muted-foreground)"
                />
              )}
              <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder=""
                rows={1}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(); } }}
                style={{ width: '100%', background: 'none', border: 'none', outline: 'none', resize: 'none', fontSize: 16, color: 'var(--text-strong)', fontFamily: 'inherit', lineHeight: 1.5, minHeight: 28, overflow: 'hidden' }}
              />
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <SkillsDropdown
                value={skill}
                onChange={onSkillChange}
                onSelectEvidence={onSelectEvidence}
                evidenceCount={evidenceCount}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={isListening ? stopListening : startListening}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', background: 'none', color: isListening ? 'var(--fill-key-strong)' : 'var(--muted-foreground)', cursor: 'pointer' }}
              >
                {isListening ? <Square size={13} fill="currentColor" /> : <Mic size={15} />}
              </button>
              <button onClick={handleChatSubmit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', backgroundColor: value.trim() ? 'var(--fill-key-strong)' : 'var(--fill-weak)', color: value.trim() ? 'var(--text-inverse-strong)' : 'var(--muted-foreground)', cursor: value.trim() ? 'pointer' : 'default', transition: 'background-color 0.15s' }}>
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative', borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--base)', padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, height: 48 }}>
            <Search size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
            {!value && (
              <AnimatedPlaceholder
                text={cyclingPlaceholder}
                left={40}
                right={14}
                fontSize={15}
                color="var(--muted-foreground)"
              />
            )}
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder=""
              onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) { onSearch(value.trim()); } }}
              autoFocus
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 15, color: 'var(--text-strong)', fontFamily: 'inherit' }}
            />
            {value.trim() && (
              <button onClick={() => onSearch(value.trim())} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, border: 'none', backgroundColor: 'var(--fill-key-strong)', color: 'var(--text-inverse-strong)', cursor: 'pointer', flexShrink: 0 }}>
                <ArrowUp size={14} />
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 0' }}>
            {SCOPE_CHIPS.map(chip => {
              const active = activeScopes.has(chip.id);
              return (
                <button
                  key={chip.id}
                  onClick={() => toggleScope(chip.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 11px', borderRadius: 99, cursor: 'pointer',
                    fontSize: 12, fontWeight: active ? 600 : 400,
                    border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                    backgroundColor: active ? 'var(--foreground)' : 'transparent',
                    color: active ? 'var(--raised)' : 'var(--foreground)',
                    transition: 'all 0.12s',
                    fontFamily: 'inherit',
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
        </div>
      )}
    </div>
  );
}

// ── Shared widget shell ───────────────────────────────────────────────────────

function Widget({
  title,
  viewAllLabel = 'View all →',
  background = '#ffffff',
  children,
}: {
  title: React.ReactNode;
  viewAllLabel?: React.ReactNode;
  background?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 12,
        border: '1px solid var(--border)',
        backgroundColor: background,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20, borderBottom: '1px solid var(--border)' }}>
          {typeof title === 'string' ? (
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{title}</span>
          ) : (
            title
          )}
          {typeof viewAllLabel === 'string' ? (
            <button style={{ fontSize: 13, color: 'var(--text-key)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
              {viewAllLabel}
            </button>
          ) : (
            viewAllLabel
          )}
        </div>
        {children}
    </div>
  );
}

// ── Home Overview pieces ──────────────────────────────────────────────────────

function HomeGreeting() {
  return (
    <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-strong)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
      {greeting()}, Officer Reyes.
    </h1>
  );
}

function HomeSearchInput() {
  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '0 14px',
        height: 44,
        borderRadius: 10,
        border: '1px solid var(--border)',
        backgroundColor: 'var(--overlay)',
      }}
    >
      <Search size={15} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
      <input
        type="text"
        placeholder="Search cases, evidence, people, devices..."
        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 14, color: 'var(--text-strong)', fontFamily: 'inherit' }}
      />
      <span
        style={{
          fontSize: 11,
          color: 'var(--muted-foreground)',
          border: '1px solid var(--border)',
          padding: '1px 6px',
          borderRadius: 4,
          fontFamily: 'inherit',
          flexShrink: 0,
        }}
      >
        ⌘K
      </span>
    </div>
  );
}

function ShiftBriefing() {
  return (
    <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--muted-foreground)', margin: 0 }}>
      <strong style={{ fontWeight: 600, color: 'var(--text-strong)' }}>3 things to know before your 14:00 patrol.</strong> Two retail burglary reports on Whitman St share the same MO as Case{' '}
      <a href="#" style={{ color: '#2563eb', textDecoration: 'underline' }} onClick={e => e.preventDefault()}>#6189</a>. Body 4 firmware update was deployed overnight. Your Use of Force acknowledgment is due in 4 days.
    </p>
  );
}

type WeekPerfMetric = {
  label: string;
  value: number;
  target: number;
  delta: string;
  good: boolean;
  data: number[];
};

const WEEK_PERF: WeekPerfMetric[] = [
  { label: 'Activation rate', value: 93, target: 95, delta: '+2.1%', good: true, data: [55, 58, 60, 62, 66, 70, 74, 78] },
  { label: 'Report completion', value: 96, target: 95, delta: '+0.8%', good: true, data: [80, 81, 82, 84, 85, 87, 89, 92] },
  { label: 'Evidence tagging', value: 82, target: 90, delta: '-1.4%', good: false, data: [78, 74, 72, 70, 67, 64, 60, 56] },
  { label: 'Response time avg', value: 91, target: 85, delta: '+3.0%', good: true, data: [48, 52, 56, 60, 65, 72, 80, 86] },
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const w = 140;
  const h = 30;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function ThisWeeksPerformance() {
  return (
    <Widget
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>This week's performance</span>
          <span
            style={{
              fontSize: 11,
              color: 'var(--muted-foreground)',
              padding: '2px 9px',
              borderRadius: 99,
              border: '1px solid var(--border)',
              fontWeight: 500,
            }}
          >
            Mar 10 — Mar 16
          </span>
        </span>
      }
      viewAllLabel="Full dashboard →"
    >
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {WEEK_PERF.map(m => {
          const color = m.good ? '#16a34a' : '#dc2626';
          return (
            <div
              key={m.label}
              style={{
                borderRadius: 10,
                border: '1px solid var(--border)',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{m.label}</span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    color,
                  }}
                >
                  {m.good ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {m.delta}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-strong)', lineHeight: 1 }}>{m.value}%</span>
                <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>vs {m.target}% target</span>
              </div>
              <Sparkline data={m.data} color={color} />
            </div>
          );
        })}
      </div>
    </Widget>
  );
}

export function HomeOverview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <HomeGreeting />
        <ShiftBriefing />
      </div>
      <HomeSearchInput />
      <MyTasks />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, alignItems: 'start' }}>
        <ShiftSchedule />
        <MyDevices />
      </div>
    </div>
  );
}

// ── Home Artifacts ────────────────────────────────────────────────────────────

type ArtifactKind = 'draft' | 'summary' | 'timeline' | 'brief';

const ARTIFACT_BADGE: Record<ArtifactKind, { label: string; icon: React.ReactNode }> = {
  draft:    { label: 'Report draft', icon: <FileText size={16} /> },
  summary:  { label: 'Summary',      icon: <ClipboardCheck size={16} /> },
  timeline: { label: 'Timeline',     icon: <Calendar size={16} /> },
  brief:    { label: 'Brief',        icon: <Shield size={16} /> },
};

const ARTIFACT_TIMELINE_088142 = `# Case PBPD-2025-088142 — Incident Timeline

Compiled from 30 evidence items (Officer Diane Tran, lead).

## 2026-05-07 — Day of incident
- **15:46** — Case opened (PBPD-2025-088142).
- **15:58** — Initial responding officer report filed (Officer Maria Thibodaux).
- **16:14** — Crime scene secured, perimeter established.
- **16:32** — Crime scene report filed (Officer Diane Tran).
- **17:05** — Photo log captured (Officer Kenneth Okafor) — 18 frames.
- **17:48** — Crime scene sketch completed (Officer Diane Tran).
- **18:30** — Search warrant request drafted and submitted.
- **20:15** — Officer James Martin statement recorded.

## 2026-05-07 — Evening
- **21:00** — Detective case notes opened (Officer Renee Broussard).
- **22:18** — Supplemental report filed.
- **23:40** — Canvass report submitted (Officer Diane Tran).

## Open questions
- Witness identification for two persons observed in the photo log.
- Verification of subject's whereabouts between 14:00 and 15:30.
`;

const ARTIFACT_WEEKLY_SUMMARY = `# Officer Reyes — Weekly Activity Summary
**Mar 10 — Mar 16, 2026**

## Patrol coverage
- 5 shifts logged (40h total), 2 East Patrol, 3 South Patrol.
- 14 calls for service, 9 self-initiated stops, 1 arrest.

## Evidence and reports
- 47 evidence items captured (32 BWC, 11 images, 4 documents).
- 12 reports filed, 1 returned for revisions (Incident #6201).
- Activation rate: **93%** (target 95%). Tagging: **82%** (target 90%).

## Standout incidents
- **Incident #6189** — Retail burglary, Whitman St. Possible MO match to 2 prior reports.
- **Incident #6201** — Domestic disturbance, witness section pending revision.

## Recommendations
- Improve tagging discipline at end-of-shift; current trend down 1.4%.
- Follow up on the Whitman St MO correlation with the case unit.
`;

const ARTIFACT_USE_OF_FORCE_BRIEF = `# Use of Force Policy — Acknowledgment Brief
**Annual review · Due in 4 days**

## What changed this year
- Section 4.2 clarified: de-escalation attempts must be documented for any
  encounter where force is anticipated, even if force is not ultimately used.
- Section 5.1 expanded: TASER deployment now requires a verbal warning unless
  doing so would compromise officer or public safety.
- New Section 7: post-incident wellness check is mandatory within 72h of any
  use-of-force event involving injury.

## What you need to do
1. Review the full policy document (12 pages, ~25 min).
2. Complete the comprehension quiz (10 questions, passing 80%).
3. Sign the acknowledgment in the Standards portal.

## Why this matters
Annual acknowledgment is required for continued duty assignment under
department policy 1.1.4. Missing the deadline triggers an automatic
notification to your supervisor.
`;

type Artifact = {
  id: string;
  kind: ArtifactKind;
  title: string;
  context: string;
  createdAgo: string;
  body: string;
};

// Built lazily inside the component because INCIDENT_6201_DRAFT is declared
// further down in the file — referencing it at module-load time here would
// hit a TDZ.
function buildArtifacts(): Artifact[] {
  return [
    {
      id: 'art-6201',
      kind: 'draft',
      title: 'Domestic Disturbance Response — Incident #6201',
      context: 'Witness section completed · Returned by Sgt. Park',
      createdAgo: 'Just now',
      body: INCIDENT_6201_DRAFT,
    },
    {
      id: 'art-timeline-088142',
      kind: 'timeline',
      title: 'Case PBPD-2025-088142 — Incident Timeline',
      context: 'Compiled from 30 evidence items',
      createdAgo: '2h ago',
      body: ARTIFACT_TIMELINE_088142,
    },
    {
      id: 'art-weekly',
      kind: 'summary',
      title: 'Officer Reyes — Weekly Activity Summary',
      context: 'Mar 10 — Mar 16 · 5 shifts, 12 reports',
      createdAgo: 'Yesterday',
      body: ARTIFACT_WEEKLY_SUMMARY,
    },
    {
      id: 'art-uof',
      kind: 'brief',
      title: 'Use of Force Policy — Acknowledgment Brief',
      context: 'Annual policy review · Due in 4 days',
      createdAgo: '3d ago',
      body: ARTIFACT_USE_OF_FORCE_BRIEF,
    },
  ];
}

function ArtifactIconBadge({ kind }: { kind: ArtifactKind }) {
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: 'var(--fill-weak)',
        color: 'var(--muted-foreground)',
      }}
    >
      {ARTIFACT_BADGE[kind].icon}
    </span>
  );
}

export function HomeArtifacts() {
  const [preview, setPreview] = useState<DraftReport | null>(null);
  const artifacts = useMemo(buildArtifacts, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-strong)', margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          Artifacts
        </h1>
        <p style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--muted-foreground)', margin: 0 }}>
          AI-generated drafts, summaries, and briefs from your recent work.
        </p>
      </div>
      <Widget background="transparent" title="Recent" viewAllLabel={null}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {artifacts.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: 12, paddingTop: i === 0 ? 0 : 14, paddingBottom: i === artifacts.length - 1 ? 0 : 14,
                marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20,
                borderBottom: i < artifacts.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                <ArtifactIconBadge kind={a.kind} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, color: 'var(--text-strong)', margin: 0, fontWeight: 500, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.title}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ARTIFACT_BADGE[a.kind].label} · {a.context} · {a.createdAgo}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreview({ title: a.title, body: a.body })}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  fontSize: 12, fontWeight: 500, color: 'var(--text-strong)',
                  background: 'none', border: '1px solid var(--border)',
                  borderRadius: 6, cursor: 'pointer', padding: '4px 10px',
                  fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                Open
              </button>
            </div>
          ))}
        </div>
      </Widget>
      <DraftDrawer draft={preview} open={!!preview} onClose={() => setPreview(null)} />
    </div>
  );
}

// ── My Tasks ──────────────────────────────────────────────────────────────────

type TaskStatus = 'Overdue' | 'Due today' | 'Upcoming';
type TaskIcon = 'alert' | 'scan' | 'clipboard';

const TASKS: {
  id: number;
  status: TaskStatus;
  category: string;
  title: string;
  action: string;
  icon: TaskIcon;
}[] = [
  { id: 1, status: 'Overdue', category: 'Records', title: 'Complete report for Incident #6201', action: 'Resume', icon: 'alert' },
  { id: 2, status: 'Due today', category: 'Evidence', title: 'Categorize 4 evidence items from 03/11 shift', action: 'Open', icon: 'scan' },
  { id: 3, status: 'Due today', category: 'Evidence', title: 'Add subject ID to BWC-2026-03-13-0004', action: 'Open', icon: 'scan' },
  { id: 4, status: 'Upcoming', category: 'Standards', title: 'Complete annual Use of Force policy acknowledgment', action: 'Open', icon: 'clipboard' },
  { id: 5, status: 'Upcoming', category: 'Standards', title: 'Review updated vehicle pursuit policy', action: 'Open', icon: 'clipboard' },
];

function TaskIconBadge({ icon }: { icon: TaskIcon }) {
  const isAlert = icon === 'alert';
  return (
    <span
      style={{
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: isAlert ? 'rgba(239, 68, 68, 0.10)' : 'var(--fill-weak)',
        color: isAlert ? '#dc2626' : 'var(--muted-foreground)',
      }}
    >
      {icon === 'alert' && <AlertCircle size={16} />}
      {icon === 'scan' && <ScanSearch size={16} />}
      {icon === 'clipboard' && <ClipboardCheck size={16} />}
    </span>
  );
}

export function MyTasks() {
  const overdueCount = TASKS.filter(t => t.status === 'Overdue').length;

  return (
    <Widget
      background="transparent"
      title="My tasks"
      viewAllLabel={
        overdueCount > 0 ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '2px 9px',
              borderRadius: 99,
              color: '#dc2626',
              backgroundColor: '#fee2e2',
            }}
          >
            {overdueCount} overdue
          </span>
        ) : null
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {TASKS.map((t, i) => (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, paddingTop: i === 0 ? 0 : 14, paddingBottom: i === TASKS.length - 1 ? 0 : 14,
              marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20,
              borderBottom: i < TASKS.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <TaskIconBadge icon={t.icon} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text-strong)', margin: 0, fontWeight: 500, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0' }}>
                  {t.status} · {t.category}
                </p>
              </div>
            </div>
            <button
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-strong)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 6,
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {t.action}
            </button>
          </div>
        ))}
      </div>
    </Widget>
  );
}

// ── Shift Schedule ───────────────────────────────────────────────────────────

type Shift = {
  day: string;
  date: string;
  time: string;
  assignment: string;
  off?: boolean;
  isToday?: boolean;
};

const SHIFTS: Shift[] = [
  { day: 'Today', date: 'Mar 11', time: '10:00 — 18:00', assignment: 'Patrol East', isToday: true },
  { day: 'Tomorrow', date: 'Mar 12', time: '10:00 — 18:00', assignment: 'Patrol East' },
  { day: 'Wed', date: 'Mar 13', time: 'Off', assignment: '—', off: true },
  { day: 'Thu', date: 'Mar 14', time: '14:00 — 22:00', assignment: 'Patrol South' },
  { day: 'Fri', date: 'Mar 15', time: '14:00 — 22:00', assignment: 'Patrol South' },
];

export function ShiftSchedule() {
  return (
    <Widget
      background="transparent"
      title="Shift schedule"
      viewAllLabel={
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--muted-foreground)',
          }}
        >
          <Calendar size={12} />
          This week
        </span>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {SHIFTS.map((s, i) => (
          <div
            key={s.date}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              paddingTop: i === 0 ? 0 : 14,
              paddingBottom: i === SHIFTS.length - 1 ? 0 : 14,
              marginLeft: -20,
              marginRight: -20,
              paddingLeft: 20,
              paddingRight: 20,
              borderBottom: i < SHIFTS.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <span
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  backgroundColor: s.isToday ? 'rgba(59, 130, 246, 0.10)' : 'var(--fill-weak)',
                  color: s.isToday ? '#2563eb' : 'var(--muted-foreground)',
                  fontSize: 10,
                  fontWeight: 600,
                  lineHeight: 1.1,
                  letterSpacing: '0.02em',
                }}
              >
                <span style={{ fontSize: 9, textTransform: 'uppercase' }}>{s.date.split(' ')[0]}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{s.date.split(' ')[1]}</span>
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    color: 'var(--text-strong)',
                    margin: 0,
                    fontWeight: 500,
                    lineHeight: 1.4,
                  }}
                >
                  {s.day}
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--muted-foreground)',
                    margin: '2px 0 0',
                  }}
                >
                  {s.off ? 'Off duty' : s.assignment}
                </p>
              </div>
            </div>
            <span
              style={{
                fontSize: 12,
                fontWeight: s.off ? 400 : 500,
                color: s.off ? 'var(--muted-foreground)' : 'var(--text-strong)',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {s.time}
            </span>
          </div>
        ))}
      </div>
    </Widget>
  );
}

// ── Assigned Devices ──────────────────────────────────────────────────────────

const DEVICES = [
  { name: 'Axon Body 4', id: 'D01AM6310', pct: 91, status: 'Online', icon: 'body', pctColor: '#22c55e', ring: '#22c55e', warning: false },
  { name: 'TASER 10', id: 'T10-X45781', pct: 78, status: 'Online', icon: 'taser', pctColor: '#22c55e', ring: '#22c55e', warning: false },
  { name: 'iPhone 14', id: 'MBL-4821', pct: 62, status: 'Online — Cellular', icon: 'phone', pctColor: '#22c55e', ring: '#22c55e', warning: false },
  { name: 'Axon Fleet 3', id: 'FL3-V2204', pct: 100, status: 'Online', icon: 'car', pctColor: '#22c55e', ring: '#22c55e', warning: false },
  { name: 'Axon Air', id: 'AIR-D1087', pct: 45, status: 'Online — WiFi', icon: 'air', pctColor: '#f59e0b', ring: '#f59e0b', warning: true },
];

function DeviceIcon({ type }: { type: string }) {
  const size = 18;
  if (type === 'body') return <Video size={size} />;
  if (type === 'taser') return <Crosshair size={size} />;
  if (type === 'phone') return <Smartphone size={size} />;
  if (type === 'car') return <Car size={size} />;
  if (type === 'air') return <Plane size={size} />;
  return <Circle size={size} />;
}

export function MyDevices() {
  return (
    <Widget
      background="transparent"
      title="My devices"
      viewAllLabel={null}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {DEVICES.map((d, i) => (
          <div
            key={d.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, paddingTop: i === 0 ? 0 : 14, paddingBottom: i === DEVICES.length - 1 ? 0 : 14,
              marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20,
              borderBottom: i < DEVICES.length - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <span
                style={{
                  flexShrink: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'var(--fill-weak)',
                  color: 'var(--muted-foreground)',
                }}
              >
                <DeviceIcon type={d.icon} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, color: 'var(--text-strong)', margin: 0, fontWeight: 500, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name}
                </p>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.id} · {d.status}
                </p>
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: d.pctColor, flexShrink: 0 }}>{d.pct}%</span>
          </div>
        ))}
      </div>
    </Widget>
  );
}

// ── My Performance ────────────────────────────────────────────────────────────

type Trend = 'up' | 'down' | 'flat';

const PERF_METRICS: {
  label: string;
  value: number;
  target: number;
  trend: Trend;
  color: string;
}[] = [
  { label: 'Activation Rate', value: 93, target: 95, trend: 'up', color: '#22c55e' },
  { label: 'Categorization Rate', value: 88, target: 90, trend: 'flat', color: '#f59e0b' },
  { label: 'Report Completion', value: 96, target: 95, trend: 'up', color: '#22c55e' },
  { label: 'Evidence Tagging', value: 82, target: 90, trend: 'up', color: '#f59e0b' },
  { label: 'Response Time Avg', value: 91, target: 85, trend: 'down', color: '#22c55e' },
];

function TrendIcon({ trend, color }: { trend: Trend; color: string }) {
  if (trend === 'up') return <TrendingUp size={14} style={{ color }} />;
  if (trend === 'down') return <TrendingDown size={14} style={{ color }} />;
  return <Minus size={14} style={{ color }} />;
}

function MyPerformance() {
  return (
    <Widget title="My Performance" viewAllLabel="View full dashboard →">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {PERF_METRICS.map((m) => (
          <div
            key={m.label}
            style={{
              borderRadius: 12,
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              padding: '14px 16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--muted-foreground)', fontWeight: 500 }}>{m.label}</span>
              <TrendIcon trend={m.trend} color={m.color} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2a2a2a', marginBottom: 8, lineHeight: 1 }}>{m.value}%</div>
            <div style={{ height: 5, borderRadius: 99, backgroundColor: '#e0e0e0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${m.value}%`, backgroundColor: '#888888', borderRadius: 99 }} />
            </div>
            <div style={{ marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>Target: {m.target}%</span>
            </div>
          </div>
        ))}
      </div>
    </Widget>
  );
}

// ── My Reports ────────────────────────────────────────────────────────────────

type ReportStatus = 'Draft' | 'Returned' | 'Submitted' | 'Approved';

const REPORTS: {
  title: string;
  incident: string;
  status: ReportStatus;
  source: string;
  due: string;
  action: string;
}[] = [
  { title: 'Traffic Stop — DUI Arrest', incident: '#6215', status: 'Draft', source: 'Draft One', due: '—', action: 'Open Draft' },
  { title: 'Domestic Disturbance Response', incident: '#6201', status: 'Returned', source: 'Records', due: 'Today', action: 'Resume Report' },
  { title: 'Suspicious Vehicle Report', incident: '#6198', status: 'Submitted', source: 'Records', due: '—', action: 'View' },
  { title: 'Parking Violation', incident: '#6195', status: 'Approved', source: 'Records', due: '—', action: 'View' },
];

function reportBadgeStyle(s: ReportStatus): React.CSSProperties {
  if (s === 'Draft') return { color: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.15)', border: '1px solid rgba(148,163,184,0.25)' };
  if (s === 'Returned') return { color: '#f87171', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' };
  if (s === 'Submitted') return { color: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)' };
  return { color: '#4ade80', backgroundColor: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)' };
}

function MyReports() {
  return (
    <Widget title="My Reports">
      <div style={{ overflowX: 'auto', marginLeft: -20, marginRight: -20 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Title', 'Incident', 'Status', 'Source', 'Due', 'Action'].map((h, i, arr) => (
                <th key={h} style={{ textAlign: h === 'Action' ? 'right' : 'left', padding: '0 10px 10px', paddingLeft: i === 0 ? 20 : 10, paddingRight: i === arr.length - 1 ? 20 : 10, fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REPORTS.map((r, i) => (
              <tr key={r.incident} style={{ borderBottom: i < REPORTS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '12px 10px', paddingLeft: 20, color: 'var(--text-strong)', fontWeight: 400 }}>{r.title}</td>
                <td style={{ padding: '12px 10px', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{r.incident}</td>
                <td style={{ padding: '12px 10px' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, ...reportBadgeStyle(r.status) }}>
                    {r.status}
                  </span>
                </td>
                <td style={{ padding: '12px 10px', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                    <FileText size={11} />
                    {r.source}
                  </span>
                </td>
                <td style={{ padding: '12px 10px', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{r.due}</td>
                <td style={{ padding: '12px 10px', paddingRight: 20, textAlign: 'right' }}>
                  <button style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-strong)', background: 'none', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', padding: '2px 8px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    {r.action}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Widget>
  );
}

// ── Evidence Drawer ───────────────────────────────────────────────────────────

const EVIDENCE_DRAWER_WIDTH = 420;

const EVIDENCE_TYPE_ICON: Record<string, React.ReactNode> = {
  video: <Video size={15} />,
  image: <Smartphone size={15} />,
  audio: <Wind size={15} />,
  document: <FileText size={15} />,
  text: <FileText size={15} />,
  pdf: <FileText size={15} />,
};

function EvidenceDrawer({
  open,
  onClose,
  onSelectionChange,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onSelectionChange: (items: GraphNode[]) => void;
  onConfirm: (items: GraphNode[]) => void;
}) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [selectedCase, setSelectedCase] = useState<{ id: string; label: string } | null>(null);
  const [caseQuery, setCaseQuery] = useState('');
  const [caseDropdownOpen, setCaseDropdownOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const caseInputRef = useRef<HTMLInputElement>(null);
  const caseDropdownRef = useRef<HTMLDivElement>(null);

  // Load from graph, reload on updates
  useEffect(() => {
    const load = () => {
      const graph = getContextGraph();
      setNodes(Object.values(graph.nodes).filter(n => n.status !== 'deleted' && !!n.vector_file_id));
    };
    load();
    window.addEventListener('evidenceGraphUpdated', load);
    return () => window.removeEventListener('evidenceGraphUpdated', load);
  }, []);

  useEffect(() => {
    if (!caseDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (caseDropdownRef.current && !caseDropdownRef.current.contains(e.target as Node)) {
        setCaseDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [caseDropdownOpen]);

  // Derive cases from loaded nodes
  const caseMap = useMemo(() => {
    const graph = getContextGraph();
    const map = new Map<string, string>();
    nodes.forEach(n => {
      if (n.case_id && !map.has(n.case_id)) {
        const meta = graph.cases?.[n.case_id];
        map.set(n.case_id, meta?.title ? `${n.case_id} — ${meta.title}` : n.case_id);
      }
    });
    return map;
  }, [nodes]);

  const filteredCases = Array.from(caseMap.entries())
    .filter(([, label]) => label.toLowerCase().includes(caseQuery.toLowerCase()))
    .map(([id, label]) => ({ id, label }));

  const filtered = nodes.filter(e => {
    if (selectedCase && e.case_id !== selectedCase.id) return false;
    if (typeFilter && e.media_class !== typeFilter) return false;
    return true;
  });

  const toggleItem = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      onSelectionChange(nodes.filter(n => next.has(n.id)));
      return next;
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: EVIDENCE_DRAWER_WIDTH,
        backgroundColor: 'var(--overlay)',
        borderLeft: '1px solid var(--border)',
        boxShadow: open ? '-4px 0 20px rgba(0,0,0,0.06)' : 'none',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 101,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>Select Evidence</span>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}>
          <X size={16} />
        </button>
      </div>

      {/* Case filter */}
      <div ref={caseDropdownRef} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderRadius: 8, border: '1px solid var(--border)', backgroundColor: 'var(--base)', padding: '0 10px', height: 36 }}>
          <Search size={14} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
          <input
            ref={caseInputRef}
            type="text"
            value={selectedCase ? selectedCase.label : caseQuery}
            onChange={e => { setCaseQuery(e.target.value); setSelectedCase(null); setCaseDropdownOpen(true); }}
            onFocus={() => { setCaseDropdownOpen(true); if (selectedCase) setCaseQuery(''); }}
            placeholder="Filter by case..."
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-strong)', fontFamily: 'inherit' }}
          />
          {selectedCase && (
            <button onClick={() => { setSelectedCase(null); setCaseQuery(''); }} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 0 }}>
              <X size={13} />
            </button>
          )}
        </div>
        {caseDropdownOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 20, right: 20, backgroundColor: 'var(--overlay)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: 'var(--elevation-md)', zIndex: 10, overflow: 'hidden', marginTop: 4 }}>
            <div
              onClick={() => { setSelectedCase(null); setCaseQuery(''); setCaseDropdownOpen(false); }}
              style={{ padding: '8px 12px', fontSize: 13, color: 'var(--muted-foreground)', cursor: 'pointer', borderBottom: filteredCases.length > 0 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--fill-hover)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              All Cases
            </div>
            {filteredCases.map(c => (
              <div
                key={c.id}
                onClick={() => { setSelectedCase(c); setCaseQuery(''); setCaseDropdownOpen(false); }}
                style={{ padding: '8px 12px', fontSize: 13, color: 'var(--text-strong)', cursor: 'pointer', backgroundColor: selectedCase?.id === c.id ? 'var(--fill-weak)' : 'transparent' }}
                onMouseEnter={e => { if (selectedCase?.id !== c.id) e.currentTarget.style.backgroundColor = 'var(--fill-hover)'; }}
                onMouseLeave={e => { if (selectedCase?.id !== c.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {c.label}
              </div>
            ))}
            {filteredCases.length === 0 && (
              <div style={{ padding: '8px 12px', fontSize: 13, color: 'var(--muted-foreground)' }}>No cases found</div>
            )}
          </div>
        )}

        {/* Type filter chips */}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {[
            { key: null, label: 'All', icon: null },
            { key: 'video', label: 'Video', icon: <Video size={11} /> },
            { key: 'image', label: 'Image', icon: <Smartphone size={11} /> },
            { key: 'audio', label: 'Audio', icon: <Wind size={11} /> },
            { key: 'document', label: 'Document', icon: <FileText size={11} /> },
          ].map(({ key, label, icon }) => {
            const active = typeFilter === key;
            return (
              <button
                key={key ?? 'all'}
                onClick={() => setTypeFilter(key)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', border: '1px solid var(--border)', backgroundColor: active ? 'var(--fill-key-strong)' : 'transparent', color: active ? 'var(--text-inverse-strong)' : 'var(--muted-foreground)', transition: 'background-color 0.12s, color 0.12s', whiteSpace: 'nowrap' }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Select all row */}
      {filtered.length > 0 && (() => {
        const allSelected = filtered.every(item => selectedIds.has(item.id));
        const someSelected = filtered.some(item => selectedIds.has(item.id));
        const toggleAll = () => {
          setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
              filtered.forEach(item => next.delete(item.id));
            } else {
              filtered.forEach(item => next.add(item.id));
            }
            onSelectionChange(nodes.filter(n => next.has(n.id)));
            return next;
          });
        };
        return (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, backgroundColor: someSelected ? 'var(--fill-weaker)' : 'transparent' }}
          >
            <Checkbox
              checked={allSelected}
              onCheckedChange={toggleAll}
              style={{ width: 14, height: 14, flexShrink: 0, opacity: someSelected && !allSelected ? 0.5 : 1 }}
            />
            <button
              onClick={toggleAll}
              style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
            >
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            {someSelected && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted-foreground)' }}>
                {selectedIds.size} selected
              </span>
            )}
          </div>
        );
      })()}

      {/* Evidence list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.map((item, i) => (
          <div
            key={item.id}
            onClick={() => toggleItem(item.id)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '14px 20px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              backgroundColor: selectedIds.has(item.id) ? 'var(--fill-weak)' : 'transparent',
            }}
          >
            <Checkbox
              checked={selectedIds.has(item.id)}
              onCheckedChange={() => toggleItem(item.id)}
              onClick={e => e.stopPropagation()}
              style={{ marginTop: 3, flexShrink: 0, width: 14, height: 14 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, color: 'var(--text-strong)', margin: 0, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
              <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '2px 0 0', lineHeight: 1.4, fontWeight: 500, letterSpacing: '0.01em' }}>{item.case_id} · {item.media_class} · {item.date_recorded ? new Date(item.date_recorded).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</p>
              <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '2px 0 0', lineHeight: 1.4, fontWeight: 400, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.8 }}>{item.description}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted-foreground)', flexShrink: 0 }}>
              {EVIDENCE_TYPE_ICON[item.media_class] ?? <FileText size={14} />}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {selectedIds.size > 0 && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={() => {
              const items = nodes.filter(e => selectedIds.has(e.id));
              onConfirm(items);
              onClose();
            }}
            style={{ width: '100%', fontSize: 13, fontWeight: 600, color: 'var(--text-inverse-strong)', backgroundColor: 'var(--fill-key-strong)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: '9px 0', fontFamily: 'inherit' }}
          >
            Add {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''} to research
          </button>
        </div>
      )}
    </div>
  );
}

// ── Chat Drawer ───────────────────────────────────────────────────────────────

export type ChatMessage = { id: string; role: 'user' | 'assistant' | 'system'; text: string; thinking?: string; showSelectEvidence?: boolean; draft?: DraftReport; pendingDraft?: boolean; chunkMap?: Record<string, string>; evidenceSnapshot?: GraphNode[]; toolCall?: ToolCall; metadataEdits?: MetadataEdit[]; featureRequest?: { title: string; description: string }; draftOffer?: { draft: DraftReport; status: 'pending' | 'accepted' | 'declined' } };


// ── Citation processing ───────────────────────────────────────────────────────

// Matches single [EV-ID] or grouped [EV-ID1, EV-ID2, ...] brackets
const CITATION_TAG_RE = /\[EV-[A-Z0-9]+(?:,\s*EV-[A-Z0-9]+)*\]/g;

type CitationEntry = { num: number; id: string; title: string; mediaClass: string; chunk?: string };

function processCitations(
  text: string,
  items: GraphNode[],
  chunkMap?: Record<string, string>,
): { processedText: string; citations: CitationEntry[] } {
  const idToItem = new Map(items.map(item => [item.id, item]));
  const idToNum = new Map<string, number>();
  let counter = 0;

  // Strip any partial citation tag at the end of text (streaming artifact)
  const stripped = text.replace(/\[EV-[A-Z0-9,\s]*$/, '');

  const processedText = stripped.replace(CITATION_TAG_RE, (match) => {
    const ids = match.slice(1, -1).split(/,\s*/);
    return ids.map(id => {
      if (!idToNum.has(id)) idToNum.set(id, ++counter);
      return `[${idToNum.get(id)}]`;
    }).join('');
  });

  const citations: CitationEntry[] = Array.from(idToNum.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([id, num]) => {
      const item = idToItem.get(id);
      const fileId = item?.vector_file_id;
      const rawChunk = fileId && chunkMap ? chunkMap[fileId] : undefined;
      const chunk = rawChunk ? rawChunk.slice(0, 480) + (rawChunk.length > 480 ? '…' : '') : undefined;
      return { num, id, title: item?.title ?? 'Unknown', mediaClass: item?.media_class ?? '', chunk };
    });

  return { processedText, citations };
}

function CitationTooltip({ initialNum, citations }: { initialNum: number; citations: CitationEntry[] }) {
  const [visible, setVisible] = useState(false);
  const [idx, setIdx] = useState(0);
  const [offset, setOffset] = useState(0);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelHide = () => { if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; } };
  const scheduleHide = () => { cancelHide(); hideTimer.current = setTimeout(() => setVisible(false), 120); };

  const handleEnter = () => {
    cancelHide();
    const i = citations.findIndex(c => c.num === initialNum);
    setIdx(i >= 0 ? i : 0);
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      // Compute horizontal offset to keep tooltip within viewport
      const tooltipW = 300;
      const naturalLeft = r.left + r.width / 2 - tooltipW / 2;
      const clampedLeft = Math.min(Math.max(naturalLeft, 8), window.innerWidth - tooltipW - 8);
      setOffset(clampedLeft - naturalLeft);
    }
    setVisible(true);
  };

  const active = citations[idx] ?? citations[0];

  return (
    <span
      ref={anchorRef}
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleEnter}
      onMouseLeave={scheduleHide}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 14, height: 14, borderRadius: 3,
        backgroundColor: 'var(--fill-weak)', border: '1px solid var(--border)',
        fontSize: 9, fontWeight: 700, color: 'var(--muted-foreground)',
        cursor: 'default', verticalAlign: 'super', lineHeight: 1,
        margin: '0 1px', padding: '0 2px',
      }}>
        {initialNum}
      </span>
      {visible && (
        <div
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
          style={{
            position: 'absolute', bottom: 'calc(100% + 6px)',
            left: '50%', transform: `translateX(calc(-50% + ${offset}px))`,
            backgroundColor: 'var(--overlay)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '8px 10px',
            boxShadow: 'var(--elevation-md)',
            zIndex: 300, width: 300,
            display: 'flex', flexDirection: 'column', gap: 5,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-strong)', lineHeight: 1.4 }}>
            {active.title}
          </div>
          {active.mediaClass && (
            <span style={{ fontSize: 10, color: 'var(--muted-foreground)', textTransform: 'capitalize' }}>
              {active.mediaClass}
            </span>
          )}
          {active.chunk && (
            <div style={{
              fontSize: 11, color: 'var(--muted-foreground)', lineHeight: 1.6,
              borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 1,
              maxHeight: 160, overflowY: 'auto',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {active.chunk}
            </div>
          )}
          {citations.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderTop: '1px solid var(--border)', paddingTop: 5, marginTop: 2 }}>
              <button
                onMouseDown={e => { e.preventDefault(); setIdx(i => (i - 1 + citations.length) % citations.length); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 4, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', flexShrink: 0 }}
              >
                <ChevronLeft size={11} />
              </button>
              <button
                onMouseDown={e => { e.preventDefault(); setIdx(i => (i + 1) % citations.length); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 4, border: '1px solid var(--border)', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', flexShrink: 0 }}
              >
                <ChevronRight size={11} />
              </button>
            </div>
          )}
        </div>
      )}
    </span>
  );
}

function injectCitations(children: React.ReactNode, citations: CitationEntry[]): React.ReactNode {
  if (!citations.length) return children;
  const INLINE_CITE_RE = /(\[\d+\])/;
  if (typeof children === 'string') {
    const parts = children.split(INLINE_CITE_RE);
    if (parts.length === 1) return children;
    return parts.map((part, i) => {
      const m = part.match(/^\[(\d+)\]$/);
      if (m) {
        const num = parseInt(m[1]);
        if (citations.some(c => c.num === num)) {
          return <CitationTooltip key={`ct-${i}`} initialNum={num} citations={citations} />;
        }
      }
      return part || null;
    });
  }
  if (Array.isArray(children)) {
    return children.flatMap((child, i) => {
      if (typeof child === 'string') {
        const parts = child.split(INLINE_CITE_RE);
        if (parts.length === 1) return [child];
        return parts.map((part, j) => {
          const m = part.match(/^\[(\d+)\]$/);
          if (m) {
            const num = parseInt(m[1]);
            if (citations.some(c => c.num === num)) {
              return <CitationTooltip key={`ct-${i}-${j}`} initialNum={num} citations={citations} />;
            }
          }
          return part || null;
        });
      }
      return [child];
    });
  }
  return children;
}

export function parseNeedsEvidence(text: string): { text: string; needsEvidence: boolean } {
  const TAG = '<needs_evidence/>';
  if (text.includes(TAG)) {
    return { text: text.replace(TAG, '').trim(), needsEvidence: true };
  }
  return { text, needsEvidence: false };
}


export function parseThinkingFromRaw(raw: string): { thinking: string; text: string } {
  const OPEN = '<thinking>';
  const CLOSE = '</thinking>';
  const openIdx = raw.indexOf(OPEN);
  if (openIdx === -1) return { thinking: '', text: raw };
  const before = raw.slice(0, openIdx);
  const closeIdx = raw.indexOf(CLOSE, openIdx);
  if (closeIdx === -1) {
    // Still streaming inside thinking block
    return { thinking: raw.slice(openIdx + OPEN.length), text: before };
  }
  const thinking = raw.slice(openIdx + OPEN.length, closeIdx);
  const after = raw.slice(closeIdx + CLOSE.length).replace(/^\n+/, '');
  return { thinking, text: (before + after).trim() };
}

const MIN_DRAWER_WIDTH = 540;
const MAX_DRAWER_WIDTH = 780;
const LEARN_MORE_WIDTH = 380;

const CONVERSATION_STARTERS = [
  'Summarize all evidence',
  'Create a timeline',
  'Draft an incident report',
  'Find common patterns',
  'Identify key witnesses',
  'What evidence is missing?',
  'Draft a use-of-force report',
  'Correlate timestamps',
  'Flag contradictions',
  'Suggest categories',
  'Write an arrest summary',
  'Find location links',
  'Draft a vehicle pursuit report',
  'Who are the suspects?',
  'Build an evidence summary',
  'Draft a witness statement',
  'What objects were detected?',
  'Analyze officer footage',
  'Find duplicate entries',
  'Draft a case overview',
  'Prioritize evidence',
  'Build a narrative',
  'Compare evidence dates',
  'Detect anomalies',
  'Create chain of custody',
  'Summarize body cam footage',
  'Find geographic patterns',
  'Draft a field interview report',
  'What connections exist?',
  'Flag high-priority items',
  'Identify recurring locations',
  'Summarize case activity',
  'Draft a search warrant',
  'Find officer overlap',
  'What happened first?',
  'Group by evidence type',
];

export function ChatDrawer({
  open,
  messages,
  onClose,
  onNewChat,
  onSend,
  onSelectEvidence,
  evidenceOpen,
  evidenceCount,
  isStreaming,
  skill,
  onSkillChange,
  evidenceItems,
  onOpenDraft,
  draftOpen,
  onToolCallApprove,
  onToolCallDeny,
  onMetadataEditApply,
  onMetadataEditDismiss,
  onDraftOfferAccept,
  onDraftOfferDecline,
  inline = false,
  scopeChip,
  hideSkills = false,
  hideSelectEvidence = false,
}: {
  open: boolean;
  messages: ChatMessage[];
  onClose: () => void;
  onNewChat: () => void;
  onSend: (text: string) => void;
  onSelectEvidence: () => void;
  evidenceOpen: boolean;
  evidenceCount: number;
  isStreaming: boolean;
  skill: string | null;
  onSkillChange: (skill: string | null) => void;
  evidenceItems: GraphNode[];
  onOpenDraft: (draft: DraftReport) => void;
  draftOpen?: boolean;
  onToolCallApprove: (msgId: string) => void;
  onToolCallDeny: (msgId: string) => void;
  onMetadataEditApply?: (msgId: string, editId: string) => void;
  onMetadataEditDismiss?: (msgId: string, editId: string) => void;
  onDraftOfferAccept?: (msgId: string) => void;
  onDraftOfferDecline?: (msgId: string) => void;
  inline?: boolean;
  scopeChip?: React.ReactNode;
  hideSkills?: boolean;
  hideSelectEvidence?: boolean;
}) {
  const [input, setInput] = useState('');
  const [width, setWidth] = useState(540);
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const { isListening, start: startListening, stop: stopListening } = useSpeechToText(
    useCallback((t: string) => setInput(prev => prev ? prev + ' ' + t : t), [])
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: isStreaming ? 'instant' : 'smooth' });
  }, [messages, isStreaming]);

  useEffect(() => {
    if (open && !isStreaming && !isListening) {
      textareaRef.current?.focus();
    }
  }, [open, isStreaming, isListening]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    onSend(input.trim());
    setInput('');
  };

  const onHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - ev.clientX;
      const next = Math.min(MAX_DRAWER_WIDTH, Math.max(MIN_DRAWER_WIDTH, startWidth.current + delta));
      setWidth(next);
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const containerStyle: React.CSSProperties = inline
    ? {
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
      }
    : {
        position: 'fixed',
        top: 0,
        right: (evidenceOpen ? EVIDENCE_DRAWER_WIDTH : 0) + (draftOpen ? DRAFT_PANEL_WIDTH : 0) + (learnMoreOpen ? LEARN_MORE_WIDTH : 0),
        bottom: 0,
        width,
        backgroundColor: 'var(--overlay)',
        borderLeft: open ? '1px solid var(--border)' : 'none',
        boxShadow: open ? '-8px 0 32px rgba(0,0,0,0.08)' : 'none',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: dragging.current ? 'right 0s' : 'transform 0.25s cubic-bezier(0.4,0,0.2,1), right 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 400,
      };

  return (
    <>
    <div style={containerStyle}>
      {/* Drag handle */}
      {!inline && (
      <div
        onMouseDown={onHandleMouseDown}
        style={{
          position: 'absolute',
          left: -12,
          top: 0,
          bottom: 0,
          width: 24,
          cursor: 'ew-resize',
          display: open ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        <div style={{
          width: 6,
          height: 48,
          borderRadius: 99,
          backgroundColor: 'var(--overlay)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
        }} />
      </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <img src={assistantIcon} alt="Assistant" style={{ width: 32, height: 32 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={onNewChat}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '2px', aspectRatio: '1', borderRadius: 5, background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-strong)', flexShrink: 0 }}
            aria-label="New chat"
          >
            <Plus size={11} strokeWidth={2.5} />
          </button>
          <button style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-strong)', background: 'none', border: '1px solid var(--border)', borderRadius: 5, cursor: 'pointer', padding: '2px 8px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            Chat history
          </button>
          {!inline && (
            <button
              onClick={onClose}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'visible', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.map((m, i) => {
          const isLastAssistant = m.role === 'assistant' && i === messages.length - 1 && isStreaming;
          if (m.role === 'system') {
            return (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--muted-foreground)', backgroundColor: 'var(--fill-weak)', padding: '5px 12px', borderRadius: 99 }}>
                  {m.text}
                </span>
              </div>
            );
          }
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {m.role === 'user' ? (
                <div
                  style={{
                    maxWidth: '80%',
                    padding: '10px 14px',
                    borderRadius: '14px 14px 4px 14px',
                    backgroundColor: 'var(--fill-weak)',
                    color: 'var(--text-strong)',
                    fontSize: 14,
                    lineHeight: 1.5,
                  }}
                >
                  {m.text}
                </div>
              ) : (
                <div style={{ width: '100%', fontSize: 14, lineHeight: 1.6, color: 'var(--text-strong)' }}>
                  {(m.thinking || isLastAssistant) && (
                    <ThinkingBlock content={m.thinking ?? ''} isStreaming={isLastAssistant && (!m.text || !!m.pendingDraft)} />
                  )}
                  {m.text ? (() => {
                    const { processedText, citations } = processCitations(m.text, m.evidenceSnapshot ?? evidenceItems, m.chunkMap);
                    return (
                      <>
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.6, color: 'var(--text-strong)' }}>{injectCitations(children, citations)}</p>,
                            ul: ({ children }) => <ul style={{ paddingLeft: 18, margin: '0 0 8px' }}>{children}</ul>,
                            ol: ({ children }) => <ol style={{ paddingLeft: 18, margin: '0 0 8px' }}>{children}</ol>,
                            li: ({ children }) => <li style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 3, color: 'var(--text-strong)' }}>{injectCitations(children, citations)}</li>,
                            strong: ({ children }) => <strong style={{ fontWeight: 600 }}>{injectCitations(children, citations)}</strong>,
                            h1: ({ children }) => <div style={{ fontSize: 15, fontWeight: 600, margin: '0 0 6px', color: 'var(--text-strong)' }}>{injectCitations(children, citations)}</div>,
                            h2: ({ children }) => <div style={{ fontSize: 14, fontWeight: 600, margin: '8px 0 4px', color: 'var(--text-strong)' }}>{injectCitations(children, citations)}</div>,
                            h3: ({ children }) => <div style={{ fontSize: 13, fontWeight: 600, margin: '6px 0 3px', color: 'var(--text-strong)' }}>{injectCitations(children, citations)}</div>,
                            code: ({ children }) => <code style={{ fontFamily: 'monospace', fontSize: 12, backgroundColor: 'var(--fill-weak)', padding: '1px 5px', borderRadius: 3 }}>{children}</code>,
                            blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--border)', paddingLeft: 10, margin: '0 0 8px', color: 'var(--muted-foreground)' }}>{injectCitations(children, citations)}</blockquote>,
                            table: ({ children }) => <div style={{ overflowX: 'auto', margin: '0 0 10px' }}><table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', minWidth: 400 }}>{children}</table></div>,
                            thead: ({ children }) => <thead>{children}</thead>,
                            tbody: ({ children }) => <tbody>{children}</tbody>,
                            tr: ({ children }) => <tr style={{ borderBottom: '1px solid var(--border)' }}>{children}</tr>,
                            th: ({ children }) => <th style={{ padding: '6px 12px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--muted-foreground)', whiteSpace: 'nowrap', borderBottom: '2px solid var(--border)', background: 'var(--fill-weaker)' }}>{children}</th>,
                            td: ({ children }) => <td style={{ padding: '5px 12px', fontSize: 13, color: 'var(--text-strong)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>{children}</td>,
                          }}
                        >
                          {processedText}
                        </ReactMarkdown>
                        {citations.length > 0 && (
                          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 99, border: '1px solid var(--border)', backgroundColor: 'var(--fill-weaker)', maxWidth: '100%', overflow: 'hidden' }}>
                              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {citations[0].title}
                              </span>
                              {citations.length > 1 && (
                                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-foreground)', flexShrink: 0 }}>
                                  +{citations.length - 1}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })() : isLastAssistant ? (
                    <span style={{ display: 'inline-block', width: 8, height: 14, backgroundColor: 'var(--muted-foreground)', borderRadius: 2, opacity: 0.6, animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom' }} />
                  ) : null}
                  {m.draft && (
                    <DraftCard title={m.draft.title} onOpen={() => onOpenDraft(m.draft!)} />
                  )}
                  {m.toolCall && (
                    <ToolCallCard
                      toolCall={m.toolCall}
                      onApprove={() => onToolCallApprove(m.id)}
                      onDeny={() => onToolCallDeny(m.id)}
                    />
                  )}
                  {m.metadataEdits && m.metadataEdits.map(edit => (
                    <MetadataEditCard
                      key={edit.id}
                      edit={edit}
                      onApply={() => onMetadataEditApply?.(m.id, edit.id)}
                      onDismiss={() => onMetadataEditDismiss?.(m.id, edit.id)}
                    />
                  ))}
                  {m.featureRequest && (
                    <FeatureRequestCard title={m.featureRequest.title} description={m.featureRequest.description} />
                  )}
                  {m.showSelectEvidence && evidenceCount === 0 && !hideSelectEvidence && (
                    <div style={{ marginTop: 10 }}>
                      <AnimatedBorderButton
                        onClick={onSelectEvidence}
                        animated={true}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: 'var(--text-strong)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: '5px 12px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        Select evidence
                      </AnimatedBorderButton>
                    </div>
                  )}
                  {m.draftOffer?.status === 'pending' && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => onDraftOfferAccept?.(m.id)}
                        style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-inverse-strong)', backgroundColor: 'var(--fill-key-strong)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '6px 12px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        Yes, draft it
                      </button>
                      <button
                        onClick={() => onDraftOfferDecline?.(m.id)}
                        style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-strong)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: '6px 12px', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                      >
                        No thanks
                      </button>
                    </div>
                  )}
                  {m.draftOffer?.status === 'declined' && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--muted-foreground)', fontStyle: 'italic' }}>
                      Dismissed.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '0 16px 16px', flexShrink: 0, maxWidth: 720, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {/* Contextual banner */}
        <div
          onClick={() => setLearnMoreOpen(p => !p)}
          style={{
            margin: '0 40px',
            borderRadius: '10px 10px 0 0',
            padding: '1px 1px 0 1px',
            background: 'linear-gradient(90deg, #a855f7, #eab308, #f97316)',
            cursor: 'pointer',
          }}
        >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            backgroundColor: 'var(--base)',
            borderRadius: '9px 9px 0 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={assistantIcon} alt="Assistant" style={{ width: 18, height: 18, opacity: 0.9, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 400, color: '#4a4a4a' }}>
              Learn more about what the Assistant can do.
            </span>
          </div>
          <ArrowRight size={16} style={{ color: '#4a4a4a', opacity: 0.9, flexShrink: 0 }} />
        </div>
        </div>
        <div style={{ borderRadius: 12, border: `1px solid ${isListening ? 'var(--fill-key-strong)' : '#d4d4d4'}`, backgroundColor: inline ? '#ffffff' : 'var(--base)', padding: '10px 12px 8px', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: 'none', transition: 'border-color 0.15s' }}>
          {isListening ? (
            <ListeningWave />
          ) : (
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={isStreaming ? 'Waiting for response…' : 'Ask me anything...'}
              rows={1}
              disabled={isStreaming}
              style={{ width: '100%', background: 'none', border: 'none', outline: 'none', resize: 'none', fontSize: 14, color: 'var(--text-strong)', fontFamily: 'inherit', lineHeight: 1.5, minHeight: 56, overflow: 'hidden', opacity: isStreaming ? 0.5 : 1 }}
            />
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {!hideSkills && (
                <SkillsDropdown value={skill} onChange={onSkillChange} onSelectEvidence={onSelectEvidence} evidenceCount={evidenceCount} />
              )}
              {scopeChip}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={isListening ? stopListening : startListening}
                disabled={isStreaming}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: 'none', background: 'none', color: isListening ? 'var(--fill-key-strong)' : 'var(--muted-foreground)', cursor: isStreaming ? 'default' : 'pointer' }}
              >
                {isListening ? <Square size={11} fill="currentColor" /> : <Mic size={13} />}
              </button>
              <button
                onClick={handleSend}
                disabled={isStreaming}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 7, border: 'none', backgroundColor: input.trim() && !isStreaming ? 'var(--fill-key-strong)' : 'var(--fill-weak)', color: input.trim() && !isStreaming ? 'var(--text-inverse-strong)' : 'var(--muted-foreground)', cursor: input.trim() && !isStreaming ? 'pointer' : 'default', transition: 'background-color 0.15s' }}
              >
                <ArrowUp size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Learn More Drawer */}
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: LEARN_MORE_WIDTH,
        backgroundColor: 'var(--overlay)',
        borderLeft: '1px solid var(--border)',
        boxShadow: learnMoreOpen ? '-8px 0 32px rgba(0,0,0,0.08)' : 'none',
        transform: learnMoreOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 99,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-strong)' }}>Try asking…</span>
        <button
          onClick={() => setLearnMoreOpen(false)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: 'none', background: 'none', cursor: 'pointer', color: 'var(--muted-foreground)' }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Starters */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CONVERSATION_STARTERS.map(starter => (
            <button
              key={starter}
              onClick={() => {
                setInput(starter);
                setLearnMoreOpen(false);
                setTimeout(() => textareaRef.current?.focus(), 50);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 99,
                border: '1px solid var(--border)',
                backgroundColor: 'var(--base)',
                color: 'var(--text-strong)',
                fontSize: 12,
                fontWeight: 400,
                cursor: 'pointer',
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                transition: 'background-color 0.12s, border-color 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--fill-weak)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--base)'; }}
            >
              {starter}
            </button>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const INCIDENT_6201_DRAFT = `**Incident #6201 — Domestic Disturbance Response**

**Date / Time:** March 8, 2026 · 22:14
**Location:** 4421 Whitman St, Unit 3B
**Responding Officer:** M. Reyes (Badge #2841)
**Backing Unit:** Officer L. Cho (Badge #3105)
**Disposition:** Verbal warning · No arrest

---

## Summary
Responded to a 911 call from a neighbor reporting loud arguing and a possible physical altercation between two residents at 4421 Whitman St, Unit 3B. On arrival, both parties were verbally separated, no injuries observed, no weapons present. Verbal warning issued and a domestic resource pamphlet was provided. Cleared scene at 22:51.

## Narrative
Dispatched at 22:09 to 4421 Whitman St, Unit 3B following a 911 call from Maria Sanchez (Unit 3A) reporting loud arguing for ~30 minutes and what she described as "a heavy thud against the shared wall." Arrived on scene at 22:14 with Officer Cho providing backup.

On arrival both residents — John Doe (R/M, DOB 1985-04-12) and Jane Doe (R/F, DOB 1988-09-03) — were standing in the kitchen. Verbal argument was still in progress and was de-escalated upon our entry. I separated the parties: I interviewed Mr. Doe in the living room while Officer Cho interviewed Ms. Doe in the bedroom.

Both parties stated the argument was verbal only and stemmed from a dispute over household finances. Neither party reported physical contact and no injuries were observed on either subject. The apartment showed no signs of damage other than an overturned dining chair, which Ms. Doe stated she had pushed back from the table during the argument — consistent with the sound described by the reporting neighbor.

A check of the residence confirmed no other occupants and no minors present. Both parties were advised of available domestic violence resources and provided with a pamphlet. Verbal warning issued regarding noise. Both parties agreed to remain on scene until officers cleared.

## Subjects
- **John Doe** — Resident, R/M, DOB 1985-04-12 — No injuries observed. Cooperative.
- **Jane Doe** — Resident, R/F, DOB 1988-09-03 — No injuries observed. Cooperative.

## Witnesses
- **Maria Sanchez** — Neighbor, Unit 3A. Phone: (504) 555-0142. Statement (22:38): Reported hearing arguing for "about half an hour" preceding her 911 call, and a single loud bang at approximately 22:00 that she described as "something hitting the wall." Did not observe any physical contact and did not see either resident outside the apartment during the incident.
- **Mark Chen** — Neighbor, Unit 2B (directly below). Phone: (504) 555-0188. Statement (22:44): Reported hearing raised voices "for maybe twenty minutes" and a single loud bang around 22:00. Did not hear repeated impacts. Did not observe any persons leave the building.

Both witness statements are consistent with the residents' account of a single overturned chair and a primarily verbal dispute.

## Evidence
- \`BWC-2026-03-08-0014\` — Body-worn camera, M. Reyes — 47:12 — Full on-scene recording from arrival through clear.
- \`BWC-2026-03-08-0015\` — Body-worn camera, L. Cho — 31:48 — Secondary angle, interview with Ms. Doe.
- \`IMG-2026-03-08-0003\` — 12 photographs of scene, including the overturned dining chair and shared wall (no visible damage).

## Disposition
Verbal warning issued. No arrest. No protective order requested by either party. Domestic resource pamphlet provided. Both parties advised to call 911 if the situation re-escalates. Cleared scene at 22:51.

## Outstanding (now complete)
- [x] Witness statement from Maria Sanchez (Unit 3A)
- [x] Witness statement from Mark Chen (Unit 2B)
- [x] Witness section incorporated into narrative per Sgt. Park's return note (2026-03-09)
`;

export function HomePage({ onSearch }: { onSearch: (q: string) => void }) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatStreamingId, setChatStreamingId] = useState<string | null>(null);
  const [chatSkill, setChatSkill] = useState<string | null>(null);
  const [confirmedEvidenceItems, setConfirmedEvidenceItems] = useState<GraphNode[]>([]);
  const [graphScopedEvidence, setGraphScopedEvidence] = useState<GraphNode[]>([]);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [openDraft, setOpenDraft] = useState<DraftReport | null>(null);
  const [chatWidth, setChatWidth] = useState(600);
  const chatDraggingRef = useRef(false);

  // The home chat scopes to whatever evidence is currently visible/matched in
  // the knowledge graph. The user must search or filter the graph first to set
  // a scope; otherwise the assistant has no context.
  const chatEvidence = graphScopedEvidence;

  // Proactive greeting: if the officer has an overdue task, flag it and offer
  // to draft a completion — but wait for explicit confirmation before
  // generating. Streams a short thinking chain + question, then attaches a
  // pending draftOffer with Yes / No buttons. Fires once per page lifetime.
  const overdueSeededRef = useRef(false);
  const overdueMsgIdRef = useRef<string | null>(null);
  const overdueCancelledRef = useRef(false);
  useEffect(() => {
    if (overdueSeededRef.current) return;
    if (chatMessages.length > 0) return;
    const overdue = TASKS.find(t => t.status === 'Overdue');
    if (!overdue) return;
    overdueSeededRef.current = true;

    const msgId = `asst-overdue-${Date.now()}`;
    overdueMsgIdRef.current = msgId;
    overdueCancelledRef.current = false;
    setChatMessages(prev => prev.length > 0 ? prev : [{ id: msgId, role: 'assistant', text: '', thinking: '' }]);
    setChatStreamingId(msgId);

    const thinkingChain = [
      "Checking the officer's open work…",
      `Found 1 overdue item in My tasks — "${overdue.title}" (${overdue.category}).`,
      "Pulling the original return note from Sgt. Park — \"Missing witness info in narrative.\"",
      "Cross-referencing Incident #6201 evidence: BWC-2026-03-08-0014, IMG-2026-03-08-0003, and the two neighbor statements logged the next morning.",
      "Surfacing this proactively so it doesn't get missed — but waiting for the officer's go-ahead before drafting anything.",
    ].join('\n');

    const textBody = `I noticed you have an overdue task — **${overdue.title}**. The report was returned by Sgt. Park with a note about missing witness info in the narrative. The witness statements from Maria Sanchez and Mark Chen are now logged, so I can stitch them into the existing narrative and hand back a complete draft for your review. Want me to draft it?`;

    const draft: DraftReport = {
      title: 'Domestic Disturbance Response — Incident #6201',
      body: INCIDENT_6201_DRAFT,
    };

    const streamChars = (
      source: string,
      apply: (next: string) => void,
      perTick: number,
      tickMs: number,
      done: () => void,
    ) => {
      let i = 0;
      const tick = () => {
        if (overdueCancelledRef.current) return;
        i = Math.min(source.length, i + perTick);
        apply(source.slice(0, i));
        if (i >= source.length) { done(); return; }
        setTimeout(tick, tickMs);
      };
      tick();
    };

    const updateMsg = (patch: Partial<ChatMessage>) => {
      if (overdueCancelledRef.current) return;
      setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, ...patch } : m));
    };

    // Stream thinking, then the question text, then attach the pending offer.
    // The offer carries the prepared draft so accepting can stream it in
    // without re-deriving anything.
    streamChars(
      thinkingChain,
      next => updateMsg({ thinking: next }),
      3,
      24,
      () => {
        streamChars(
          textBody,
          next => updateMsg({ text: next }),
          4,
          22,
          () => {
            if (overdueCancelledRef.current) return;
            updateMsg({ draftOffer: { draft, status: 'pending' } });
            setChatStreamingId(null);
          },
        );
      },
    );

    return () => { overdueCancelledRef.current = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the officer accepts the proactive offer: mark the offer accepted on
  // the original message, then stream a fresh assistant turn that runs the
  // original draft flow (short thinking → text → draft attachment).
  const handleDraftOfferAccept = useCallback((msgId: string) => {
    const offerMsg = chatMessages.find(m => m.id === msgId);
    const draft = offerMsg?.draftOffer?.draft;
    if (!draft) return;

    setChatMessages(prev => prev.map(m => m.id === msgId
      ? { ...m, draftOffer: m.draftOffer ? { ...m.draftOffer, status: 'accepted' as const } : m.draftOffer }
      : m,
    ));

    const newId = `asst-draft-${Date.now()}`;
    setChatMessages(prev => [...prev, { id: newId, role: 'assistant', text: '', thinking: '' }]);
    setChatStreamingId(newId);

    const cancelled = { current: false };
    const thinkingChain = [
      'Got it — drafting the completion.',
      'Pulling the witness statements from Maria Sanchez (Unit 3A) and Mark Chen (Unit 2B).',
      'Stitching the witness section into the existing narrative, keeping the disposition unchanged.',
      'Done. Handing the full draft back for review.',
    ].join('\n');
    const textBody = `Here's the completed draft — witness section added with both neighbor statements, narrative re-flowed, disposition untouched.`;

    const streamChars = (
      source: string,
      apply: (next: string) => void,
      perTick: number,
      tickMs: number,
      done: () => void,
    ) => {
      let i = 0;
      const tick = () => {
        if (cancelled.current) return;
        i = Math.min(source.length, i + perTick);
        apply(source.slice(0, i));
        if (i >= source.length) { done(); return; }
        setTimeout(tick, tickMs);
      };
      tick();
    };

    const updateMsg = (patch: Partial<ChatMessage>) => {
      if (cancelled.current) return;
      setChatMessages(prev => prev.map(m => m.id === newId ? { ...m, ...patch } : m));
    };

    streamChars(
      thinkingChain,
      next => updateMsg({ thinking: next }),
      3,
      22,
      () => {
        updateMsg({ pendingDraft: true });
        streamChars(
          textBody,
          next => updateMsg({ text: next }),
          4,
          20,
          () => {
            if (cancelled.current) return;
            updateMsg({ draft, pendingDraft: false });
            setChatStreamingId(prev => prev === newId ? null : prev);
          },
        );
      },
    );
  }, [chatMessages]);

  const handleDraftOfferDecline = useCallback((msgId: string) => {
    setChatMessages(prev => prev.map(m => m.id === msgId
      ? { ...m, draftOffer: m.draftOffer ? { ...m.draftOffer, status: 'declined' as const } : m.draftOffer }
      : m,
    ));
  }, []);

  // When the user switches to the Investigate tab, drop the proactive overdue
  // greeting from the chat (and cancel its stream if still running).
  const handleTabChange = useCallback((tab: 'agents' | 'evidence' | 'artifacts') => {
    if (tab !== 'evidence') return;
    const id = overdueMsgIdRef.current;
    if (!id) return;
    overdueCancelledRef.current = true;
    overdueMsgIdRef.current = null;
    setChatMessages(prev => prev.filter(m => m.id !== id));
    setChatStreamingId(prev => prev === id ? null : prev);
  }, []);

  const onChatHandleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    chatDraggingRef.current = true;
    const startX = e.clientX;
    const startWidth = chatWidth;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';

    const onMouseMove = (ev: MouseEvent) => {
      if (!chatDraggingRef.current) return;
      const delta = startX - ev.clientX;
      const next = Math.min(900, Math.max(560, startWidth + delta));
      setChatWidth(next);
    };
    const onMouseUp = () => {
      chatDraggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const sendChatMessage = async (text: string, history: ChatMessage[], evidenceItems: GraphNode[]) => {
    const assistantId = `asst-${Date.now()}`;
    setChatMessages(prev => [...prev, { id: assistantId, role: 'assistant', text: '', evidenceSnapshot: evidenceItems }]);
    setChatStreamingId(assistantId);

    const apiItems = evidenceItems.map(e => ({
      id: e.id,
      title: e.title,
      media_class: e.media_class,
      date_recorded: e.date_recorded,
      description: e.description ?? '',
      officer: e.officer,
      category: e.category,
      vector_file_id: e.vector_file_id,
    }));

    const engineHistory: EngineChatMessage[] = history
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));

    // If evidence is now loaded but a previous assistant turn asked for it,
    // inject a synthetic exchange so the LLM knows the context has changed.
    const prevAskForEvidence = history.some(m => m.showSelectEvidence);
    if (apiItems.length > 0 && prevAskForEvidence) {
      const originalRequest = history
        .filter(m => m.role === 'user' && m.text.trim().length > 3)
        .at(-1);
      engineHistory.push(
        { role: 'user', content: `[${apiItems.length} evidence item${apiItems.length !== 1 ? 's' : ''} have now been selected and are available. Please proceed with my original request: "${originalRequest?.text ?? 'help me with this evidence'}"]` },
        { role: 'assistant', content: `Understood — I can see the ${apiItems.length} evidence items and will proceed with your request now.` },
      );
    }

    const raw = { current: '' };
    let evidencePrompted = false;

    try {
      const { chunksByFileId } = await chatWithEvidenceStream(text, engineHistory, apiItems, (chunk) => {
        raw.current += chunk;
        const { thinking, text: afterThinking } = parseThinkingFromRaw(raw.current);
        const { content: afterDraft, draft } = parseDraft(afterThinking);
        const { text: afterNeedsEvidence, needsEvidence } = parseNeedsEvidence(afterDraft);
        const displayText = stripFeatureRequestTags(stripActionTags(stripMetadataEditTags(afterNeedsEvidence)));
        // True while <draft_report> tag is open but closing tag hasn't arrived yet
        const pendingDraft = afterThinking.includes('<draft_report') && draft === null;
        if (needsEvidence && !evidencePrompted) {
          evidencePrompted = true;
          setChatSkill('deep-research');
        }
        setChatMessages(prev =>
          prev.map(m => m.id === assistantId ? {
            ...m, thinking, text: displayText,
            draft: draft ?? m.draft,
            pendingDraft,
            showSelectEvidence: needsEvidence || m.showSelectEvidence,
          } : m)
        );
      });
      // After streaming, parse actions, metadata edits, and feature requests into cards
      const { text: afterThinkingFinal } = parseThinkingFromRaw(raw.current);
      const { content: afterDraftFinal } = parseDraft(afterThinkingFinal);
      const { text: afterNeedsEvidenceFinal } = parseNeedsEvidence(afterDraftFinal);
      const featureReq = parseFeatureRequest(afterNeedsEvidenceFinal);
      const finalDisplayText = stripFeatureRequestTags(stripActionTags(stripMetadataEditTags(afterNeedsEvidenceFinal)));
      setChatMessages(prev => prev.map(m => m.id === assistantId ? {
        ...m,
        text: finalDisplayText,
        ...(featureReq ? { featureRequest: featureReq } : {}),
      } : m));
      const getTitle = (id: string) => evidenceItems.find(n => n.id === id)?.title;
      const { edits: metaEdits } = parseMetadataEdits(afterNeedsEvidenceFinal, getTitle);
      const { actions } = parseActions(afterNeedsEvidenceFinal);
      const batchActions = actions.filter(a => a.type === 'add_to_case');
      const perItemActions = actions.filter(a => a.type !== 'add_to_case');
      const ACTION_FIELD_MAP: Record<string, string> = { set_category: 'category', set_status: 'status', add_tag: 'tags' };
      const allEdits: MetadataEdit[] = [
        ...metaEdits.map(e => {
          const node = evidenceItems.find(n => n.id === e.evidence_id);
          const currentValue = node ? (node as any)[e.field] as string | undefined : undefined;
          return { ...e, current_value: currentValue, status: 'pending' as const };
        }),
        ...perItemActions.map(a => {
          const field = ACTION_FIELD_MAP[a.type] ?? a.type;
          const count = a.item_ids.length;
          const isBatch = count > 1;
          const firstNode = evidenceItems.find(n => n.id === a.item_ids[0]);
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
      // attach chunk map so citation tooltips can show retrieved text
      if (Object.keys(chunksByFileId).length > 0) {
        setChatMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, chunkMap: chunksByFileId } : m)
        );
      }
    } catch (err) {
      console.error('[chat] error:', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setChatMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, text: msg } : m)
      );
    } finally {
      setChatStreamingId(null);
    }
  };

  const handleSkillChange = (skill: string | null) => {
    setChatSkill(skill);
    if (skill === null) {
      setConfirmedEvidenceItems([]);
      setEvidenceCount(0);
    }
  };

  const needsEvidenceGuidance = (skill: string | null, items: GraphNode[]) =>
    skill === 'deep-research' && items.length === 0;

  const evidenceGuidanceMessage = (): ChatMessage => ({
    id: `asst-${Date.now()}`,
    role: 'assistant',
    text: 'To use Deep Research, please select the evidence you\'d like me to analyze first.',
    showSelectEvidence: true,
  });

  const isSearchIntent = (text: string): boolean => {
    const lower = text.toLowerCase().trim();
    return /\b(find|search|look|locate|show|get|pull|retrieve)\b/.test(lower) &&
      /\b(evidence|footage|video|clip|file|document|report|record|image|photo|body.?cam|dashcam|cctv)\b/.test(lower);
  };

  const FACIAL_MATCH_WATCHLIST_RE = /facial.?match.*watchlist|watchlist.*facial.?match|enable.*watchlist|watchlist.*permiss/i;

  const ADD_TO_CASE_RE = /\badd\b.*(to|into)\s*(a\s+)?case\b|\badd.*evidence.*to.*case|move.*to.*case|link.*to.*case/i;

  const makeAddToCaseMock = (items: GraphNode[], text: string): ChatMessage => {
    const caseMatch = text.match(/\bcase[\s:]+([A-Z0-9][\w-]*)/i);
    const caseId = caseMatch?.[1] ?? items[0]?.case_id ?? 'CR-2024-001';
    const itemCount = items.length;
    const evidenceIds = items.map(e => e.id).slice(0, 3).join(', ') + (items.length > 3 ? ` +${items.length - 3} more` : '');
    return {
      id: `asst-${Date.now()}`,
      role: 'assistant',
      text: `I'll link ${itemCount} evidence item${itemCount !== 1 ? 's' : ''} to case ${caseId}. Please review and approve below.`,
      toolCall: {
        name: 'add_evidence_to_case',
        label: `Add ${itemCount} item${itemCount !== 1 ? 's' : ''} to Case ${caseId}`,
        description: `Links the selected evidence to case ${caseId} in the evidence management system.`,
        input: {
          case_id: caseId,
          evidence_count: String(itemCount),
          evidence_ids: evidenceIds,
        },
        status: 'pending',
      },
    };
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

  const handleMetadataEditApply = (msgId: string, editId: string) => {
    setChatMessages(prev => prev.map(m => {
      if (m.id !== msgId || !m.metadataEdits) return m;
      const edit = m.metadataEdits.find(e => e.id === editId);
      if (!edit) return m;
      const idsToUpdate = edit.evidence_ids ?? [edit.evidence_id];
      setConfirmedEvidenceItems(items => items.map(item => {
        if (!idsToUpdate.includes(item.id)) return item;
        if (edit.field === 'tags') {
          const existing: string[] = (item as any).tags ?? [];
          return { ...item, tags: [...existing.filter((t: string) => t !== edit.new_value), edit.new_value] };
        }
        return { ...item, [edit.field]: edit.new_value };
      }));
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

  const FACIAL_MATCH_MOCK_TEXT = "Sure. To grant Administrators on Pro accounts the ability to create and edit facial match watchlists, I'll update the role permission configuration. Please review and approve the change below.";

  const makeFacialMatchMock = (): ChatMessage => ({
    id: `asst-${Date.now()}`,
    role: 'assistant',
    text: FACIAL_MATCH_MOCK_TEXT,
    toolCall: {
      name: 'set_permission',
      label: 'Enable: Create and Edit Facial Match Watchlist',
      description: 'Grants Administrators on Pro accounts the ability to create and edit facial recognition watchlists.',
      input: {
        permission: 'facial_match_watchlist.create_edit',
        role: 'Administrator',
        account_type: 'Pro',
        enabled: 'true',
      },
      status: 'pending',
    },
  });

  const handleChatSend = (text: string) => {
    if (text.startsWith('__system__')) {
      const systemText = text.slice('__system__'.length);
      setChatMessages(prev => [...prev, { id: `sys-${Date.now()}`, role: 'system', text: systemText }]);
      return;
    }
    if (isSearchIntent(text)) { onSearch(text); return; }
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', text };
    if (FACIAL_MATCH_WATCHLIST_RE.test(text)) {
      setChatMessages(prev => [...prev, userMsg, makeFacialMatchMock()]);
      return;
    }
    if (ADD_TO_CASE_RE.test(text) && chatEvidence.length > 0) {
      setChatMessages(prev => [...prev, userMsg, makeAddToCaseMock(chatEvidence, text)]);
      return;
    }
    if (needsEvidenceGuidance(chatSkill, chatEvidence)) {
      setChatMessages(prev => [...prev, userMsg, evidenceGuidanceMessage()]);
      return;
    }
    setChatMessages(prev => [...prev, userMsg]);
    sendChatMessage(text, [...chatMessages, userMsg], chatEvidence);
  };

  return (
    <>
    <div
      style={{
        height: '100%',
        background: 'var(--base)',
        display: 'flex',
        alignItems: 'stretch',
        overflow: 'hidden',
      }}
    >
      {/* Left column: knowledge graph */}
      <div style={{ flex: 1, minWidth: 0, height: '100%', overflow: 'hidden', display: 'flex' }}>
        <KnowledgeGraphPanel
          onVisibleEvidenceChange={setGraphScopedEvidence}
          onTabChange={handleTabChange}
        />
      </div>

      {/* Right column: inline chat */}
      <div style={{ width: chatWidth, flexShrink: 0, minWidth: 0, height: '100%', borderLeft: '1px solid var(--border)', position: 'relative' }}>
        {/* Drag handle — straddles the border between graph and chat */}
        <div
          onMouseDown={onChatHandleMouseDown}
          style={{
            position: 'absolute',
            left: -12,
            top: 0,
            bottom: 0,
            width: 24,
            cursor: 'ew-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5,
          }}
        >
          <div style={{
            width: 6,
            height: 48,
            borderRadius: 99,
            backgroundColor: 'var(--overlay)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
          }} />
        </div>
        <ChatDrawer
          inline
          hideSkills
          hideSelectEvidence
          open={true}
          messages={chatMessages}
          onClose={() => {}}
          onNewChat={() => setChatMessages([])}
          onSend={handleChatSend}
          onSelectEvidence={() => setEvidenceOpen(true)}
          evidenceOpen={evidenceOpen}
          evidenceCount={chatEvidence.length}
          isStreaming={chatStreamingId !== null}
          skill={chatSkill}
          onSkillChange={handleSkillChange}
          evidenceItems={chatEvidence}
          onOpenDraft={setOpenDraft}
          draftOpen={!!openDraft}
          onToolCallApprove={handleToolCallApprove}
          onToolCallDeny={handleToolCallDeny}
          onMetadataEditApply={handleMetadataEditApply}
          onMetadataEditDismiss={handleMetadataEditDismiss}
          onDraftOfferAccept={handleDraftOfferAccept}
          onDraftOfferDecline={handleDraftOfferDecline}
          scopeChip={
            chatEvidence.length > 0 ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  height: 28,
                  padding: '0 10px',
                  borderRadius: 7,
                  border: '1px solid #bfdbfe',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  fontSize: 12,
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap',
                }}
              >
                <ScanSearch size={12} />
                Scoped to {chatEvidence.length} evidence item{chatEvidence.length === 1 ? '' : 's'}
              </span>
            ) : null
          }
        />
      </div>
    </div>
    <EvidenceDrawer
      open={evidenceOpen}
      onClose={() => setEvidenceOpen(false)}
      onSelectionChange={(items: GraphNode[]) => { setConfirmedEvidenceItems(items); setEvidenceCount(items.length); }}
      onConfirm={(items: GraphNode[]) => { setConfirmedEvidenceItems(items); setEvidenceCount(items.length); }}
    />
    <DraftDrawer draft={openDraft} open={!!openDraft} onClose={() => setOpenDraft(null)} />
    </>
  );
}
