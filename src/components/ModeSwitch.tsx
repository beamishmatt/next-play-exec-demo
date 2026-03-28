import React from 'react';

interface ModeSwitchProps {
  isCollapsed: boolean;
  onClick: () => void;
}

function ModeGlyph({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className="flex gap-1 items-center justify-start relative shrink-0">
      {/* 1st Dot - larger when expanded, smaller when collapsed */}
      <div className="flex items-center justify-center relative shrink-0">
        <div 
          className="rounded-full transition-all duration-300 ease-in-out"
          style={{
            backgroundColor: 'var(--sidebar-accent)',
            width: isCollapsed ? '6px' : '14px',
            height: isCollapsed ? '6px' : '8px',
          }}
        />
      </div>
      
      {/* 2nd Dot - smaller when expanded, larger when collapsed */}
      <div className="flex items-center justify-center relative shrink-0">
        <div 
          className="rounded-full transition-all duration-300 ease-in-out"
          style={{
            backgroundColor: 'var(--muted-foreground)',
            width: isCollapsed ? '14px' : '6px',
            height: isCollapsed ? '8px' : '6px',
          }}
        />
      </div>
    </div>
  );
}

export function ModeSwitch({ isCollapsed, onClick }: ModeSwitchProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-start transition-all duration-200"
      style={{
        borderRadius: 'var(--radius)',
        backgroundColor: 'transparent',
        cursor: 'pointer',
        padding: '8px',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--muted)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <ModeGlyph isCollapsed={isCollapsed} />
    </button>
  );
}