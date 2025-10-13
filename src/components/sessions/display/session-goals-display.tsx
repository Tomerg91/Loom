import { CheckCircle } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SessionGoalsDisplayProps {
  goals?: string[];
}

export function SessionGoalsDisplay({ goals }: SessionGoalsDisplayProps) {
  if (!goals || goals.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Goals</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {goals.map((goal, index) => (
            <li key={index} className="flex items-start">
              <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-primary" />
              <span className="text-sm">{goal}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}