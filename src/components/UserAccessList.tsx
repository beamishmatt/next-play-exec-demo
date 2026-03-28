import React from 'react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { ChevronRight, MoreHorizontal, User } from 'lucide-react';
import { ShareType } from '../data/types';

interface User {
  id: string;
  name: string;
  role: string;
  type: 'owner' | 'collaborator' | 'viewer';
  avatarInitials: string;
  shareType?: ShareType; // Optional for partner users
}

interface UserAccessListProps {
  users: User[];
  maxHeight?: string;
  className?: string;
  onUserClick?: (user: User) => void;
}

export function UserAccessList({ users, maxHeight = "200px", className = "", onUserClick }: UserAccessListProps) {
  // Available avatar colors (same as CaseHeader)
  const avatarColors = [
    'bg-primary text-primary-foreground',      // Blue
    'bg-success text-success-foreground',      // Green  
    'bg-warning text-warning-foreground',      // Orange
    'bg-chart-4 text-primary-foreground'       // Purple
  ];

  // Helper function to get avatar color based on user ID
  const getAvatarColor = (userId: string): string => {
    // Create a simple hash from the user ID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Get index (0-3) for color selection
    const colorIndex = Math.abs(hash) % avatarColors.length;
    return avatarColors[colorIndex];
  };

  // Smart color assignment to ensure no duplicates
  const getUniqueAvatarColors = () => {
    const usedColors = new Set<string>();
    const assignedColors: { [key: string]: string } = {};
    
    // Assign colors to all users, avoiding duplicates
    users.forEach((user) => {
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
        // If all colors are used, fall back to hash-based selection
        assignedColors[user.id] = getAvatarColor(user.id);
      }
    });
    
    return assignedColors;
  };

  // Get the unique color assignments
  const colorAssignments = getUniqueAvatarColors();

  return (
    <div className={className}>
      <ScrollArea style={{ maxHeight }}>
        <div className="space-y-0">
          {users.map((user) => (
            <div 
              key={user.id} 
              className={`flex items-center gap-3 p-3 rounded-md transition-colors ${
                user.type !== 'owner' && onUserClick 
                  ? 'hover:bg-muted/50 cursor-pointer' 
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => user.type !== 'owner' && onUserClick && onUserClick(user)}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className={`text-xs ${colorAssignments[user.id]}`}>
                  {user.type === 'owner' ? user.avatarInitials : <User size={14} />}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate caption">
                  {user.name}
                </p>
                {user.type !== 'owner' && (
                  <p className="text-muted-foreground truncate caption">
                    {user.shareType || user.role}
                  </p>
                )}
              </div>
              {user.type === 'owner' ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground caption">
                    {user.role}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    <MoreHorizontal size={16} />
                  </Button>
                </div>
              ) : user.type === 'collaborator' ? (
                <ChevronRight 
                  size={16} 
                  className="text-muted-foreground" 
                />
              ) : null}
            </div>
          ))}
        </div>
      </ScrollArea>
      
      {users.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            No users have access to this case yet.
          </p>
        </div>
      )}
    </div>
  );
}