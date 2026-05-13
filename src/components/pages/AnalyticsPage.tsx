import React, { useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts@2.15.2';
import { FileText, Video, Image, File, TrendingUp, TrendingDown, FolderOpen, HardDrive, Shield } from 'lucide-react';

// ─── Mock data ────────────────────────────────────────────────────────────────

const ingestionByMonth = [
  { month: 'May',  evidence: 18, cases: 3 },
  { month: 'Jun',  evidence: 24, cases: 4 },
  { month: 'Jul',  evidence: 19, cases: 3 },
  { month: 'Aug',  evidence: 31, cases: 5 },
  { month: 'Sep',  evidence: 27, cases: 4 },
  { month: 'Oct',  evidence: 42, cases: 7 },
  { month: 'Nov',  evidence: 38, cases: 6 },
  { month: 'Dec',  evidence: 29, cases: 4 },
  { month: 'Jan',  evidence: 35, cases: 5 },
  { month: 'Feb',  evidence: 51, cases: 8 },
  { month: 'Mar',  evidence: 46, cases: 7 },
  { month: 'Apr',  evidence: 58, cases: 9 },
];

const evidenceByType = [
  { name: 'Video',    value: 142, color: '#3b82f6' },
  { name: 'PDF',      value: 89,  color: '#8b5cf6' },
  { name: 'Image',    value: 76,  color: '#10b981' },
  { name: 'Audio',    value: 31,  color: '#f59e0b' },
  { name: 'Document', value: 24,  color: '#64748b' },
];

const evidenceByCategory = [
  { category: 'Homicide',      count: 58 },
  { category: 'Assault',       count: 94 },
  { category: 'Traffic Stop',  count: 121 },
  { category: 'Theft',         count: 73 },
  { category: 'Shooting',      count: 41 },
  { category: 'Domestic',      count: 62 },
  { category: 'Drug Offense',  count: 38 },
  { category: 'Police Event',  count: 29 },
].sort((a, b) => b.count - a.count);

const officerActivity = [
  { officer: 'Thibodaux, M.',  uploads: 87, cases: 12 },
  { officer: 'Martin, J.',     uploads: 74, cases: 10 },
  { officer: 'Washington, D.', uploads: 61, cases: 8  },
  { officer: 'O\'Brien, S.',   uploads: 55, cases: 7  },
  { officer: 'Reyes, C.',      uploads: 48, cases: 6  },
  { officer: 'Chen, A.',       uploads: 43, cases: 6  },
];

const casesByStatus = [
  { name: 'Active',    value: 34, color: '#10b981' },
  { name: 'Closed',    value: 58, color: '#64748b' },
  { name: 'Dismissed', value: 12, color: '#f59e0b' },
];

const storageByType = [
  { type: 'Video',    gb: 218, color: '#3b82f6' },
  { type: 'Image',    gb: 42,  color: '#10b981' },
  { type: 'PDF',      gb: 8,   color: '#8b5cf6' },
  { type: 'Audio',    gb: 24,  color: '#f59e0b' },
  { type: 'Other',    gb: 8,   color: '#64748b' },
];

const recentCases = [
  { id: 'PBPD-2025-088142', category: 'Homicide',     officer: 'Thibodaux, M.', evidence: 15, status: 'Active',  updated: 'Apr 1, 2026' },
  { id: 'PBPD-2026-001204', category: 'Assault',      officer: 'Martin, J.',    evidence: 8,  status: 'Active',  updated: 'Mar 29, 2026' },
  { id: 'PBPD-2026-000891', category: 'Traffic Stop', officer: 'Reyes, C.',     evidence: 3,  status: 'Closed',  updated: 'Mar 22, 2026' },
  { id: 'PBPD-2025-079341', category: 'Theft',        officer: 'O\'Brien, S.',  evidence: 11, status: 'Closed',  updated: 'Mar 18, 2026' },
  { id: 'PBPD-2026-000744', category: 'Domestic',     officer: 'Chen, A.',      evidence: 6,  status: 'Active',  updated: 'Mar 15, 2026' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--raised)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  padding: '20px 24px',
};

function StatCard({ label, value, sub, trend, icon }: {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; up: boolean };
  icon: React.ReactNode;
}) {
  return (
    <div style={{ ...CARD_STYLE, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-weak)', fontFamily: "'IBM Plex Sans', sans-serif", textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ color: 'var(--text-weak)' }}>{icon}</span>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--foreground)', fontFamily: "'IBM Plex Sans', sans-serif", lineHeight: 1 }}>{value}</div>
        {(sub || trend) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            {trend && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 600, color: trend.up ? '#10b981' : '#ef4444', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                {trend.up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {trend.value}
              </span>
            )}
            {sub && <span style={{ fontSize: 12, color: 'var(--text-weak)', fontFamily: "'IBM Plex Sans', sans-serif" }}>{sub}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--foreground)', margin: 0, fontFamily: "'IBM Plex Sans', sans-serif" }}>{title}</h3>
      {sub && <p style={{ fontSize: 12, color: 'var(--text-weak)', margin: '3px 0 0', fontFamily: "'IBM Plex Sans', sans-serif" }}>{sub}</p>}
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--raised)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  fontSize: 12,
  fontFamily: "'IBM Plex Sans', sans-serif",
  color: 'var(--foreground)',
};

// ─── Date range picker (decorative) ──────────────────────────────────────────

const RANGES = ['Last 7 days', 'Last 30 days', 'Last 90 days', 'Last 12 months', 'All time'];

function RangePicker() {
  const [active, setActive] = useState('Last 12 months');
  return (
    <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--fill-weak)', borderRadius: 7, padding: 3 }}>
      {RANGES.map(r => (
        <button
          key={r}
          onClick={() => setActive(r)}
          style={{
            padding: '4px 10px',
            borderRadius: 5,
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: active === r ? 600 : 400,
            fontFamily: "'IBM Plex Sans', sans-serif",
            backgroundColor: active === r ? 'var(--raised)' : 'transparent',
            color: active === r ? 'var(--foreground)' : 'var(--text-weak)',
            boxShadow: active === r ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            transition: 'all 0.15s',
          }}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontWeight: 600, fontSize: 12 }}>{label}</div>
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: p.color, flexShrink: 0, display: 'inline-block' }} />
            <span style={{ color: 'var(--text-weak)' }}>{p.name}:</span>
            <span style={{ fontWeight: 600 }}>{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Donut label ─────────────────────────────────────────────────────────────

function DonutLabel({ viewBox, total }: { viewBox?: any; total: number }) {
  const { cx, cy } = viewBox ?? {};
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-6" style={{ fontSize: 22, fontWeight: 700, fill: 'var(--foreground)', fontFamily: "'IBM Plex Sans', sans-serif" }}>{total}</tspan>
      <tspan x={cx} dy="20" style={{ fontSize: 11, fill: 'var(--text-weak)', fontFamily: "'IBM Plex Sans', sans-serif" }}>total</tspan>
    </text>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AnalyticsPage() {
  const totalEvidence = evidenceByType.reduce((s, t) => s + t.value, 0);
  const totalStorage = storageByType.reduce((s, t) => s + t.gb, 0);

  return (
    <div style={{ height: '100%', overflowY: 'auto', backgroundColor: 'var(--sunken)', padding: '24px 28px', boxSizing: 'border-box' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--foreground)', margin: 0, fontFamily: "'IBM Plex Sans', sans-serif" }}>Analytics</h1>
          <p style={{ fontSize: 13, color: 'var(--text-weak)', margin: '3px 0 0', fontFamily: "'IBM Plex Sans', sans-serif" }}>Palm Beach Police Department · Evidence Management</p>
        </div>
        <RangePicker />
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Evidence" value={totalEvidence.toLocaleString()} trend={{ value: '+12% vs last period', up: true }} icon={<FileText size={16} />} />
        <StatCard label="Active Cases" value="34" sub="of 104 total" trend={{ value: '+3 this month', up: true }} icon={<FolderOpen size={16} />} />
        <StatCard label="Storage Used" value={`${totalStorage} GB`} sub="of 2 TB allocated" trend={{ value: '+18 GB this month', up: false }} icon={<HardDrive size={16} />} />
        <StatCard label="Officers Active" value="24" sub="uploaded this month" trend={{ value: '+2 vs last month', up: true }} icon={<Shield size={16} />} />
      </div>

      {/* Row 1 — ingestion + type breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12, marginBottom: 12 }}>

        {/* Ingestion over time */}
        <div style={CARD_STYLE}>
          <SectionHeader title="Evidence Ingested Over Time" sub="New evidence items uploaded per month" />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={ingestionByMonth} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEvidence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-weak)', fontFamily: "'IBM Plex Sans', sans-serif" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-weak)', fontFamily: "'IBM Plex Sans', sans-serif" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="evidence" name="Evidence" stroke="#3b82f6" strokeWidth={2} fill="url(#gradEvidence)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Evidence by type donut */}
        <div style={CARD_STYLE}>
          <SectionHeader title="Evidence by Type" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={evidenceByType} cx="50%" cy="50%" innerRadius={44} outerRadius={64} dataKey="value" paddingAngle={2} strokeWidth={0}>
                  {evidenceByType.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  <DonutLabel total={totalEvidence} />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {evidenceByType.map(t => (
                <div key={t.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: t.color, flexShrink: 0, display: 'inline-block' }} />
                    <span style={{ fontSize: 12, color: 'var(--foreground)', fontFamily: "'IBM Plex Sans', sans-serif" }}>{t.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', fontFamily: "'IBM Plex Sans', sans-serif" }}>{t.value}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-weak)', fontFamily: "'IBM Plex Sans', sans-serif", width: 32, textAlign: 'right' }}>{Math.round(t.value / totalEvidence * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 — category + officer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Evidence by category */}
        <div style={CARD_STYLE}>
          <SectionHeader title="Evidence by Category" sub="All-time evidence count per incident type" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evidenceByCategory} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-weak)', fontFamily: "'IBM Plex Sans', sans-serif" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: 'var(--text-weak)', fontFamily: "'IBM Plex Sans', sans-serif" }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--fill-weak)' }} />
              <Bar dataKey="count" name="Evidence" fill="#3b82f6" radius={[0, 3, 3, 0]} maxBarSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Officer activity */}
        <div style={CARD_STYLE}>
          <SectionHeader title="Officer Activity" sub="Uploads and cases managed per officer" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={officerActivity} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="officer" tick={{ fontSize: 10, fill: 'var(--text-weak)', fontFamily: "'IBM Plex Sans', sans-serif" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-weak)', fontFamily: "'IBM Plex Sans', sans-serif" }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--fill-weak)' }} />
              <Bar dataKey="uploads" name="Uploads" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={18} />
              <Bar dataKey="cases" name="Cases" fill="#e2e8f0" radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3 — cases status + storage + recent cases */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 12 }}>

        {/* Cases by status */}
        <div style={CARD_STYLE}>
          <SectionHeader title="Cases by Status" />
          <ResponsiveContainer width="100%" height={130}>
            <PieChart>
              <Pie data={casesByStatus} cx="50%" cy="50%" innerRadius={36} outerRadius={54} dataKey="value" paddingAngle={2} strokeWidth={0}>
                {casesByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            {casesByStatus.map(s => (
              <div key={s.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: s.color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--foreground)', fontFamily: "'IBM Plex Sans', sans-serif" }}>{s.name}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', fontFamily: "'IBM Plex Sans', sans-serif" }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Storage breakdown */}
        <div style={CARD_STYLE}>
          <SectionHeader title="Storage Usage" sub={`${totalStorage} GB of 2,000 GB used`} />
          <div style={{ marginBottom: 14 }}>
            <div style={{ height: 8, borderRadius: 4, backgroundColor: 'var(--fill-weak)', overflow: 'hidden', display: 'flex' }}>
              {storageByType.map(s => (
                <div key={s.type} style={{ width: `${(s.gb / 2000) * 100}%`, backgroundColor: s.color, transition: 'width 0.3s' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {storageByType.map(s => (
              <div key={s.type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ fontSize: 12, color: 'var(--foreground)', fontFamily: "'IBM Plex Sans', sans-serif", flex: 1 }}>{s.type}</span>
                <div style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: 'var(--fill-weak)', overflow: 'hidden' }}>
                  <div style={{ width: `${(s.gb / totalStorage) * 100}%`, height: '100%', backgroundColor: s.color, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', fontFamily: "'IBM Plex Sans', sans-serif", width: 48, textAlign: 'right' }}>{s.gb} GB</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent cases */}
        <div style={CARD_STYLE}>
          <SectionHeader title="Recent Cases" sub="Most recently updated" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {recentCases.map((c, i) => (
              <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < recentCases.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', fontFamily: "'IBM Plex Sans', sans-serif", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.id}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-weak)', fontFamily: "'IBM Plex Sans', sans-serif", marginTop: 1 }}>
                    {c.category} · {c.officer} · {c.evidence} items
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, flexShrink: 0,
                  backgroundColor: c.status === 'Active' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                  color: c.status === 'Active' ? '#059669' : '#64748b',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
