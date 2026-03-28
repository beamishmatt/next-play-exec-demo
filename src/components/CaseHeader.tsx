import React from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Stamp } from './ui/stamp';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Share, MoreHorizontal, Users, Pencil } from 'lucide-react';
import { Case } from '../data/types';
import { getSharedUsersForCase } from '../data/persistenceLayer';
import { LabelledData } from './LabelledData';

interface CaseHeaderProps {
  case_: Case;
  onShare?: () => void;
}

export function CaseHeader({ case_, onShare }: CaseHeaderProps) {
  // Get shared users for this case
  const sharedUsers = getSharedUsersForCase(case_.caseId);
  
  // Helper function to get initials from full name
  const getInitials = (name: string): string => {
    const names = name.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Available avatar colors
  const avatarColors = [
    'bg-primary text-primary-foreground',      // Blue
    'bg-success text-success-foreground',      // Green  
    'bg-warning text-warning-foreground',      // Orange
    'bg-chart-4 text-primary-foreground'       // Purple
  ];

  // Helper function to get avatar color based on case ID
  const getAvatarColor = (caseId: string): string => {
    // Create a simple hash from the case ID
    let hash = 0;
    for (let i = 0; i < caseId.length; i++) {
      hash = caseId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Get index (0-3) for color selection
    const colorIndex = Math.abs(hash) % avatarColors.length;
    return avatarColors[colorIndex];
  };

  // Smart color assignment to ensure no duplicates
  const getUniqueAvatarColors = () => {
    const usedColors = new Set<string>();
    const assignedColors: { [key: string]: string } = {};
    
    // First, assign owner color
    const ownerColor = getAvatarColor(case_.caseId);
    assignedColors['owner'] = ownerColor;
    usedColors.add(ownerColor);
    
    // Then assign colors to shared users, avoiding duplicates
    const visibleSharedUsers = sharedUsers.slice(0, 3);
    visibleSharedUsers.forEach((user) => {
      // Find first available color not already used
      const availableColors = avatarColors.filter(color => !usedColors.has(color));
      
      if (availableColors.length > 0) {
        // If we have available colors, pick one based on user ID hash
        let hash = 0;
        for (let i = 0; i < user.id.length; i++) {
          hash = user.id.charCodeAt(i) + ((hash << 5) - hash);
        }
        const colorIndex = Math.abs(hash) % availableColors.length;
        const selectedColor = availableColors[colorIndex];
        
        assignedColors[user.id] = selectedColor;
        usedColors.add(selectedColor);
      } else {
        // Fallback (shouldn't happen with 4 colors and max 4 avatars)
        assignedColors[user.id] = avatarColors[0];
      }
    });
    
    return assignedColors;
  };

  // Get the unique color assignments
  const colorAssignments = getUniqueAvatarColors();

  // Helper function to format date
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      {/* Case Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-3 flex-1">
          {/* Case ID and Action Buttons */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between md:gap-3">
              <h3>
                {case_.caseId}
              </h3>
              {case_.isShared && (
                <Stamp 
                  variant="key"
                >
                  <Users size={12} className="mr-1" />
                  Shared
                </Stamp>
              )}
            </div>
            
            {/* Avatars and Action Buttons */}
            <div className="flex items-center justify-between md:gap-3">
              {/* Avatar group */}
              <div className="flex items-center">
                {/* Owner Avatar */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-pointer">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback 
                          className={`${colorAssignments['owner']} caption`}
                        >
                          {getInitials(case_.owner)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="caption">
                      {case_.owner} (Owner)
                    </p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Shared Users Avatars - Show first 3 */}
                {sharedUsers.slice(0, 3).map((user, index) => (
                  <Tooltip key={user.id}>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer -ml-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback 
                            className={`${colorAssignments[user.id]} caption`}
                          >
                            {user.avatarInitials}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="caption">
                        {user.name} ({user.shareType} • {user.role})
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                
                {/* Show additional count if there are many shared users */}
                {sharedUsers.length > 3 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-pointer -ml-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback 
                            className="bg-muted text-muted-foreground caption"
                          >
                            +{sharedUsers.length - 3}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="caption">
                        {sharedUsers.length - 3} more shared users
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Button onClick={onShare}>
                  <Share size={16} className="mr-2" />
                  Share
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="tertiary">
                      <MoreHorizontal size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Export Audit Trail</DropdownMenuItem>
                    <DropdownMenuItem 
                      style={{ color: 'var(--text-error)' }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          
          {/* Case Metadata */}
          <div className="flex items-end gap-6">
            <LabelledData 
              label="Description"
              value={case_.description}
              dataVariant="caption"
              className="flex-1 min-w-0"
            />
            
            <LabelledData 
              label="Access Class"
              value={case_.accessClass}
              dataVariant="caption"
              className="flex-shrink-0"
            />
            
            <Button variant="tertiary" size="sm" className="flex-shrink-0">
              <Pencil size={16} />
            </Button>
          </div>
        </div>
      </div>
      
    </div>
  );
}