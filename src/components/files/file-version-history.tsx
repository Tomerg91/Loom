'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export interface FileVersionHistoryProps {
  fileId: string;
  onVersionSelect?: (versionId: string) => void;
}

/**
 * File Version History Component - Stub
 * TODO: Implement full version history functionality
 */
export function FileVersionHistory({ fileId, onVersionSelect }: FileVersionHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Version History</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Version history is not yet implemented.
        </p>
      </CardContent>
    </Card>
  );
}
