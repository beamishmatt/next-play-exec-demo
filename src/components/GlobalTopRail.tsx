import React from 'react';
import { SearchDropdown } from './SearchDropdown';

interface GlobalTopRailProps {
  onOpenSearch: (query: string, selectedId?: string, output?: import('../data/types').SearchOutput) => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

export function GlobalTopRail({ onOpenSearch, searchInputRef }: GlobalTopRailProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const localInputRef = React.useRef<HTMLInputElement>(null);
  const effectiveInputRef = searchInputRef ?? localInputRef;
  return (
    <div
      className="shrink-0 flex items-center px-4 gap-4"
      style={{
        height: 64,
        backgroundColor: 'var(--sidebar)',
        borderBottom: '1px solid var(--sidebar-border)',
        zIndex: 50,
      }}
    >
      <div style={{ width: 220 }} />

      {/* Center: search */}
      <div className="flex-1 flex justify-center">
        <div style={{ width: 560 }}>
          <SearchDropdown
            inputRef={effectiveInputRef}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onClose={() => {}}
            onOpenSearch={onOpenSearch}
          />
        </div>
      </div>

      <div style={{ width: 220 }} />
    </div>
  );
}
