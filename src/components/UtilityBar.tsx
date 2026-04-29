import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTheme } from './ThemeProvider';
import { ArrowLeft, PanelLeft, Menu } from 'lucide-react';
import { SearchDropdown } from './SearchDropdown';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from './ui/breadcrumb';
import { getEvidenceByCaseId } from '../data/mockEvidence';
import { getContextGraph } from '../storage/config';
import { useIsMobile } from './ui/use-mobile';
import svgPaths from '../imports/svg-d29d82xyuv';

interface Crumb { label: string; href?: string; }

function useBreadcrumbs(): Crumb[] {
  const { pathname } = useLocation();
  const segs = pathname.split('/').filter(Boolean);

  if (segs.length === 0 || segs[0] === 'home') return [{ label: 'Home' }];

  if (segs[0] === 'evidence') {
    if (segs[1] === 'item' && segs[2]) {
      const graph = getContextGraph();
      const node = graph?.nodes?.[segs[2]];
      return [
        { label: 'Evidence', href: '/evidence' },
        { label: node?.title ?? 'Evidence Detail' },
      ];
    }
    if (segs.length === 3) {
      const evidence = getEvidenceByCaseId(segs[1])[parseInt(segs[2])];
      return [
        { label: 'Evidence', href: '/evidence' },
        { label: evidence?.title ?? `Evidence ${parseInt(segs[2]) + 1}` },
      ];
    }
    return [{ label: 'Evidence' }];
  }

  if (segs[0] === 'cases') {
    if (segs.length === 1) return [{ label: 'Cases' }];
    if (segs.length === 2) return [{ label: 'Cases', href: '/cases' }, { label: segs[1] }];
    if (segs.length === 4 && segs[2] === 'evidence') {
      const evidence = getEvidenceByCaseId(segs[1])[parseInt(segs[3])];
      return [
        { label: 'Cases', href: '/cases' },
        { label: segs[1], href: `/cases/${segs[1]}` },
        { label: evidence?.title ?? `Evidence ${parseInt(segs[3]) + 1}` },
      ];
    }
  }

  if (segs[0] === 'search' && segs[1] === 'evidence' && segs[2]) {
    const graph = getContextGraph();
    const node = graph?.nodes?.[segs[2]];
    return [{ label: node?.title ?? 'Evidence Detail' }];
  }

  const label = segs[0].charAt(0).toUpperCase() + segs[0].slice(1);
  return [{ label }];
}

interface UtilityBarProps {
  title: string;
  showBackButton?: boolean;
  onBack?: () => void;
  showSidebarToggle?: boolean;
  sidebarVisible?: boolean;
  onSidebarToggle?: () => void;
  actions?: React.ReactNode;
  onOpenSearch: (query: string, selectedId?: string, output?: import('../data/types').SearchOutput) => void;
  onOpenAssistant: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement>;
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
  showBackButton,
  onBack,
  showSidebarToggle,
  sidebarVisible,
  onSidebarToggle
}: {
  showBackButton?: boolean;
  onBack?: () => void;
  showSidebarToggle?: boolean;
  sidebarVisible?: boolean;
  onSidebarToggle?: () => void;
}) {
  const crumbs = useBreadcrumbs();

  return (
    <div className="flex items-center gap-2.5 h-full px-2" data-name="left section">
      {showSidebarToggle && onSidebarToggle && (
        <SidebarToggle sidebarVisible={sidebarVisible || false} onSidebarToggle={onSidebarToggle} />
      )}
      <Breadcrumb>
        <BreadcrumbList style={{ fontSize: 15, fontWeight: 500 }}>
          {crumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.href
                  ? <BreadcrumbLink asChild><Link to={crumb.href} style={{ fontSize: 15, fontWeight: 500 }}>{crumb.label}</Link></BreadcrumbLink>
                  : <BreadcrumbPage style={{ fontSize: 15, fontWeight: 500 }}>{crumb.label}</BreadcrumbPage>
                }
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}

function AieraIcon({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative shrink-0 size-6 cursor-pointer hover:opacity-70 transition-opacity" title="Aiera" onClick={onClick}>
      <svg className="block size-full" fill="none" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
        <path d="M27.8576 36.9831C28.9701 35.0622 31.6501 34.8008 33.1102 36.4779L44.9826 50.0821C45.122 50.2534 45.0727 50.4283 45.0321 50.5143C44.9914 50.6048 44.8825 50.7539 44.6519 50.7539H39.9384L39.9332 50.7643H4.95659C4.78104 50.7635 4.73752 50.515 4.90451 50.4518L21.4175 44.4024C23.1762 43.7604 24.6568 42.5176 25.5972 40.8946L27.8576 36.9831Z" fill="url(#aiera_grad0)"/>
        <path d="M58.6675 21.431H52.0009V42.7643H58.6675V50.7643H50.6675L41.3342 33.431V21.431H34.6675V13.431H58.6675V21.431Z" fill="url(#aiera_grad1)"/>
        <path d="M20.717 17.0821C20.812 16.9193 21.0655 17.0288 21.0113 17.2097L17.9097 27.5716C17.2771 29.6827 17.5456 31.9609 18.6441 33.8685L20.993 37.9466C21.9967 39.6918 21.1928 41.9171 19.3029 42.6133L3.54253 48.4076L3.49305 48.431C3.26247 48.526 3.1043 48.4256 3.01388 48.3216C2.92369 48.2177 2.84291 48.0518 2.9644 47.8399L20.717 17.0821Z" fill="url(#aiera_grad2)"/>
        <path d="M25.0035 13.1211C25.1029 13.1121 25.2948 13.1215 25.4123 13.3295L28.1727 18.1159H28.1779L42.8134 43.4701C42.9126 43.637 42.6823 43.8008 42.5555 43.6576L33.8029 33.6237C32.2839 31.8786 30.0813 30.8789 27.7665 30.8789H23.7691C21.5995 30.8783 20.0411 28.7857 20.6649 26.7018L24.6519 13.405C24.7242 13.1848 24.9039 13.1304 25.0035 13.1211Z" fill="url(#aiera_grad3)"/>
        <defs>
          <linearGradient id="aiera_grad0" x1="2.90277" y1="50.7643" x2="26.8472" y2="4.24992" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5C400"/>
            <stop offset="0.5" stopColor="#E07010"/>
            <stop offset="1" stopColor="#3A54A8"/>
          </linearGradient>
          <linearGradient id="aiera_grad1" x1="2.90277" y1="50.7643" x2="26.8472" y2="4.24992" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5C400"/>
            <stop offset="0.5" stopColor="#E07010"/>
            <stop offset="1" stopColor="#3A54A8"/>
          </linearGradient>
          <linearGradient id="aiera_grad2" x1="2.90277" y1="50.7643" x2="26.8472" y2="4.24992" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5C400"/>
            <stop offset="0.5" stopColor="#E07010"/>
            <stop offset="1" stopColor="#3A54A8"/>
          </linearGradient>
          <linearGradient id="aiera_grad3" x1="2.90277" y1="50.7643" x2="26.8472" y2="4.24992" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F5C400"/>
            <stop offset="0.5" stopColor="#E07010"/>
            <stop offset="1" stopColor="#3A54A8"/>
          </linearGradient>
        </defs>
      </svg>
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


export function UtilityIcons({ onOpenAssistant }: { onOpenAssistant: () => void }) {
  const isMobile = useIsMobile();

  return (
    <div className="flex gap-3 items-center" data-name="utility-icons">
      {!isMobile && <AieraIcon onClick={onOpenAssistant} />}
      {!isMobile && <QuestionFill />}
      {!isMobile && <MailFill />}
      <ButtonIconMode />
    </div>
  );
}

function RightSection({ onOpenAssistant }: { onOpenAssistant: () => void }) {
  return (
    <div className="flex" data-name="right section">
      <UtilityIcons onOpenAssistant={onOpenAssistant} />
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
  onOpenSearch,
  onOpenAssistant,
  searchInputRef,
}: UtilityBarProps) {
  const isMobile = useIsMobile();

  return (
    <div
      className="relative size-full"
      data-name="utility"
      style={{ backgroundColor: 'var(--background)', borderBottom: '1px solid var(--border)', height: 48 }}
    >
      <div className="flex flex-row items-center min-w-inherit relative size-full">
        <div className="box-border content-stretch flex items-center min-w-inherit px-6 relative size-full gap-4" style={{ paddingTop: 10, paddingBottom: 10 }}>
          <LeftSection
            showBackButton={showBackButton}
            onBack={onBack}
            showSidebarToggle={showSidebarToggle}
            sidebarVisible={sidebarVisible}
            onSidebarToggle={onSidebarToggle}
          />
          <div className="flex-1" />
          <div className="flex items-center gap-4 shrink-0">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}