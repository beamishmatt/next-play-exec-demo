import React from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { Button } from './ui/button';
import { X, ArrowLeft } from 'lucide-react';

interface PolicyDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  policyName?: string;
  onBackToShare?: () => void;
}

export function PolicyDetails({ isOpen, onClose, policyName, onBackToShare }: PolicyDetailsProps) {
  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent 
        className="h-full ml-auto rounded-none"
        style={{ 
          width: '400px',
          backgroundColor: 'var(--overlay)',
          borderColor: 'var(--border)'
        }}
      >
        <DrawerHeader 
          className="border-b"
          style={{ 
            borderColor: 'var(--border)',
            padding: 'var(--spacing-6, 1.5rem)'
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle 
                style={{
                  color: 'var(--foreground)'
                }}
              >
                Policy Details
              </DrawerTitle>
              <DrawerDescription 
                style={{
                  color: 'var(--muted-foreground)',
                  marginTop: 'var(--spacing-1, 0.25rem)'
                }}
              >
                {policyName ? `Details for "${policyName}" policy` : 'Policy information and details'}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0"
                style={{
                  borderRadius: 'var(--radius-button)',
                  color: 'var(--muted-foreground)'
                }}
              >
                <X size={16} />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        
        <div 
          className="flex-1"
          style={{ padding: 'var(--spacing-6, 1.5rem)' }}
        >
          {/* Content area - currently blank as requested */}
          <div style={{ paddingTop: 'var(--spacing-12, 3rem)', paddingBottom: 'var(--spacing-12, 3rem)' }}>
            <div className="text-center">
              <p 
                className="text-muted-foreground"
                style={{
                  color: 'var(--muted-foreground)'
                }}
              >
                Policy details content will be added here.
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer with back to share button */}
        {onBackToShare && (
          <div 
            className="border-t"
            style={{ 
              borderColor: 'var(--border)',
              padding: 'var(--spacing-4, 1rem)'
            }}
          >
            <Button 
              variant="outline" 
              onClick={onBackToShare}
              className="w-full"
            >
              <ArrowLeft size={16} style={{ marginRight: 'var(--spacing-2, 0.5rem)' }} />
              Back to Share
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}