import React, { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';

interface UploadZoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadZone({ onFiles, disabled = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handle = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onFiles(Array.from(files));
  };

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handle(e.dataTransfer.files);
      }}
      style={{
        border: `2px dashed ${dragging ? 'var(--fill-key-strong)' : 'var(--border)'}`,
        borderRadius: 8,
        padding: '40px 24px',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        backgroundColor: dragging ? 'var(--fill-key-weak)' : 'var(--raised)',
        transition: 'all 0.15s ease',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <UploadCloud size={32} style={{ color: 'var(--text-weak)', margin: '0 auto 12px' }} />
      <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-strong)', marginBottom: 4 }}>
        Drop files here or click to upload
      </p>
      <p style={{ fontSize: 12, color: 'var(--text-weak)' }}>
        Video, images, PDFs, documents, audio
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={e => handle(e.target.files)}
        accept="video/*,image/*,audio/*,.pdf,.doc,.docx,.txt,.csv,.json"
      />
    </div>
  );
}
