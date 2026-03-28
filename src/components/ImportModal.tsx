import React, { useState } from 'react';
import { X } from 'lucide-react';
import { UploadZone } from './UploadZone';
import { ProcessingLog, LogEntry } from './ProcessingLog';
import { ingestFiles } from '../ingestion/pipeline';
import { getOpenAIKey } from '../utils/openaiClient';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

const categories = ['Assault', 'Traffic Stop', 'Homicide', 'Theft', 'Shooting', 'Domestic', 'Drug Offense', 'Burglary', 'Police Event', 'Non Event', 'Other'];

export function ImportModal({ open, onClose }: ImportModalProps) {
  const [caseId, setCaseId]     = useState('');
  const [officer, setOfficer]   = useState('');
  const [category, setCategory] = useState('Police Event');
  const [source, setSource]     = useState('');
  const [entries, setEntries]   = useState<LogEntry[]>([]);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);

  const hasKey = !!getOpenAIKey();

  if (!open) return null;

  const handleClose = () => {
    if (running) return;
    setCaseId('');
    setOfficer('');
    setCategory('Police Event');
    setSource('');
    setEntries([]);
    setDone(false);
    onClose();
  };

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

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          backgroundColor: 'rgba(0,0,0,0.4)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 51,
        width: '100%', maxWidth: 560,
        backgroundColor: 'var(--overlay)',
        borderRadius: 10,
        border: '1px solid var(--border)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-high-contrast)', margin: 0 }}>
              Import Evidence
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-weak)', margin: '2px 0 0' }}>
              Upload files to ingest into the evidence graph and vector store.
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={running}
            style={{
              padding: '4px 6px', borderRadius: 4,
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text-weak)',
              cursor: running ? 'not-allowed' : 'pointer',
              opacity: running ? 0.4 : 1,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px' }}>
          {!hasKey && (
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--fill-warning-strong)', borderRadius: 6, marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: '#fff', fontWeight: 500, margin: 0 }}>
                No OpenAI API key detected. Add{' '}
                <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: 3 }}>VITE_OPENAI_API_KEY</code>
                {' '}to your{' '}
                <code style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '1px 4px', borderRadius: 3 }}>.env</code>
                {' '}file and restart the dev server.
              </p>
            </div>
          )}

          {/* Metadata form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <Field label="Case ID *" value={caseId} onChange={setCaseId} placeholder="e.g. 2025-08-001" />
            <Field label="Officer *" value={officer} onChange={setOfficer} placeholder="e.g. Serrano, Miguel 123" />
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-weak)', display: 'block', marginBottom: 6 }}>Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', height: 34, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border)', backgroundColor: 'var(--base)', fontSize: 13, color: 'var(--text-strong)' }}
              >
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <Field label="Source" value={source} onChange={setSource} placeholder="e.g. Axon Body 3" />
          </div>

          <UploadZone onFiles={handleFiles} disabled={running || !hasKey} />

          {entries.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <ProcessingLog entries={entries} />
              {done && (
                <p style={{ marginTop: 10, fontSize: 13, color: 'var(--fill-success-strong)', fontWeight: 500 }}>
                  ✓ Ingestion complete — evidence is now searchable.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
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
        style={{ width: '100%', height: 34, padding: '0 10px', borderRadius: 4, border: '1px solid var(--border)', backgroundColor: 'var(--base)', fontSize: 13, color: 'var(--text-strong)', boxSizing: 'border-box' }}
      />
    </div>
  );
}
