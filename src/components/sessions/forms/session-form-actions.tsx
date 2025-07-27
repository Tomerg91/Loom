import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { SessionFormData } from '../shared/types';

interface SessionFormActionsProps {
  formData: SessionFormData;
  isLoading: boolean;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function SessionFormActions({ 
  formData, 
  isLoading, 
  onCancel, 
  onSubmit 
}: SessionFormActionsProps) {
  const isFormValid = formData.coachId && formData.clientId;

  return (
    <div className="flex items-center justify-end space-x-2 pt-6 border-t">
      <Button 
        type="button" 
        variant="outline" 
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button 
        type="submit" 
        disabled={isLoading || !isFormValid}
        onClick={onSubmit}
      >
        <Calendar className="mr-2 h-4 w-4" />
        {isLoading ? 'Creating...' : 'Create Session'}
      </Button>
    </div>
  );
}