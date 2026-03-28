import React from 'react';
import { Evidence } from '../data/types';
import { LabelledData } from './LabelledData';
import { Button } from './ui/button';
import { User, Clock, MapPin } from 'lucide-react';

interface OverviewPanelProps {
  evidence: Evidence;
}

export function OverviewPanel({ evidence }: OverviewPanelProps) {
  // Format the recorded date
  const formatRecordedDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="space-y-6">
      {/* ID Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <LabelledData 
            label="ID"
            value={evidence.id}
            dataColor="var(--fill-key)"
          />
          <Button variant="tertiary" size="sm">
            Edit
          </Button>
        </div>
      </div>

      {/* Title Section */}
      <div>
        <h4
          style={{
            fontSize: 'var(--text-h4)',
            color: 'var(--foreground)'
          }}
        >
          {evidence.title}
        </h4>
      </div>

      {/* Assigned To Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <LabelledData 
            label="Assigned to"
            value={evidence.owner}
          />
          <Button variant="tertiary" size="sm">
            Edit
          </Button>
        </div>
      </div>

      {/* Recorded On Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <LabelledData 
            label="Recorded on"
            value={formatRecordedDate(evidence.recordedOn)}
          />
          <Button variant="tertiary" size="sm">
            Edit
          </Button>
        </div>
      </div>

      {/* Location Section - Only show if location exists */}
      {evidence.location && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <LabelledData 
              label="Location"
              value={evidence.location}
            />
          </div>
        </div>
      )}
    </div>
  );
}