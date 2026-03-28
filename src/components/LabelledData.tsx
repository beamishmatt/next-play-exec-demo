import React from 'react';

type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label';

interface LabelledDataProps {
  label: string;
  value: string | React.ReactNode;
  variant?: 'horizontal' | 'vertical';
  dataVariant?: TextVariant;
  dataColor?: string;
  className?: string;
}

export function LabelledData({
  label,
  value,
  variant = 'vertical',
  dataVariant = 'body',
  dataColor,
  className = ''
}: LabelledDataProps) {
  const getTextVariantSize = (variant: TextVariant): string => {
    const variantMap: Record<TextVariant, string> = {
      h1: 'var(--text-h1)',
      h2: 'var(--text-h2)',
      h3: 'var(--text-h3)',
      body: 'var(--text-body)',
      caption: 'var(--text-caption)',
      label: 'var(--text-label)'
    };
    return variantMap[variant] || 'var(--text-body)';
  };

  const containerClasses = variant === 'horizontal' 
    ? 'flex items-center gap-2' 
    : 'flex flex-col gap-1';

  return (
    <div className={`${containerClasses} ${className}`}>
      {/* Label */}
      <div
        style={{
          fontSize: 'var(--text-label)',
          fontWeight: 'var(--font-weight-regular)',
          fontFamily: "'IBM Plex Sans', sans-serif",
          color: 'var(--muted-foreground)'
        }}
      >
        {label}
      </div>

      {/* Data Value */}
      <div
        style={{
          fontSize: getTextVariantSize(dataVariant),
          fontWeight: 'var(--font-weight-regular)',
          fontFamily: "'IBM Plex Sans', sans-serif",
          color: dataColor || 'var(--text-strong)'
        }}
      >
        {value}
      </div>
    </div>
  );
}