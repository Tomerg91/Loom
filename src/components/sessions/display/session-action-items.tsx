import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SessionActionItemsProps {
  actionItems?: string[];
}

export function SessionActionItems({ actionItems }: SessionActionItemsProps) {
  if (!actionItems || actionItems.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Action Items</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {actionItems.map((item, index) => (
            <li key={index} className="flex items-start">
              <div className="w-4 h-4 mr-2 mt-0.5 border-2 border-muted-foreground rounded-sm"></div>
              <span className="text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}