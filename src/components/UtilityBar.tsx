import React from 'react';
import { useTheme } from './ThemeProvider';
import { ArrowLeft, PanelLeft, Menu } from 'lucide-react';

import { useIsMobile } from './ui/use-mobile';
import svgPaths from '../imports/svg-d29d82xyuv';

interface UtilityBarProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  showSidebarToggle?: boolean;
  sidebarVisible?: boolean;
  onSidebarToggle?: () => void;
  actions?: React.ReactNode;
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center justify-center p-2 transition-all cursor-pointer rounded-sm"
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'var(--fill-hover)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      title="Go back"
    >
      <ArrowLeft size={20} style={{ color: 'var(--foreground)' }} />
    </button>
  );
}

function SidebarToggle({ sidebarVisible, onSidebarToggle }: { sidebarVisible: boolean; onSidebarToggle: () => void }) {
  const isMobile = useIsMobile();
  
  return (
    <button
      onClick={onSidebarToggle}
      className="flex items-center justify-center p-2 hover:opacity-70 transition-opacity cursor-pointer"
      title={isMobile ? "Toggle menu" : (sidebarVisible ? "Hide sidebar" : "Show sidebar")}
    >
      {isMobile ? (
        <Menu 
          size={20} 
          style={{ 
            color: 'var(--foreground)'
          }} 
        />
      ) : (
        <PanelLeft 
          size={20} 
          style={{ 
            color: 'var(--foreground)',
            opacity: sidebarVisible ? 1 : 0.6 
          }} 
        />
      )}
    </button>
  );
}

function LeftSection({ 
  title, 
  showBackButton, 
  onBack, 
  showSidebarToggle, 
  sidebarVisible, 
  onSidebarToggle 
}: { 
  title: string; 
  showBackButton?: boolean; 
  onBack?: () => void;
  showSidebarToggle?: boolean;
  sidebarVisible?: boolean;
  onSidebarToggle?: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5 h-full px-2" data-name="left section">
      {showSidebarToggle && onSidebarToggle && (
        <SidebarToggle sidebarVisible={sidebarVisible || false} onSidebarToggle={onSidebarToggle} />
      )}
      {showBackButton && onBack && <BackButton onBack={onBack} />}
      <div 
        className="flex flex-col justify-center"
      >
        <h3 className="truncate max-w-48 sm:max-w-none">{title}</h3>
      </div>
    </div>
  );
}

function QuestionFill() {
  return (
    <div className="relative shrink-0 size-6 cursor-pointer hover:opacity-70 transition-opacity" data-name="question-fill">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="question-fill">
          <path d={svgPaths.p36268b00} fill="var(--foreground)" fillOpacity="0.8" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function MailFill() {
  return (
    <div className="relative shrink-0 size-6 cursor-pointer hover:opacity-70 transition-opacity" data-name="mail-fill">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
        <g id="mail-fill">
          <path d={svgPaths.p19c51c70} fill="var(--foreground)" fillOpacity="0.8" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Theme() {
  const { theme, toggleTheme } = useTheme();
  
  return (
    <div 
      className="relative shrink-0 size-5 cursor-pointer hover:opacity-70 transition-opacity" 
      data-name="theme"
      onClick={toggleTheme}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20 20">
        <g id="theme">
          <path d={svgPaths.p2f5b3800} fill="var(--foreground)" fillOpacity="0.8" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function Button2() {
  return (
    <div className="flex" data-name="button">
      <Theme />
    </div>
  );
}

function ButtonIconMode() {
  return (
    <div className="flex" data-name="Button - IconMode">
      <Button2 />
    </div>
  );
}

function UtilityIcons() {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex gap-4 items-center" data-name="utility-icons">
      {!isMobile && <QuestionFill />}
      {!isMobile && <MailFill />}
      <ButtonIconMode />
    </div>
  );
}

function RightSection() {
  return (
    <div className="flex" data-name="right section">
      <UtilityIcons />
    </div>
  );
}

export function UtilityBar({
  title,
  showBackButton,
  onBack,
  showSidebarToggle,
  sidebarVisible,
  onSidebarToggle,
  actions,
}: UtilityBarProps) {
  return (
    <div
      className="relative size-full"
      data-name="utility"
      style={{ backgroundColor: 'var(--raised)' }}
    >
      <div className="flex flex-row items-center min-w-inherit relative size-full">
        <div className="box-border content-stretch flex items-center justify-between min-w-inherit px-6 py-0 relative size-full">
          <LeftSection
            title={title}
            showBackButton={showBackButton}
            onBack={onBack}
            showSidebarToggle={showSidebarToggle}
            sidebarVisible={sidebarVisible}
            onSidebarToggle={onSidebarToggle}
          />
          <div className="flex items-center gap-4">
            {actions}
            <RightSection />
          </div>
        </div>
      </div>
      <div 
        aria-hidden="true" 
        className="absolute border-[0px_0px_1px] border-solid inset-0 pointer-events-none" 
        style={{ borderColor: 'var(--border)' }}
      />
    </div>
  );
}