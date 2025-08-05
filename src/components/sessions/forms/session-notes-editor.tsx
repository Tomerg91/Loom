import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { SessionFormData, SessionFormField } from '@/types';

interface SessionNotesEditorProps {
  formData: SessionFormData;
  onFieldChange: (field: SessionFormField, value: string) => void;
}

export function SessionNotesEditor({ formData, onFieldChange }: SessionNotesEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Additional Notes</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={formData.notes}
          onChange={(e) => onFieldChange('notes', e.target.value)}
          placeholder="Add any additional notes for this session..."
          rows={4}
        />
      </CardContent>
    </Card>
  );
}