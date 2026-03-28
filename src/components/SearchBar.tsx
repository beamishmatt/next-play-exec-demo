import React from 'react';
import { Input } from './ui/input';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SearchBar({ 
  placeholder = "", 
  value, 
  onChange, 
  className = "" 
}: SearchBarProps) {
  const handleClear = () => {
    onChange('');
  };

  const hasValue = value.length > 0;

  return (
    <div className={`relative ${className}`}>
      <Search 
        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" 
        size={16} 
      />
      
      {hasValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
      
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`pl-10 border-border ${hasValue ? 'pr-10' : 'pr-3'}`}
        style={{
          borderColor: 'var(--border-strong)'
        }}
      />
    </div>
  );
}