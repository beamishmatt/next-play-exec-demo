import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { SCOPE_CHIPS } from '../SearchDropdown';

// ── Skills dropdown ───────────────────────────────────────────────────────────

const SKILLS = [
  { id: 'deep-research', label: 'Deep Research', icon: <Search size={13} /> },
  { id: 'policy', label: 'Policy', icon: <Shield size={13} /> },
];

function SkillsDropdown() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

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

function HomeSearch({ onSearch }: { onSearch: (q: string) => void }) {
  const [tab, setTab] = useState<'chat' | 'search'>('chat');
  const [value, setValue] = useState('');
  const [activeScopes, setActiveScopes] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  const toggleScope = useCallback((id: string) => {
    setActiveScopes(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  return (
    <div
      style={{
        borderRadius: 16,
        border: '1px solid var(--border)',
        backgroundColor: 'var(--overlay)',
        boxShadow: 'var(--elevation-md)',
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
              onClick={() => setTab(t)}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: 'var(--muted-foreground)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Search
            <kbd style={{ padding: '2px 7px', borderRadius: 4, border: '1px solid var(--border)', fontSize: 11, lineHeight: '16px', fontFamily: 'inherit' }}>/</kbd>
          </span>
        </div>
      </div>

      {tab === 'chat' && (
        <div style={{ borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--base)', padding: '12px 14px 10px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Explore a topic..."
            rows={1}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) e.preventDefault(); }}
            style={{ width: '100%', background: 'none', border: 'none', outline: 'none', resize: 'none', fontSize: 16, color: 'var(--text-strong)', fontFamily: 'inherit', lineHeight: 1.5, minHeight: 28, overflow: 'hidden' }}
          />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SkillsDropdown /></div>
            <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', backgroundColor: value.trim() ? 'var(--fill-key-strong)' : 'var(--fill-weak)', color: value.trim() ? 'var(--text-inverse-strong)' : 'var(--muted-foreground)', cursor: value.trim() ? 'pointer' : 'default', transition: 'background-color 0.15s' }}>
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      )}

      {tab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ borderRadius: 10, border: '1px solid var(--border)', backgroundColor: 'var(--base)', padding: '0 14px', display: 'flex', alignItems: 'center', gap: 10, height: 48 }}>
            <Search size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Describe what you want to find"
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
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
  children,
}: {
  title: string;
  viewAllLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ backgroundColor: 'rgba(255,255,255,0.035)', padding: 4, borderRadius: 16 }}>
      <div
        style={{
          position: 'relative',
          borderRadius: 12,
          border: '1px solid var(--border)',
          backgroundColor: 'var(--overlay)',
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.12), inset 0 -1px 0 rgba(255,255,255,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 14, marginLeft: -20, marginRight: -20, paddingLeft: 20, paddingRight: 20, borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-strong)' }}>{title}</span>
          <button style={{ fontSize: 13, color: 'var(--text-key)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            {viewAllLabel}
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── My Tasks ──────────────────────────────────────────────────────────────────

type TaskStatus = 'Overdue' | 'Due Today' | 'Upcoming';

const TASKS: {
  id: number;
  status: TaskStatus;
  category: string;
  title: string;
  subtitle: string;
  action: string;
  icon: 'alert' | 'video' | 'circle';
}[] = [
  { id: 1, status: 'Overdue', category: 'Records', title: 'Complete report for Incident #6201', subtitle: 'Returned by Sgt. Park — "Missing witness info in narrative"', action: 'Resume Report', icon: 'alert' },
  { id: 2, status: 'Due Today', category: 'Evidence / DEMS', title: 'Categorize 4 evidence items from 03/11 shift', subtitle: '', action: 'Open', icon: 'video' },
  { id: 3, status: 'Due Today', category: 'Evidence / DEMS', title: 'Add subject ID to BWC-2026-03-13-0004', subtitle: '', action: 'Quick Edit', icon: 'video' },
  { id: 4, status: 'Upcoming', category: 'Standards', title: 'Complete annual Use of Force policy acknowledgment', subtitle: 'Due Mar 20', action: 'Open', icon: 'circle' },
  { id: 5, status: 'Upcoming', category: 'Standards', title: 'Review updated vehicle pursuit policy', subtitle: 'Due Mar 25', action: 'Open', icon: 'circle' },
];

function taskStatusStyle(s: TaskStatus): React.CSSProperties {
  if (s === 'Overdue') return { color: '#f87171', backgroundColor: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.25)' };
  if (s === 'Due Today') return { color: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.25)' };
  return { color: 'var(--muted-foreground)', backgroundColor: 'var(--fill-weak)', border: '1px solid var(--border)' };
}

function actionBtnStyle(): React.CSSProperties {
  return { fontSize: 12, fontWeight: 500, padding: '5px 14px', borderRadius: 7, cursor: 'pointer', border: '1px solid var(--border)', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0, backgroundColor: 'transparent', color: 'var(--text-strong)' };
}

function MyTasks() {
  return (
    <Widget title="My Tasks">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {TASKS.map((t) => (
          <div
            key={t.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: '11px 14px',
              borderRadius: 10, border: '1px solid var(--border)',
              backgroundColor: 'var(--base)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                {t.icon === 'alert'
                  ? <AlertCircle size={15} style={{ color: '#f87171' }} />
                  : t.icon === 'video'
                  ? <Video size={15} style={{ color: 'var(--muted-foreground)' }} />
                  : <Circle size={15} style={{ color: 'var(--muted-foreground)' }} />}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 5, ...taskStatusStyle(t.status) }}>
                    {t.status}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                    {t.category}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-strong)', margin: 0, fontWeight: 500, lineHeight: 1.3 }}>
                  {t.title}
                </p>
                {t.subtitle && (
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '2px 0 0', lineHeight: 1.3 }}>
                    {t.subtitle}
                  </p>
                )}
              </div>
            </div>
            <button style={actionBtnStyle()}>{t.action}</button>
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
  if (type === 'air') return <Wind size={size} />;
  return <Circle size={size} />;
}

function AssignedDevices() {
  return (
    <Widget title="Assigned Devices">
      <div style={{ display: 'flex', gap: 10 }}>
        {DEVICES.map((d) => (
          <div
            key={d.id}
            style={{
              flex: 1, minWidth: 0,
              border: '1px solid var(--border)',
              borderRadius: 10,
              backgroundColor: 'var(--base)',
              padding: '12px 14px',
              display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 12,
            }}
          >
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: `2.5px solid ${d.ring}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-strong)',
                }}
              >
                <DeviceIcon type={d.icon} />
              </div>
              {d.warning && (
                <span style={{ position: 'absolute', bottom: -2, right: -2, backgroundColor: 'var(--overlay)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>
                  <AlertTriangle size={10} style={{ color: '#f59e0b' }} />
                </span>
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-strong)', margin: 0, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</p>
              <p style={{ fontSize: 10, color: 'var(--muted-foreground)', margin: '1px 0 3px', lineHeight: 1.3 }}>{d.id}</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: d.pctColor, margin: 0, lineHeight: 1.2 }}>{d.pct}% <span style={{ fontWeight: 400, fontSize: 10, color: 'var(--muted-foreground)' }}>{d.status}</span></p>
            </div>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {PERF_METRICS.map((m) => (
          <div key={m.label}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: 'var(--text-strong)' }}>{m.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <TrendIcon trend={m.trend} color={m.color} />
                <span style={{ fontSize: 15, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}%</span>
              </div>
            </div>
            <div style={{ height: 5, borderRadius: 99, backgroundColor: 'var(--fill-weak)', overflow: 'hidden', position: 'relative' }}>
              <div style={{ height: '100%', width: `${m.value}%`, backgroundColor: m.color, borderRadius: 99 }} />
            </div>
            <div style={{ textAlign: 'right', marginTop: 2 }}>
              <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>Target: {m.target}%</span>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 6px', fontWeight: 500 }}>Last Audit</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} style={{ color: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 500 }}>Compliant — no issues</span>
          </div>
          <p style={{ fontSize: 11, color: 'var(--muted-foreground)', margin: '2px 0 0 20px' }}>Mar 8</p>
        </div>
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
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Title', 'Incident', 'Status', 'Source', 'Due', 'Action'].map(h => (
                <th key={h} style={{ textAlign: h === 'Action' ? 'right' : 'left', padding: '0 10px 10px', fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REPORTS.map((r, i) => (
              <tr key={r.incident} style={{ borderBottom: i < REPORTS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '12px 10px', color: 'var(--text-strong)', fontWeight: 400 }}>{r.title}</td>
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
                <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                  <button style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-key)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
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

// ── Recent Incidents & Evidence ───────────────────────────────────────────────

type IncidentStatus = 'Uncategorized evidence' | 'Report returned' | 'Complete';

const INCIDENTS: {
  id: string;
  date: string;
  type: string;
  evidence: string;
  report: string;
  status: IncidentStatus;
}[] = [
  { id: '#6215', date: 'Mar 13', type: 'DUI', evidence: '3 items', report: 'Draft', status: 'Uncategorized evidence' },
  { id: '#6201', date: 'Mar 12', type: 'Domestic', evidence: '2 items', report: 'Returned', status: 'Report returned' },
  { id: '#6198', date: 'Mar 11', type: 'Suspicious Activity', evidence: '1 items', report: 'Submitted', status: 'Complete' },
  { id: '#6192', date: 'Mar 10', type: 'Traffic Stop', evidence: '2 items', report: 'Approved', status: 'Complete' },
];

function incidentStatusEl(s: IncidentStatus) {
  if (s === 'Complete') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#4ade80', fontSize: 12 }}>
      <CheckCircle2 size={13} /> Complete
    </span>
  );
  if (s === 'Report returned') return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#f87171', fontSize: 12 }}>
      <XCircle size={13} /> Report returned
    </span>
  );
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#fbbf24', fontSize: 12 }}>
      <AlertTriangle size={13} /> Uncategorized evidence
    </span>
  );
}

function RecentIncidents() {
  return (
    <Widget title="Recent Incidents & Evidence">
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Incident', 'Date', 'Type', 'Evidence', 'Report', 'Status'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '0 10px 10px', fontSize: 12, fontWeight: 500, color: 'var(--muted-foreground)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INCIDENTS.map((inc, i) => (
              <tr key={inc.id} style={{ borderBottom: i < INCIDENTS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <td style={{ padding: '12px 10px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-strong)', fontWeight: 500 }}>
                    <ChevronDown size={13} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                    {inc.id}
                  </span>
                </td>
                <td style={{ padding: '12px 10px', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{inc.date}</td>
                <td style={{ padding: '12px 10px', color: 'var(--text-strong)' }}>{inc.type}</td>
                <td style={{ padding: '12px 10px', color: 'var(--muted-foreground)' }}>{inc.evidence}</td>
                <td style={{ padding: '12px 10px', color: 'var(--muted-foreground)' }}>{inc.report}</td>
                <td style={{ padding: '12px 10px' }}>{incidentStatusEl(inc.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Widget>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HomePage({ onSearch }: { onSearch: (q: string) => void }) {
  return (
    <div
      style={{
        minHeight: '100%',
        background: 'var(--base)',
        padding: '48px 40px 48px',
      }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Greeting */}
        <h1 style={{ fontSize: 32, fontWeight: 400, color: 'var(--text-strong)', margin: 0, letterSpacing: '-0.01em', display: 'flex', alignItems: 'baseline', gap: '0.35em', flexWrap: 'nowrap' }}>
          Ask Assistant to
          <AnimatedSubtitle />
        </h1>

        {/* Chat / Search */}
        <HomeSearch onSearch={onSearch} />

        {/* Bento grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: 12, alignItems: 'start' }}>
          {/* Row 1: Tasks + Performance */}
          <MyTasks />
          <MyPerformance />

          {/* Row 2: Devices — full width */}
          <div style={{ gridColumn: 'span 2' }}>
            <AssignedDevices />
          </div>

          {/* Row 3: Reports — full width */}
          <div style={{ gridColumn: 'span 2' }}>
            <MyReports />
          </div>

          {/* Row 4: Recent Incidents — full width */}
          <div style={{ gridColumn: 'span 2' }}>
            <RecentIncidents />
          </div>
        </div>

      </div>
    </div>
  );
}
