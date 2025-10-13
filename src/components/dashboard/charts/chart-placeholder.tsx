import { LucideIcon } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ChartPlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  height?: string;
  message?: string;
  submessage?: string;
}

export function ChartPlaceholder({ 
  title, 
  description, 
  icon: Icon, 
  height = "h-64",
  message = "Chart visualization would go here",
  submessage = "Integration with charting library needed"
}: ChartPlaceholderProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`${height} flex items-center justify-center bg-muted/20 rounded-lg`}>
          <div className="text-center">
            <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{message}</p>
            <p className="text-xs text-muted-foreground">{submessage}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}