import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface FeedbackDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuery?: string;
}

export function FeedbackDrawer({ isOpen, onClose, currentQuery }: FeedbackDrawerProps) {
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');

  const handleSubmit = async () => {
    if (!text.trim() || status !== 'idle') return;
    setStatus('submitting');

    const entry = {
      id: Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      name: name.trim() || undefined,
      feedback: text.trim(),
      ...(currentQuery ? { query: currentQuery } : {}),
    };

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch {
      // non-fatal — feedback is best-effort in the prototype
    }

    setStatus('done');
  };

  const handleClose = () => {
    onClose();
    // Reset after close animation
    setTimeout(() => {
      setName('');
      setText('');
      setStatus('idle');
    }, 300);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={handleClose}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 200 }}
        />
      )}

      {/* Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 400,
          backgroundColor: 'var(--base)',
          borderLeft: '1px solid var(--border)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 300ms cubic-bezier(0, 0.74, 0, 1)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>Share feedback</span>
          <button
            onClick={handleClose}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: 'none', backgroundColor: 'transparent', color: 'var(--muted-foreground)', cursor: 'pointer' }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
          {status === 'done' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--muted-foreground)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--fill-weak)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Check size={16} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)', margin: 0 }}>Thanks for the feedback</p>
              <p style={{ fontSize: 12, color: 'var(--muted-foreground)', margin: 0, textAlign: 'center' }}>Saved to <code style={{ fontFamily: 'monospace', fontSize: 11, backgroundColor: 'var(--fill-weak)', padding: '1px 4px', borderRadius: 3 }}>src/data/feedback.json</code></p>
            </div>
          ) : (
            <>
              {/* Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    color: 'var(--foreground)',
                    outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--fill-strong)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>

              {/* Text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--muted-foreground)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Feedback</label>
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  placeholder="Describe what you found, what's missing, or what could work better..."
                  style={{
                    height: 90,
                    resize: 'vertical',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    lineHeight: 1.65,
                    color: 'var(--foreground)',
                    outline: 'none',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--fill-strong)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>

            </>
          )}
        </div>

        {/* Footer */}
        {status !== 'done' && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || status === 'submitting'}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: !text.trim() || status === 'submitting' ? 'var(--fill-weak)' : 'var(--fill-strong)',
                color: !text.trim() || status === 'submitting' ? 'var(--muted-foreground)' : 'var(--text-inverse-strong)',
                fontSize: 13,
                fontWeight: 500,
                cursor: !text.trim() || status === 'submitting' ? 'default' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background-color 120ms, color 120ms',
              }}
            >
              {status === 'submitting' ? 'Saving…' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
