import { CheckCircle, BookOpen, MessageSquare } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


import { Goal} from '../shared/types';
import { getPriorityColor, getStatusColor } from '../shared/utils';

interface ProgressListProps {
  goals: Goal[];
  formattedDates: Record<string, string>;
}

export function ProgressList({ goals, formattedDates }: ProgressListProps) {
  return (
    <div className="space-y-4">
      {goals.map((goal) => (
        <Card key={goal.id} className={`border-l-4 ${getPriorityColor(goal.priority)}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{goal.title}</CardTitle>
                <CardDescription>{goal.description}</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(goal.status)}>
                  {goal.status.replace('_', ' ')}
                </Badge>
                <Badge variant="outline">{goal.category}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">{goal.progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${goal.progress}%` }}
                />
              </div>
            </div>

            {/* Target Date */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target Date:</span>
              <span className="font-medium">{formattedDates[`goal-${goal.id}-target`]}</span>
            </div>

            {/* Milestones */}
            <div>
              <h4 className="text-sm font-medium mb-2">Milestones</h4>
              <div className="space-y-2">
                {goal.milestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      milestone.completed ? 'bg-primary border-primary' : 'border-muted-foreground'
                    }`}>
                      {milestone.completed && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-sm ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {milestone.title}
                    </span>
                    {milestone.completedDate && (
                      <span className="text-xs text-muted-foreground">
                        {formattedDates[`milestone-${milestone.id}`]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline">
                <BookOpen className="mr-2 h-4 w-4" />
                View Details
              </Button>
              <Button size="sm" variant="outline">
                <MessageSquare className="mr-2 h-4 w-4" />
                Discuss with Coach
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}