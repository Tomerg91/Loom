import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, Clock, Target } from 'lucide-react';

interface GoalData {
  goal: string;
  count: number;
  successRate: number;
}

interface GoalAnalysis {
  mostCommonGoals: GoalData[];
  achievementRate: number;
  averageTimeToGoal: number;
}

interface GoalAnalysisWidgetProps {
  goalAnalysis: GoalAnalysis;
}

export function GoalAnalysisWidget({ goalAnalysis }: GoalAnalysisWidgetProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Most Common Goals</CardTitle>
          <CardDescription>Goals your clients are working towards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {goalAnalysis.mostCommonGoals.map((goal, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                    <span className="text-sm font-medium text-primary">{goal.count}</span>
                  </div>
                  <span className="font-medium">{goal.goal}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">{goal.successRate}% success</span>
                  <Badge variant={goal.successRate >= 80 ? 'default' : goal.successRate >= 60 ? 'secondary' : 'outline'}>
                    {goal.successRate >= 80 ? 'High' : goal.successRate >= 60 ? 'Medium' : 'Low'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Goal Achievement Metrics</CardTitle>
          <CardDescription>Overall goal achievement statistics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Overall Achievement Rate</span>
              <span className="text-2xl font-bold">{goalAnalysis.achievementRate}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-3">
              <div 
                className="bg-primary h-3 rounded-full"
                style={{ width: `${goalAnalysis.achievementRate}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Average Time to Goal</span>
            </div>
            <span className="text-lg font-bold">{goalAnalysis.averageTimeToGoal} weeks</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <Award className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Goals Achieved</p>
              <p className="text-xl font-bold">
                {Math.round((goalAnalysis.achievementRate || 0) * (goalAnalysis.mostCommonGoals.reduce((sum, g) => sum + g.count, 0) || 0) / 100)}
              </p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Active Goals</p>
              <p className="text-xl font-bold">
                {goalAnalysis.mostCommonGoals.reduce((sum, g) => sum + g.count, 0) || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}