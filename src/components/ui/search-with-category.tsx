import * as React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type EvidenceCategory = 'all' | 'video' | 'image' | 'audio' | 'document' | 'pdf';

interface SearchWithCategoryProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  category: EvidenceCategory;
  onCategoryChange: (value: EvidenceCategory) => void;
  isLoading?: boolean;
  disabled?: boolean;
  inputRef?: React.RefObject<HTMLInputElement>;
}

export function SearchWithCategory({
  value,
  onChange,
  onSearch,
  category,
  onCategoryChange,
  isLoading = false,
  disabled = false,
  inputRef,
}: SearchWithCategoryProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') onSearch();
  };

  return (
    <div className="flex rounded-md shadow-sm w-full">
      <Select value={category} onValueChange={v => onCategoryChange(v as EvidenceCategory)}>
        <SelectTrigger
          className="rounded-e-none border-r-0 text-sm focus:z-10"
          style={{ width: 120, height: 44, flexShrink: 0, borderColor: 'var(--border)' }}
        >
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          <SelectItem value="video">Video</SelectItem>
          <SelectItem value="image">Image</SelectItem>
          <SelectItem value="audio">Audio</SelectItem>
          <SelectItem value="document">Document</SelectItem>
          <SelectItem value="pdf">PDF</SelectItem>
        </SelectContent>
      </Select>

      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe what you want to find..."
        disabled={disabled}
        className="rounded-none text-sm focus-visible:z-10 shadow-none"
        style={{ height: 44, borderColor: 'var(--border)' }}
      />

      <Button
        type="submit"
        onClick={onSearch}
        disabled={disabled || !value.trim()}
        className="rounded-s-none rounded-e-md"
        variant="secondary"
        style={{ height: 44, paddingLeft: 16, paddingRight: 16, flexShrink: 0 }}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
