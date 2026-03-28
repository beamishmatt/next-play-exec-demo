import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { 
  getAllSharedCases, 
  clearAllShareData, 
  getCaseShareData,
  isCaseShared 
} from '../data/persistenceLayer';

export function PersistenceTestPanel() {
  const [refreshKey, setRefreshKey] = React.useState(0);
  
  const refresh = () => setRefreshKey(prev => prev + 1);
  
  // Get all shared cases for display
  const sharedCases = getAllSharedCases();
  
  // Test data for a few cases
  const testCaseIds = ['25-08-001', '25-08-002', '25-08-003'];
  
  const handleClearData = () => {
    clearAllShareData();
    refresh();
  };
  
  return (
    <Card className="max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Persistence Test Panel</CardTitle>
        <CardDescription>
          This panel shows the current state of localStorage persistence for case sharing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Summary</h4>
          <p className="text-sm text-muted-foreground">
            {sharedCases.length} cases have been shared
          </p>
        </div>
        
        {/* Test cases status */}
        <div>
          <h4 className="font-medium mb-2">Test Cases Status</h4>
          <div className="space-y-2">
            {testCaseIds.map(caseId => {
              const isShared = isCaseShared(caseId);
              const shareData = getCaseShareData(caseId);
              
              return (
                <div key={caseId} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-mono">{caseId}</span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      isShared ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {isShared ? `Shared (${shareData.sharedUsers.length} users)` : 'Not Shared'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Shared cases details */}
        {sharedCases.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Shared Cases Details</h4>
            <div className="space-y-2">
              {sharedCases.map(caseData => (
                <div key={caseData.caseId} className="p-3 border rounded bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium">{caseData.caseId}</span>
                    <span className="text-sm text-muted-foreground">
                      {caseData.sharedUsers.length} shared users
                    </span>
                  </div>
                  {caseData.lastSharedOn && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Last shared: {caseData.lastSharedOn.toLocaleString()}
                    </p>
                  )}
                  <div className="mt-2 space-y-1">
                    {caseData.sharedUsers.map(user => (
                      <div key={user.id} className="text-xs flex items-center justify-between">
                        <span>{user.name} ({user.role})</span>
                        <span className="text-muted-foreground">{user.shareType}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={refresh} variant="outline" size="sm">
            Refresh Data
          </Button>
          <Button onClick={handleClearData} variant="destructive" size="sm">
            Clear All Share Data
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          <p>To test:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Go to any case detail page</li>
            <li>Click "Share" in the header</li>
            <li>Add a partner user</li>
            <li>Return to cases list to see the shared icon</li>
            <li>Check this panel to see persistence data</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}