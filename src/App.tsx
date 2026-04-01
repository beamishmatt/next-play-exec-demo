import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { ActionBarProvider } from './components/ActionBarProvider';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/sonner';
import { ConfigurableSidebar, NavigationIcons, NavItem } from './components/ConfigurableSidebar';
import { UtilityBar } from './components/UtilityBar';
import { CustomLogo } from './components/CustomLogo';
import { EvidencePage } from './components/pages/EvidencePage';
import { CasesPage } from './components/pages/CasesPage';
import { CaseDetailPage } from './components/pages/CaseDetailPage';
import { EvidenceDetailPage } from './components/pages/EvidenceDetailPage';
import { CommunityPage } from './components/pages/CommunityPage';
import { DevicesPage } from './components/pages/DevicesPage';
import { AnalyticsPage } from './components/pages/AnalyticsPage';
import { ImportModal } from './components/ImportModal';
import { getEvidenceByCaseId } from './data/mockEvidence';
import { useIsMobile } from './components/ui/use-mobile';
import { SearchTakeover } from './components/SearchTakeover';
import { Plus } from 'lucide-react';
import EvidenceIcon from './imports/EvidenceIcon';
import CasesIcon from './imports/CasesIcon';
import CommunityIcon from './imports/CommunityIcon';
import DevicesIcon from './imports/DevicesIcon';
import AnalyticsIcon from './imports/AnalyticsIcon';

// Define your navigation items here - add or remove items as needed
const navigationItems: NavItem[] = [
  { id: 'evidence', label: 'Evidence', icon: <div style={{ width: 24, height: 24 }}><EvidenceIcon /></div>, path: '/evidence' },
  { id: 'cases', label: 'Cases', icon: <div style={{ width: 24, height: 24 }}><CasesIcon /></div>, path: '/cases' },
  { id: 'community', label: 'Community', icon: <div style={{ width: 24, height: 24 }}><CommunityIcon /></div>, path: '/community' },
  { id: 'devices', label: 'Devices', icon: <div style={{ width: 24, height: 24 }}><DevicesIcon /></div>, path: '/devices' },
  { id: 'analytics', label: 'Analytics', icon: <div style={{ width: 24, height: 24 }}><AnalyticsIcon /></div>, path: '/analytics' },
];

// Define your header icon here - easily swappable
const headerIcon = <CustomLogo size={32} />;

export default function App() {
  return (
    <ThemeProvider>
      <ActionBarProvider>
        <Router>
          <AppContent />
          <Toaster />
        </Router>
      </ActionBarProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const pageTitle = usePageTitle(location.pathname);
  const isMobile = useIsMobile();
  const [sidebarVisible, setSidebarVisible] = React.useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [searchState, setSearchState] = React.useState<{ open: boolean; query?: string; selectedId?: string; output?: import('./data/types').SearchOutput }>({ open: false });
  const [importOpen, setImportOpen] = React.useState(false);

  // Memoized computation for back button visibility
  const shouldShowBackButton = React.useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(segment => segment !== '');
    return pathSegments.length >= 2;
  }, [location.pathname]);

  // Memoized computation for evidence detail page detection
  const isEvidenceDetailPage = React.useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(segment => segment !== '');
    // Evidence detail from cases page: /cases/caseId/evidence/index
    // Evidence detail from evidence page: /evidence/caseId/index
    return (pathSegments.length === 4 && pathSegments[2] === 'evidence') ||
           (pathSegments.length === 3 && pathSegments[0] === 'evidence');
  }, [location.pathname]);

  // Handle sidebar visibility based on route changes
  React.useEffect(() => {
    if (isMobile) {
      // On mobile, hide sidebar by default
      setSidebarVisible(false);
    } else if (isEvidenceDetailPage) {
      // Hide sidebar by default on evidence detail page
      setSidebarVisible(false);
    } else {
      // Show sidebar on all other pages
      setSidebarVisible(true);
    }
  }, [isMobile, isEvidenceDetailPage]);

  // Memoized handlers to prevent unnecessary re-renders
  const handleSidebarToggle = React.useCallback(() => {
    setSidebarVisible(prev => !prev);
  }, []);

  const handleSidebarCollapseToggle = React.useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  // Memoized back navigation handler
  const handleBack = React.useCallback(() => {
    const pathSegments = location.pathname.split('/').filter(segment => segment !== '');
    const searchParams = new URLSearchParams(location.search);
    const filtersParam = searchParams.get('filters');
    
    if (pathSegments.length >= 2) {
      // Special handling for evidence detail pages
      if (pathSegments.length === 4 && pathSegments[2] === 'evidence') {
        // /cases/caseId/evidence/index -> /cases/caseId (preserve filters)
        const caseDetailPath = '/' + pathSegments.slice(0, 2).join('/');
        if (filtersParam) {
          navigate(`${caseDetailPath}?filters=${encodeURIComponent(filtersParam)}`);
        } else {
          navigate(caseDetailPath);
        }
      } else if (pathSegments.length === 3 && pathSegments[0] === 'evidence') {
        // /evidence/caseId/index -> /evidence
        navigate('/evidence');
      } else {
        // Navigate to parent route (e.g., /cases/case-id -> /cases)
        const parentPath = '/' + pathSegments.slice(0, -1).join('/');
        navigate(parentPath);
      }
    }
  }, [location.pathname, location.search, navigate]);

  // Memoized navigation handler for mobile sidebar
  const handleMobileNavigation = React.useCallback(() => {
    setSidebarVisible(false);
  }, []);

  return (
    <TooltipProvider>
      <div className="h-screen flex bg-base">
        {/* Search takeover */}
        {searchState.open && (
          <SearchTakeover
            onClose={() => setSearchState({ open: false })}
            initialQuery={searchState.query}
            initialSelectedId={searchState.selectedId}
            initialOutput={searchState.output}
          />
        )}

        {/* Import Evidence modal */}
        <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />

        {/* Desktop Sidebar */}
        {!isMobile && sidebarVisible && (
          <ConfigurableSidebar
            navItems={navigationItems}
            headerIcon={headerIcon}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={handleSidebarCollapseToggle}
          />
        )}

        {/* Mobile Sidebar Overlay */}
        {isMobile && sidebarVisible && (
          <>
            <div
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
              onClick={handleSidebarToggle}
            />
            <div className="fixed inset-y-0 left-0 z-50">
              <ConfigurableSidebar
                navItems={navigationItems}
                headerIcon={headerIcon}
                isCollapsed={false}
                onToggleCollapse={handleSidebarCollapseToggle}
                onNavigate={handleMobileNavigation}
              />
            </div>
          </>
        )}
        
        {/* Main content area */}
        <div className="flex-1 h-full flex flex-col" style={{ minWidth: 0 }}>
          {/* Fixed Utility Bar */}
          <div className="h-16 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
            <UtilityBar
              title={pageTitle}
              showBackButton={shouldShowBackButton}
              onBack={handleBack}
              showSidebarToggle={isMobile || isEvidenceDetailPage}
              sidebarVisible={sidebarVisible}
              onSidebarToggle={handleSidebarToggle}
              onOpenSearch={(query, selectedId, output) => setSearchState({ open: true, query, selectedId, output })}
              actions={location.pathname === '/cases' ? (
                <button
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    height: 32, padding: '0 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    fontSize: 13, fontWeight: 500,
                    color: 'var(--text-strong)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontFamily: 'inherit',
                  }}
                >
                  <Plus size={14} />
                  Create Case
                </button>
              ) : location.pathname === '/evidence' ? (
                <button
                  onClick={() => setImportOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    height: 32, padding: '0 12px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    fontSize: 13, fontWeight: 500,
                    color: 'var(--text-strong)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Plus size={14} />
                  Add Evidence
                </button>
              ) : undefined}
            />
          </div>
          
          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto" style={{ minWidth: 0 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/evidence" replace />} />
              <Route path="/evidence" element={<EvidencePage />} />
              <Route path="/evidence/:caseId/:evidenceIndex" element={<EvidenceDetailPage />} />
              <Route path="/cases" element={<CasesPage />} />
              <Route path="/cases/:caseId" element={<CaseDetailPage />} />
              <Route path="/cases/:caseId/evidence/:evidenceIndex" element={<EvidenceDetailPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/devices" element={<DevicesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              {/* Catch-all route for unmatched paths */}
              <Route path="*" element={<Navigate to="/evidence" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// Memoized component to get the current page title based on route
function usePageTitle(pathname: string): string {
  return React.useMemo(() => {
    if (pathname === '/evidence') return 'Evidence';
    if (pathname === '/cases') return 'Cases';
    if (pathname === '/community') return 'Community';
    if (pathname === '/devices') return 'Devices';
    if (pathname === '/analytics') return 'Analytics';
    
    // Handle evidence detail routes from evidence page (e.g., /evidence/25-08-001/0)
    if (pathname.startsWith('/evidence/') && pathname !== '/evidence') {
      const pathSegments = pathname.split('/').filter(segment => segment !== '');
      if (pathSegments.length === 3) {
        const caseId = pathSegments[1];
        const evidenceIndex = parseInt(pathSegments[2]);
        const caseEvidence = getEvidenceByCaseId(caseId);
        const evidence = caseEvidence[evidenceIndex];
        if (evidence) {
          return evidence.title;
        }
        return `Evidence ${evidenceIndex + 1}`;
      }
    }

    // Handle case detail routes (e.g., /cases/25-08-001)
    if (pathname.startsWith('/cases/')) {
      const pathSegments = pathname.split('/').filter(segment => segment !== '');
      const caseId = pathSegments[1];
      
      // Check if this is an evidence detail route (e.g., /cases/25-08-001/evidence/0)
      if (pathSegments.length === 4 && pathSegments[2] === 'evidence') {
        const evidenceIndex = parseInt(pathSegments[3]);
        const caseEvidence = getEvidenceByCaseId(caseId);
        const evidence = caseEvidence[evidenceIndex];
        if (evidence) {
          return evidence.title;
        }
        return `Evidence ${evidenceIndex + 1}`;
      }
      
      return `Case ${caseId}`;
    }
    
    return 'Evidence';
  }, [pathname]);
}