import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ClientProgress } from '../shared/types';

interface ClientProgressOverviewProps {
  clientProgress: ClientProgress[];
}

export function ClientProgressOverview({ clientProgress }: ClientProgressOverviewProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Progress Overview</CardTitle>
        <CardDescription>Track your clients' progress and achievements</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {clientProgress.map((client) => (
            <div key={client.clientId} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getTrendIcon(client.trend)}
                  <div>
                    <p className="font-medium">{client.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.sessionsCompleted} sessions completed
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <div className="text-center">
                  <p className="font-medium">{client.progressScore}%</p>
                  <p className="text-muted-foreground">Progress</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{client.goalAchievement}%</p>
                  <p className="text-muted-foreground">Goals</p>
                </div>
                <div className="text-center">
                  <p className="font-medium">{new Date(client.lastSession).toLocaleDateString()}</p>
                  <p className="text-muted-foreground">Last Session</p>
                </div>
                <Badge variant={client.trend === 'up' ? 'default' : client.trend === 'down' ? 'destructive' : 'secondary'}>
                  {client.trend === 'up' ? 'Improving' : client.trend === 'down' ? 'Declining' : 'Stable'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}