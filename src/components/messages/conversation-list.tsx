'use client';

import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { MessageCircle, Users } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  onConversationSelect: (conversationId: string) => void;
  selectedConversationId: string | null;
  className?: string;
}

export function ConversationList({
  conversations,
  isLoading,
  onConversationSelect,
  selectedConversationId,
  className,
}: ConversationListProps) {
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMM d');
    }
  };

  const getConversationTitle = (conversation: Conversation) => {
    if (conversation.title) {
      return conversation.title;
    }
    
    if (conversation.participants.length > 0) {
      const participant = conversation.participants[0];
      return `${participant.firstName} ${participant.lastName}`;
    }
    
    return 'Unknown Conversation';
  };

  const getConversationSubtitle = (conversation: Conversation) => {
    if (conversation.participants.length > 0) {
      const participant = conversation.participants[0];
      return participant.role === 'coach' ? 'Coach' : 'Client';
    }
    return '';
  };

  const getLastMessagePreview = (conversation: Conversation) => {
    const lastMessage = conversation.lastMessage;
    if (!lastMessage) return 'No messages yet';
    
    if (lastMessage.type === 'file') {
      return '📎 File attachment';
    }
    
    return lastMessage.content || 'Message';
  };

  if (isLoading) {
    return (
      <div className={cn("flex flex-col", className)}>
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                  <div className="h-3 bg-muted rounded w-12" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-medium mb-2">No conversations yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Start a new conversation to connect with coaches or clients.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {conversations.map((conversation) => (
            <button
              key={conversation.id}
              onClick={() => onConversationSelect(conversation.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted/50",
                selectedConversationId === conversation.id && "bg-muted"
              )}
            >
              {/* Avatar */}
              <div className="relative">
                {conversation.type === 'group' ? (
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                ) : (
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.participants[0]?.avatarUrl} />
                    <AvatarFallback>
                      {conversation.participants[0]?.firstName?.[0]}
                      {conversation.participants[0]?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                {/* Online status indicator */}
                {conversation.type === 'direct' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
                )}
              </div>

              {/* Conversation details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium truncate pr-2">
                    {getConversationTitle(conversation)}
                  </h3>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {conversation.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatMessageTime(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                    {conversation.unreadCount > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center text-xs p-0 min-w-[20px]">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <p className={cn(
                    "text-sm truncate flex-1",
                    conversation.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"
                  )}>
                    {getLastMessagePreview(conversation)}
                  </p>
                  
                  {conversation.type === 'direct' && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                      {getConversationSubtitle(conversation)}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}