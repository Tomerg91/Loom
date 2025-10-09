/**
 * Auto-Share Settings Component
 *
 * Settings panel for automatic resource sharing:
 * - Enable/disable auto-share
 * - Select resources to auto-share
 * - Configure permissions
 *
 * @module components/resources/auto-share-settings
 */

'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

export interface AutoShareSettingsProps {
  enabled: boolean;
  permission: 'view' | 'download';
  selectedCollections?: string[];
  onEnabledChange: (enabled: boolean) => void;
  onPermissionChange: (permission: 'view' | 'download') => void;
  onSave: () => Promise<void>;
  className?: string;
}

/**
 * AutoShareSettings Component
 */
export function AutoShareSettings({
  enabled,
  permission,
  selectedCollections = [],
  onEnabledChange,
  onPermissionChange,
  onSave,
  className,
}: AutoShareSettingsProps) {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Auto-Share with New Clients
        </CardTitle>
        <CardDescription>
          Automatically share selected resources when a new client is onboarded
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="auto-share-enabled" className="text-base">
              Enable Auto-Share
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically share resources with newly onboarded clients
            </p>
          </div>
          <Switch
            id="auto-share-enabled"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        {enabled && (
          <>
            {/* Permission Level */}
            <div className="space-y-2">
              <Label>Default Permission</Label>
              <Select value={permission} onValueChange={onPermissionChange as any}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="download">View & Download</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Permission level for auto-shared resources
              </p>
            </div>

            {/* Collections to Auto-Share */}
            <div className="space-y-2">
              <Label>Collections to Auto-Share</Label>
              <div className="rounded-lg border p-4">
                {selectedCollections.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedCollections.map((collection) => (
                      <Badge key={collection} variant="secondary">
                        {collection}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No collections selected for auto-share
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" className="mt-2">
                Select Collections
              </Button>
            </div>

            {/* Info Alert */}
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription className="text-sm">
                Resources will be automatically shared when:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>A new client completes onboarding</li>
                  <li>You manually trigger sharing for existing clients</li>
                </ul>
              </AlertDescription>
            </Alert>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
