import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { UserAccessList } from './UserAccessList';
import { getCaseById } from '../data/mockCases';
import { mockPartners } from '../data/mockPartners';
import { getSharedUsersForCase, addSharedUserToCase } from '../data/persistenceLayer';
import { Loader2, ArrowLeft } from 'lucide-react';

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onShare?: () => void;
  onOpenPolicyDetails?: (policyName: string) => void;
}

export function ShareDialog({ isOpen, onClose, caseId, onShare, onOpenPolicyDetails }: ShareDialogProps) {
  const [activeTab, setActiveTab] = useState('people');
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [selectedPartnerUser, setSelectedPartnerUser] = useState<string>('');
  const [shareMessage, setShareMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'main' | 'userDetails'>('main');
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<any>(null);
  const [isPolicyDetailsOpen, setIsPolicyDetailsOpen] = useState(false);

  // Load shared users from persistence when dialog opens
  useEffect(() => {
    if (isOpen) {
      const persistedSharedUsers = getSharedUsersForCase(caseId);
      setSharedUsers(persistedSharedUsers);
    }
  }, [isOpen, caseId]);

  // Get case data to show the owner
  const caseData = getCaseById(caseId);

  // Get the selected partner details
  const selectedPartnerData = mockPartners.find(partner => partner.id === selectedPartner);
  
  // Get the selected partner user details
  const selectedPartnerUserData = selectedPartnerData?.users.find(user => user.id === selectedPartnerUser);

  // Reset selected user when partner changes
  const handlePartnerChange = (partnerId: string) => {
    setSelectedPartner(partnerId);
    setShareMessage(''); // Reset message
    
    // Check if the selected partner has a default user
    const partnerData = mockPartners.find(partner => partner.id === partnerId);
    if (partnerData?.hasDefaultUser && partnerData.defaultUser) {
      // Auto-populate the default user
      setSelectedPartnerUser(partnerData.defaultUser.id);
    } else {
      // Reset user selection for partners without default users
      setSelectedPartnerUser('');
    }
  };

  // Reset all workflow state
  const resetWorkflowState = () => {
    setSelectedPartner('');
    setSelectedPartnerUser('');
    setShareMessage('');
  };

  // Handle user click for details view
  const handleUserClick = (user: any) => {
    if (user.type !== 'owner') { // Only allow clicking on collaborators
      setSelectedUserForDetails(user);
      setViewMode('userDetails');
    }
  };

  // Handle back to main view
  const handleBackToMain = () => {
    setViewMode('main');
    setSelectedUserForDetails(null);
  };

  // Reset view mode when dialog closes
  const handleDialogClose = () => {
    setViewMode('main');
    setSelectedUserForDetails(null);
    onClose();
  };

  // Combined users with access - case owner + shared users
  const usersWithAccess = useMemo(() => [
    {
      id: '1',
      name: caseData?.owner || 'Unknown Owner',
      role: 'Case Owner',
      type: 'owner' as const,
      avatarInitials: caseData?.owner ? caseData.owner.split(' ').map(n => n[0]).join('') : 'UO'
    },
    ...sharedUsers
  ], [caseData, sharedUsers]);

  const handleShareConfirm = useCallback(async () => {
    if (!selectedPartnerUserData || !selectedPartnerData) return;
    
    setIsLoading(true);
    
    // Simulate API call with 3 second delay
    setTimeout(() => {
      // Add the user to persistence layer
      const newSharedUser = addSharedUserToCase(
        caseId, 
        selectedPartnerUserData, 
        selectedPartnerData.name
      );
      
      // Update local state
      setSharedUsers(prev => [...prev, newSharedUser]);
      
      // Reset the workflow state
      resetWorkflowState();
      setIsLoading(false);
      
      if (onShare) {
        onShare();
      }
    }, 3000);
  }, [caseId, selectedPartnerUserData, selectedPartnerData, onShare]);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {viewMode === 'userDetails' && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={handleBackToMain}
                className="h-8 w-8 p-0 cursor-pointer"
              >
                <ArrowLeft size={16} />
              </Button>
            )}
            <DialogTitle style={{
              fontSize: 'var(--text-h4)'
            }}>
              {viewMode === 'main' ? `Share Case ${caseId}` : `User Details`}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Share this case with team members and collaborators.
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative transition-all duration-300 ease-out overflow-hidden">
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-overlay/80 backdrop-blur-sm z-10 rounded-md" />
          )}
          
          <div 
            className="transition-all duration-300 ease-out"
            style={{
              minHeight: viewMode === 'main' ? '240px' : '120px'
            }}
          >
            {viewMode === 'main' ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start h-auto p-0 bg-transparent border-b rounded-none">
              <TabsTrigger 
                value="people"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                People
              </TabsTrigger>
              <TabsTrigger 
                value="links"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
              >
                Links
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="people" className="mt-4 space-y-6 max-h-80 overflow-y-auto pr-1">
              {/* Partner Selection */}
              <div className="space-y-2">
                <label className="block">
                  Add Partner
                </label>
                <Select value={selectedPartner} onValueChange={handlePartnerChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mockPartners.map((partner) => (
                      <SelectItem 
                        key={partner.id} 
                        value={partner.id}
                      >
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Partner */}
              {selectedPartnerData && (
                <div className="space-y-4">
                  {/* Partner User Selection */}
                  <div className="space-y-2">
                    <label className="block">
                      Select User
                      {selectedPartnerData?.hasDefaultUser && selectedPartnerData.defaultUser?.id === selectedPartnerUser && (
                        <span className="ml-2 text-accent caption">
                          (Default)
                        </span>
                      )}
                    </label>
                    <Select value={selectedPartnerUser} onValueChange={setSelectedPartnerUser}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a user">
                          {selectedPartnerUserData?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {selectedPartnerData.users.map((user) => (
                          <SelectItem 
                            key={user.id} 
                            value={user.id}
                          >
                            <div className="flex flex-col">
                              <span>{user.name}</span>
                              <span className="text-xs opacity-60">{user.email}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block">
                      Policy
                    </label>
                    <button
                      type="button"
                      onClick={() => onOpenPolicyDetails?.(selectedPartnerData.sharingPolicy)}
                      className="text-left underline text-accent hover:text-accent/80 transition-colors"
                      style={{
                        fontSize: 'var(--text-p)',
                        fontWeight: 'var(--font-weight-regular)',
                        fontFamily: "'IBM Plex Sans', sans-serif"
                      }}
                    >
                      {selectedPartnerData.sharingPolicy}
                    </button>
                  </div>

                  {/* Message Field - only show when user is selected */}
                  {selectedPartnerUser && (
                    <div className="space-y-2">
                      <label className="block">
                        Message (Optional)
                      </label>
                      <Textarea
                        value={shareMessage}
                        onChange={(e) => setShareMessage(e.target.value)}
                        rows={3}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Users with Access - only show when no partner is selected */}
              {!selectedPartner && (
                <div className="space-y-0">
                  <label className="block">
                    People with Access
                  </label>
                  <UserAccessList 
                    users={usersWithAccess} 
                    maxHeight="180px"
                    onUserClick={handleUserClick}
                  />
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="links" className="mt-4 space-y-0 max-h-80 overflow-y-auto pr-1">
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Share via links content will be added here.
                </p>
              </div>
            </TabsContent>
            </Tabs>
          ) : (
            <div className="mt-4 space-y-6">
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  User details for {selectedUserForDetails?.name} will be displayed here.
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="secondary" 
            onClick={handleDialogClose}
            className="cursor-pointer"
          >
            Close
          </Button>
          {viewMode === 'main' && (
            <Button 
              onClick={handleShareConfirm}
              disabled={isLoading || !selectedPartnerUser}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                'Share'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}