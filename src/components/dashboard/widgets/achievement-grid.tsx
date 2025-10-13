import { Award, Clock, Target } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Achievement } from '../shared/types';

interface AchievementGridProps {
  achievements: Achievement[];
  formattedDates: Record<string, string>;
  totalAchievements?: number;
  streakDays?: number;
  completedGoals?: number;
}

export function AchievementGrid({ 
  achievements, 
  formattedDates,
  totalAchievements,
  streakDays,
  completedGoals
}: AchievementGridProps) {
  return (
    <div className="space-y-6">
      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {achievements.map((achievement) => (
          <Card key={achievement.id} className="text-center">
            <CardHeader>
              <div className="text-4xl mb-2">{achievement.icon}</div>
              <CardTitle className="text-lg">{achievement.title}</CardTitle>
              <CardDescription>{achievement.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge variant="outline">{achievement.category}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formattedDates[`achievement-${achievement.id}`]}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Achievement Statistics */}
      {(totalAchievements !== undefined || streakDays !== undefined || completedGoals !== undefined) && (
        <Card>
          <CardHeader>
            <CardTitle>Achievement Statistics</CardTitle>
            <CardDescription>Your milestone journey</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {totalAchievements !== undefined && (
                <div className="text-center p-4 border rounded-lg">
                  <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{totalAchievements}</p>
                  <p className="text-sm text-muted-foreground">Total Achievements</p>
                </div>
              )}
              {streakDays !== undefined && (
                <div className="text-center p-4 border rounded-lg">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{streakDays}</p>
                  <p className="text-sm text-muted-foreground">Day Streak</p>
                </div>
              )}
              {completedGoals !== undefined && (
                <div className="text-center p-4 border rounded-lg">
                  <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">{completedGoals}</p>
                  <p className="text-sm text-muted-foreground">Goals Completed</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}