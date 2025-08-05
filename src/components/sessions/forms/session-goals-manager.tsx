import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  X,
  Plus,
} from 'lucide-react';
import { SessionFormData, SessionFormField } from '@/types';

interface SessionGoalsManagerProps {
  formData: SessionFormData;
  onFieldChange: (field: SessionFormField, value: string | number | string[]) => void;
}

export function SessionGoalsManager({ formData, onFieldChange }: SessionGoalsManagerProps) {
  const [newGoal, setNewGoal] = useState('');

  const addGoal = () => {
    if (newGoal.trim()) {
      onFieldChange('goals', [...formData.goals, newGoal.trim()]);
      setNewGoal('');
    }
  };

  const removeGoal = (index: number) => {
    onFieldChange('goals', formData.goals.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addGoal();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Goals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
            placeholder="Add a goal for this session"
            onKeyPress={handleKeyPress}
          />
          <Button type="button" onClick={addGoal} variant="outline" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {formData.goals.map((goal, index) => (
            <div key={index} className="flex items-center justify-between p-2 border rounded">
              <span className="text-sm">{goal}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeGoal(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {formData.goals.length === 0 && (
          <p className="text-sm text-muted-foreground">No goals added yet.</p>
        )}
      </CardContent>
    </Card>
  );
}