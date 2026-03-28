import React, { useState } from 'react';
import { UploadZone } from '../UploadZone';
import { ProcessingLog, LogEntry } from '../ProcessingLog';
import { ingestFiles } from '../../ingestion/pipeline';
import { getOpenAIKey } from '../../utils/openaiClient';

export function UploadPage() {
  const [caseId, setCaseId]     = useState('');
  const [officer, setOfficer]   = useState('');
  const [category, setCategory] = useState('Police Event');
  const [source, setSource]     = useState('');
  const [entries, setEntries]   = useState<LogEntry[]>([]);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);

  const hasKey = !!getOpenAIKey();

  const handleFiles = async (files: File[]) => {
    if (!caseId.trim() || !officer.trim()) {
      alert('Please enter a Case ID and Officer before uploading.');
      return;
    }

    const initial: LogEntry[] = files.map((f, i) => ({
      fileIndex: i,
      fileName: f.name,
      messages: [],
      status: 'pending',
    }));
    setEntries(initial);
    setRunning(true);
    setDone(false);

    const updateEntry = (i: number, patch: Partial<LogEntry>) => {
      setEntries(prev => prev.map(e => e.fileIndex === i ? { ...e, ...patch } : e));
    };

    // Mark first as processing
    updateEntry(0, { status: 'processing' });

    try {
      await ingestFiles(
        files,
        { caseId: caseId.trim(), officer: officer.trim(), category, source: source.trim() || undefined },
        (fileIndex, message) => {
          updateEntry(fileIndex, { status: 'processing' });
          setEntries(prev => prev.map(e =>
            e.fileIndex === fileIndex
              ? { ...e, messages: [...e.messages, message], status: message.startsWith('✓') ? 'done' : message.startsWith('✗') ? 'error' : 'processing' }
              : e
          ));
          // Mark next file as processing
          if (message.startsWith('✓') || message.startsWith('✗')) {
            setEntries(prev => prev.map(e =>
              e.fileIndex === fileIndex + 1 ? { ...e, status: 'processing' } : e
            ));
          }
        }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setEntries(prev => prev.map(e => e.status === 'pending' || e.status === 'processing'
        ? { ...e, status: 'error', messages: [...e.messages, `✗ ${msg}`] }
        : e
      ));
    } finally {
      setRunning(false);
      setDone(true);
    }
  };

  const categories = ['Assault', 'Traffic Stop', 'Homicide', 'Theft', 'Shooting', 'Domestic', 'Drug Offense', 'Burglary', 'Police Event', 'Non Event', 'Other'];

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
      <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-high-contrast)', marginBottom: 4 }}>
        Import Evidence
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-weak)', marginBottom: 32 }}>
        Upload files to ingest them into the evidence graph and vector store.
      </p>

      {!hasKey && (
        <div style={{ padding: '12px 16px', backgroundColor: 'var(--fill-warning-strong)', borderRadius: 6, marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>
            No OpenAI API key detected. Add <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: 3 }}>VITE_OPENAI_API_KEY</code> to your <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: 3 }}>.env</code> file and restart the dev server.
          </p>
        </div>
      )}

      {/* Metadata form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Field label="Case ID *" value={caseId} onChange={setCaseId} placeholder="e.g. 2025-08-001" />
        <Field label="Officer *" value={officer} onChange={setOfficer} placeholder="e.g. Serrano, Miguel 123" />
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-weak)', display: 'block', marginBottom: 6 }}>Category</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border)', backgroundColor: 'var(--overlay)', fontSize: 13, color: 'var(--text-strong)' }}
          >
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <Field label="Source" value={source} onChange={setSource} placeholder="e.g. Axon Body 3" />
      </div>

      <UploadZone onFiles={handleFiles} disabled={running || !hasKey} />

      {entries.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <ProcessingLog entries={entries} />
          {done && (
            <p style={{ marginTop: 12, fontSize: 13, color: 'var(--fill-success-strong)', fontWeight: 500 }}>
              ✓ Ingestion complete — evidence is now searchable.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-weak)', display: 'block', marginBottom: 6 }}>{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width: '100%', height: 36, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border)', backgroundColor: 'var(--overlay)', fontSize: 13, color: 'var(--text-strong)', boxSizing: 'border-box' }}
      />
    </div>
  );
}
