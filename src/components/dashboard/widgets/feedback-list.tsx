import { Star } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Feedback } from '../shared/types';

interface FeedbackListProps {
  feedback: Feedback[];
}

export function FeedbackList({ feedback }: FeedbackListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Client Feedback</CardTitle>
        <CardDescription>Latest reviews and comments from your clients</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {feedback.map((feedback, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div>
                    <p className="font-medium">{feedback.clientName}</p>
                    <p className="text-sm text-muted-foreground">{feedback.sessionType}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < feedback.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(feedback.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <blockquote className="text-sm italic border-l-4 border-primary/20 pl-4">
                "{feedback.comment}"
              </blockquote>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}