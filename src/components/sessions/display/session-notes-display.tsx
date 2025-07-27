import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

interface SessionNotesDisplayProps {
  notes?: string;
}

export function SessionNotesDisplay({ notes }: SessionNotesDisplayProps) {
  if (!notes) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Session Notes</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm whitespace-pre-wrap">{notes}</p>
      </CardContent>
    </Card>
  );
}