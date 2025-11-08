'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { MessageReaction } from '@/types';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReactionClick: (emoji: string) => void;
  currentUserId?: string;
  className?: string;
}

const QUICK_REACTIONS = [
  '👍', '👎', '❤️', '😂', '😮', '😢', '🎉', '🔥'
];

export function MessageReactions({
  reactions,
  onReactionClick,
  currentUserId,
  className,
}: MessageReactionsProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = {
        emoji: reaction.emoji,
        count: 0,
        users: [],
        hasUserReacted: false,
      };
    }
    
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user);
    
    if (reaction.userId === currentUserId) {
      acc[reaction.emoji].hasUserReacted = true;
    }
    
    return acc;
  }, {} as Record<string, {
    emoji: string;
    count: number;
    users: unknown[];
    hasUserReacted: boolean;
  }>);

  const reactionGroups = Object.values(groupedReactions);

  if (reactionGroups.length === 0) {
    return null;
  }

  const getTooltipText = (users: unknown[]) => {
    if (users.length === 1) {
      return `${users[0].firstName} ${users[0].lastName}`;
    } else if (users.length === 2) {
      return `${users[0].firstName} ${users[0].lastName} and ${users[1].firstName} ${users[1].lastName}`;
    } else if (users.length === 3) {
      return `${users[0].firstName} ${users[0].lastName}, ${users[1].firstName} ${users[1].lastName} and ${users[2].firstName} ${users[2].lastName}`;
    } else {
      return `${users[0].firstName} ${users[0].lastName}, ${users[1].firstName} ${users[1].lastName} and ${users.length - 2} others`;
    }
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {/* Existing reactions */}
      {reactionGroups.map((group) => (
        <Button
          key={group.emoji}
          variant={group.hasUserReacted ? "default" : "outline"}
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={() => onReactionClick(group.emoji)}
          title={getTooltipText(group.users)}
        >
          <span className="mr-1">{group.emoji}</span>
          <span>{group.count}</span>
        </Button>
      ))}

      {/* Add reaction button */}
      <Popover open={showReactionPicker} onOpenChange={setShowReactionPicker}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="center">
          <div className="grid grid-cols-8 gap-1">
            {QUICK_REACTIONS.map(emoji => (
              <Button
                key={emoji}
                variant="ghost"
                size="sm"
                className="p-1 h-8 w-8 text-base hover:scale-110 transition-transform"
                onClick={() => {
                  onReactionClick(emoji);
                  setShowReactionPicker(false);
                }}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}