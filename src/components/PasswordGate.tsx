import React, { useState, useEffect } from 'react';
import { useTheme } from './ThemeProvider';

const SESSION_KEY = 'app_authenticated';
const CORRECT = 'AiMFar!';

export function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(false), 1200);
      return () => clearTimeout(t);
    }
  }, [error]);

  if (authed) return <>{children}</>;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (value === CORRECT) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setAuthed(true);
    } else {
      setError(true);
      setValue('');
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--background)',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          width: 320,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>
          Enter password
        </div>
        <input
          autoFocus
          type="password"
          value={value}
          onChange={e => { setValue(e.target.value); setError(false); }}
          placeholder="Password"
          style={{
            width: '100%',
            height: 42,
            padding: '0 14px',
            border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
            borderRadius: 8,
            backgroundColor: 'var(--raised)',
            color: 'var(--foreground)',
            fontSize: 14,
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
        />
        {error && (
          <div style={{ fontSize: 13, color: '#ef4444', marginTop: -8 }}>
            Incorrect password
          </div>
        )}
        <button
          type="submit"
          style={{
            width: '100%',
            height: 42,
            borderRadius: 8,
            border: 'none',
            backgroundColor: '#111111',
            color: '#ffffff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Continue
        </button>
      </form>
    </div>
  );
}
