import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Share2, Edit3, X, UserX, Users, AlertCircle, Edit, MoreHorizontal, ChevronUp } from 'lucide-react';
import { useIsMobile } from './ui/use-mobile';
import { useActionBar } from './ActionBarProvider';

interface DropdownSubAction {
  key: string;
  label: string;
  onClick: () => void;
}

interface ActionButton {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  variant?: 'special' | 'primary';
  hasDropdown?: boolean;
  dropdownItems?: DropdownSubAction[];
}

type PageType = 'case-detail' | 'cases' | 'evidence';

interface MobileActionConfig {
  primaryActions: string[];  // Actions to show directly on mobile
  moreActions: string[];     // Actions to show in "More" dropdown
  showMoreButton: boolean;   // Whether to show "More" button at all
}

interface ActionBarProps {
  selectedCount: number;
  actions: ActionButton[];
  onClearSelection: () => void;
  pageType?: PageType;
  mobileConfig?: MobileActionConfig; // Allow pages to override mobile behavior
}

// Default mobile configurations for each page type
const defaultMobileConfigs: Record<PageType, MobileActionConfig> = {
  'case-detail': { 
    primaryActions: ['share', 'edit-metadata'], 
    moreActions: [],
    showMoreButton: false
  },
  'cases': { 
    primaryActions: ['reassign', 'manage-access'], 
    moreActions: [],
    showMoreButton: false 
  },
  'evidence': { 
    primaryActions: ['edit-metadata'], 
    moreActions: ['review', 'manage-access', 'evidence-actions'],
    showMoreButton: true
  }
};

export function ActionBar({ selectedCount, actions, onClearSelection, pageType, mobileConfig }: ActionBarProps) {
  const isVisible = selectedCount > 0;
  const isMobile = useIsMobile();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());
  const { setActionBarVisible } = useActionBar();

  // Get the effective mobile configuration (custom or default)
  const effectiveMobileConfig = React.useMemo(() => {
    if (mobileConfig) return mobileConfig;
    if (pageType && defaultMobileConfigs[pageType]) {
      return defaultMobileConfigs[pageType];
    }
    return { primaryActions: [], moreActions: [], showMoreButton: false };
  }, [mobileConfig, pageType]);

  // Notify context about ActionBar visibility
  useEffect(() => {
    setActionBarVisible(isVisible);
  }, [isVisible, setActionBarVisible]);

  // Handle dropdown open/close
  const handleDropdownChange = (actionKey: string, isOpen: boolean) => {
    const newOpenDropdowns = new Set(openDropdowns);
    if (isOpen) {
      newOpenDropdowns.add(actionKey);
    } else {
      newOpenDropdowns.delete(actionKey);
    }
    setOpenDropdowns(newOpenDropdowns);
  };

  // Get mobile-optimized actions using configuration
  const getMobileOptimizedActions = (allActions: ActionButton[]): ActionButton[] => {
    if (!isMobile) {
      return allActions;
    }

    const { primaryActions } = effectiveMobileConfig;
    return allActions.filter(action => primaryActions.includes(action.key));
  };

  // Get actions for the "more" dropdown on mobile using configuration
  const getMobileMoreActions = (allActions: ActionButton[]): ActionButton[] => {
    if (!isMobile) {
      return [];
    }

    const { moreActions } = effectiveMobileConfig;
    return allActions.filter(action => moreActions.includes(action.key));
  };

  const displayActions = getMobileOptimizedActions(actions);
  const moreActions = getMobileMoreActions(actions);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            opacity: { duration: 0.2 }
          }}
          className="fixed left-1/2 -translate-x-1/2 z-50"
          style={{ 
            bottom: '32px',
            backgroundColor: 'var(--fill-special-vivid)',
            borderRadius: 'var(--radius-card)',
            boxShadow: 'var(--elevation-md)'
          }}
        >
          <div className="flex items-center gap-3 px-3 py-1.5">
            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {displayActions.map((action) => (
                action.hasDropdown ? (
                  <DropdownMenu 
                    key={action.key}
                    onOpenChange={(isOpen) => handleDropdownChange(action.key, isOpen)}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="special"
                        className="flex items-center gap-1.5"
                        style={{ fontSize: '12px' }}
                      >
                        {action.label}
                        <ChevronUp 
                          size={12}
                          className={`transition-transform duration-200 ${
                            openDropdowns.has(action.key) ? 'rotate-180' : ''
                          }`}
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent 
                      side="top" 
                      align="center"
                    >
                      {action.dropdownItems?.map((item) => (
                        <DropdownMenuItem 
                          key={item.key}
                          onClick={item.onClick}
                        >
                          {item.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    key={action.key}
                    size="sm"
                    variant={action.variant ?? 'special'}
                    onClick={action.onClick}
                    style={{ fontSize: '12px' }}
                  >
                    {action.label}
                  </Button>
                )
              ))}

              {/* More button for mobile - now configurable */}
              {isMobile && effectiveMobileConfig.showMoreButton && moreActions.length > 0 && (
                <DropdownMenu onOpenChange={(isOpen) => handleDropdownChange('more', isOpen)}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="special"
                      aria-label="More actions"
                      style={{ fontSize: '12px' }}
                    >
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="top" align="center">
                    {moreActions.map((action) => (
                      <DropdownMenuItem 
                        key={action.key}
                        onClick={action.onClick}
                      >
                        {action.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            {/* Divider */}
            <div 
              className="w-px h-6"
              style={{ backgroundColor: 'var(--text-special)' }}
            />

            {/* Selection count */}
            <div className="flex items-center gap-2">
              <span
                className="whitespace-nowrap"
                style={{ fontSize: 'var(--text-caption)', color: 'var(--text-special)' }}
              >
                {selectedCount} selected
              </span>
              <Button
                size="icon"
                variant="special"
                onClick={onClearSelection}
                aria-label="Clear selection"
                style={{ fontSize: '12px' }}
              >
                <X size={14} />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}