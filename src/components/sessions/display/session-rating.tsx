import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

interface SessionRatingProps {
  rating?: number;
  feedback?: string;
}

export function SessionRating({ rating, feedback }: SessionRatingProps) {
  if (!rating) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Rating</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-1 mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-4 w-4 ${
                i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
              }`}
            />
          ))}
          <span className="ml-2 text-sm font-medium">{rating}/5</span>
        </div>
        {feedback && (
          <p className="text-sm text-muted-foreground italic">&quot;{feedback}&quot;</p>
        )}
      </CardContent>
    </Card>
  );
}