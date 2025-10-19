'use client';

/**
 * Client Resource Progress Card Component
 *
 * Displays a summary card for resources not yet started:
 * - Shows resources awaiting action
 * - Quick actions to mark as viewed/completed
 * - Encourages engagement with new resources
 *
 * @module components/resources/client-resource-progress-card
 */

import { Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  RESOURCE_CATEGORY_LABELS,
  type ClientResourceItem,
  type ProgressAction,
} from '@/types/resources';

interface ClientResourceProgressCardProps {
  resources: ClientResourceItem[];
  onTrackProgress: (resourceId: string, action: ProgressAction) => void;
}

export function ClientResourceProgressCard({
  resources,
  onTrackProgress,
}: ClientResourceProgressCardProps) {
  if (resources.length === 0) {
    return null;
  }

  const displayResources = resources.slice(0, 3); // Show max 3 resources

  return (
    <Card className="border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Resources to Start
        </CardTitle>
        <CardDescription>
          You have {resources.length} resource{resources.length !== 1 ? 's' : ''} waiting for you
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayResources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{resource.filename}</p>
                <p className="text-sm text-muted-foreground">
                  {RESOURCE_CATEGORY_LABELS[resource.category]} • {resource.sharedBy.name}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTrackProgress(resource.id, 'viewed')}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Start
              </Button>
            </div>
          ))}

          {resources.length > 3 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              And {resources.length - 3} more resource{resources.length - 3 !== 1 ? 's' : ''}...
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
