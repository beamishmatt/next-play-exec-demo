import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

type PromptInputContextType = {
  isLoading: boolean;
  value: string;
  setValue: (value: string) => void;
  maxHeight: number | string;
  onSubmit?: () => void;
  disabled?: boolean;
};

const PromptInputContext = createContext<PromptInputContextType>({
  isLoading: false,
  value: '',
  setValue: () => {},
  maxHeight: 240,
  onSubmit: undefined,
  disabled: false,
});

function usePromptInput() {
  const context = useContext(PromptInputContext);
  if (!context) {
    throw new Error('usePromptInput must be used within a PromptInput');
  }
  return context;
}

type PromptInputProps = {
  isLoading?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  maxHeight?: number | string;
  onSubmit?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

function PromptInput({
  style,
  isLoading = false,
  maxHeight = 240,
  value,
  onValueChange,
  onSubmit,
  children,
}: PromptInputProps) {
  const [internalValue, setInternalValue] = useState(value || '');

  const handleChange = (newValue: string) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
  };

  return (
    <PromptInputContext.Provider
      value={{
        isLoading,
        value: value ?? internalValue,
        setValue: onValueChange ?? handleChange,
        maxHeight,
        onSubmit,
      }}
    >
      <div
        style={{
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--overlay)',
          borderRadius: '12px',
          padding: '8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          ...style,
        }}
      >
        {children}
      </div>
    </PromptInputContext.Provider>
  );
}

type PromptInputTextareaProps = {
  placeholder?: string;
  disableAutosize?: boolean;
  style?: React.CSSProperties;
};

function PromptInputTextarea({
  placeholder,
  disableAutosize = false,
  style,
}: PromptInputTextareaProps) {
  const { value, setValue, maxHeight, onSubmit, disabled } = usePromptInput();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (disableAutosize) return;
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height =
      typeof maxHeight === 'number'
        ? `${Math.min(textareaRef.current.scrollHeight, maxHeight)}px`
        : `min(${textareaRef.current.scrollHeight}px, ${maxHeight})`;
  }, [value, maxHeight, disableAutosize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={e => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={1}
      disabled={disabled}
      style={{
        width: '100%',
        resize: 'none',
        border: 'none',
        outline: 'none',
        backgroundColor: 'transparent',
        fontSize: 'var(--text-caption)',
        color: 'var(--foreground)',
        fontFamily: 'inherit',
        lineHeight: '1.5',
        minHeight: '36px',
        padding: '4px 4px',
        boxShadow: 'none',
        ...style,
      }}
    />
  );
}

type PromptInputActionsProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

function PromptInputActions({ children, style }: PromptInputActionsProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export { PromptInput, PromptInputTextarea, PromptInputActions, usePromptInput };
