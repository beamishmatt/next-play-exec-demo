import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TvMinimalPlay, BarChart, Calendar, Mail, Search, Grid3x3, Archive, Waypoints } from 'lucide-react';
import { ModeSwitch } from './ModeSwitch';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface ConfigurableSidebarProps {
  navItems: NavItem[];
  headerIcon?: React.ReactNode;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
  onSearchClick?: () => void;
  searchActive?: boolean;
}

export function ConfigurableSidebar({
  navItems,
  headerIcon = <Grid3x3 size={24} />,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
  onNavigate,
  onSearchClick,
  searchActive = false,
}: ConfigurableSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isCollapsed = controlledIsCollapsed !== undefined ? controlledIsCollapsed : internalIsCollapsed;
  
  const toggleCollapse = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalIsCollapsed(!internalIsCollapsed);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    // Call onNavigate callback if provided (useful for mobile to close sidebar)
    if (onNavigate) {
      onNavigate();
    }
  };

  // Determine active item based on current route
  const getActiveItem = () => {
    const currentPath = location.pathname;
    
    // First try exact match
    const exactMatch = navItems.find(item => item.path === currentPath);
    if (exactMatch) {
      return exactMatch.id;
    }
    
    // Then try prefix match for nested routes (e.g., /cases/case-id should match /cases)
    const prefixMatch = navItems.find(item => 
      currentPath.startsWith(item.path + '/') && item.path !== '/'
    );
    
    return prefixMatch?.id || navItems[0]?.id || '';
  };

  const activeItem = getActiveItem();

  return (
    <div 
      className="h-full flex flex-col transition-all duration-300 ease-in-out"
      style={{
        backgroundColor: 'var(--sidebar)',
        boxShadow: 'var(--elevation-md)',
        borderRight: '1px solid var(--sidebar-border)',
        width: isCollapsed ? '64px' : '256px',
        flexShrink: 0,
        flexGrow: 0,
      }}
    >
      {/* Header */}
      <div 
        className="border-b transition-all duration-300 pt-4 pb-4 pl-4"
        style={{ 
          borderColor: 'var(--sidebar-border)',
          height: 64,
        }}
      >
        <div className="w-full h-full flex items-center justify-start">
          <span 
            style={{ 
              color: 'var(--sidebar-foreground)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            {headerIcon}
          </span>
        </div>
      </div>

      {/* Navigation items */}
      <nav className={`flex-1 transition-all duration-300 ${isCollapsed ? 'pl-2 pr-2 py-4' : 'pl-4 pt-4 pb-4'}`}>
        <ul className="space-y-1">
          {/* Search — always first */}
          {onSearchClick && (
            <li>
              <button
                onClick={onSearchClick}
                className={`w-full flex items-center transition-all duration-300 ${
                  isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
                } text-left transition-colors`}
                style={{
                  borderRadius: 'var(--radius)',
                  fontSize: 'var(--text-nav-item)',
                  fontWeight: 'var(--font-weight-medium)',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  backgroundColor: searchActive ? 'var(--sidebar-active)' : 'transparent',
                  color: searchActive ? 'var(--sidebar-primary-foreground)' : 'var(--sidebar-foreground)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!searchActive) {
                    e.currentTarget.style.backgroundColor = 'var(--fill-hover)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!searchActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                title={isCollapsed ? 'Search' : undefined}
              >
                <span style={{ color: searchActive ? 'var(--sidebar-primary-foreground)' : 'var(--sidebar-foreground)' }}>
                  <Search size={24} />
                </span>
                {!isCollapsed && <span className="nav-item">Search</span>}
              </button>
            </li>
          )}
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center transition-all duration-300 ${
                  isCollapsed 
                    ? 'justify-center p-2' 
                    : 'gap-3 px-3 py-2'
                } text-left transition-colors`}
                style={{
                  borderRadius: 'var(--radius)',
                  fontSize: 'var(--text-nav-item)',
                  fontWeight: 'var(--font-weight-medium)',
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  backgroundColor: activeItem === item.id 
                    ? 'var(--sidebar-active)' 
                    : 'transparent',
                  color: activeItem === item.id 
                    ? 'var(--sidebar-primary-foreground)' 
                    : 'var(--sidebar-foreground)',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (activeItem !== item.id) {
                    e.currentTarget.style.backgroundColor = 'var(--fill-hover)';
                    e.currentTarget.style.color = 'var(--sidebar-foreground)';
                    // Keep icon color consistent on hover
                    const iconSpan = e.currentTarget.querySelector('span');
                    if (iconSpan) {
                      iconSpan.style.color = 'var(--sidebar-foreground)';
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeItem !== item.id) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--sidebar-foreground)';
                    // Reset icon color on mouse leave
                    const iconSpan = e.currentTarget.querySelector('span');
                    if (iconSpan) {
                      iconSpan.style.color = 'var(--sidebar-foreground)';
                    }
                  }
                }}
                title={isCollapsed ? item.label : undefined}
              >
                <span 
                  style={{ 
                    color: activeItem === item.id 
                      ? 'var(--sidebar-primary-foreground)' 
                      : 'var(--sidebar-foreground)' 
                  }}
                >
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span 
                    className="nav-item transition-opacity duration-300"
                    style={{ opacity: isCollapsed ? 0 : 1 }}
                  >
                    {item.label}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer with toggle */}
      <div 
        className="border-t transition-all duration-300 pt-4 pb-4 pl-4"
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        <ModeSwitch isCollapsed={isCollapsed} onClick={toggleCollapse} />
      </div>
    </div>
  );
}

// Export available icons and a helper to create nav items
export const NavigationIcons = {
  TvMinimalPlay,
  BarChart,
  Archive,
  Waypoints,
};

export type { NavItem };