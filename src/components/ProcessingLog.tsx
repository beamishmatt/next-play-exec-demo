import React, { useEffect, useRef } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export interface LogEntry {
  fileIndex: number;
  fileName: string;
  messages: string[];
  status: 'pending' | 'processing' | 'done' | 'error';
}

interface ProcessingLogProps {
  entries: LogEntry[];
}

export function ProcessingLog({ entries }: ProcessingLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: 'var(--raised)',
    }}>
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-weak)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Processing log
      </div>
      <div style={{ maxHeight: 280, overflowY: 'auto', padding: '8px 0' }}>
        {entries.map(entry => (
          <div key={entry.fileIndex} style={{ padding: '6px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              {entry.status === 'processing' && <Loader2 size={13} style={{ color: 'var(--text-key)', flexShrink: 0 }} className="animate-spin" />}
              {entry.status === 'done'       && <CheckCircle size={13} style={{ color: 'var(--fill-success-strong)', flexShrink: 0 }} />}
              {entry.status === 'error'      && <XCircle size={13} style={{ color: 'var(--fill-error-strong)', flexShrink: 0 }} />}
              {entry.status === 'pending'    && <div style={{ width: 13, height: 13, borderRadius: '50%', backgroundColor: 'var(--border)', flexShrink: 0 }} />}
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {entry.fileName}
              </span>
            </div>
            {entry.messages.length > 0 && (
              <div style={{ paddingLeft: 21 }}>
                {entry.messages.map((msg, i) => (
                  <p key={i} style={{ fontSize: 11, color: 'var(--text-weak)', lineHeight: 1.6 }}>{msg}</p>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
