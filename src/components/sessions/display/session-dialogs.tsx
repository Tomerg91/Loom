import { Star } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface SessionDialogsProps {
  isCompleteDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  isLoading: boolean;
  onCompleteDialogClose: () => void;
  onDeleteDialogClose: () => void;
  onComplete: (data: { notes: string; rating: number }) => void;
  onDelete: () => void;
}

export function SessionDialogs({
  isCompleteDialogOpen,
  isDeleteDialogOpen,
  isLoading,
  onCompleteDialogClose,
  onDeleteDialogClose,
  onComplete,
  onDelete,
}: SessionDialogsProps) {
  const [sessionNotes, setSessionNotes] = useState('');
  const [sessionRating, setSessionRating] = useState(0);

  const handleComplete = () => {
    onComplete({ notes: sessionNotes, rating: sessionRating });
    setSessionNotes('');
    setSessionRating(0);
  };

  return (
    <>
      {/* Complete Session Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={onCompleteDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Session</DialogTitle>
            <DialogDescription>
              Mark this session as completed and add your notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sessionNotes">Session Notes</Label>
              <Textarea
                id="sessionNotes"
                placeholder="Add notes about the session..."
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div>
              <Label>Session Rating</Label>
              <div className="flex items-center space-x-1 mt-1">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setSessionRating(rating)}
                    className="focus:outline-none"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        rating <= sessionRating 
                          ? 'text-yellow-500 fill-yellow-500' 
                          : 'text-gray-300 hover:text-yellow-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onCompleteDialogClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleComplete}
              disabled={isLoading}
            >
              Complete Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Session Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={onDeleteDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this session? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onDeleteDialogClose}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={onDelete}
              disabled={isLoading}
            >
              Delete Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}