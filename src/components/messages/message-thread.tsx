'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';
import { 
  MessageCircle, 
  File, 
  Image as ImageIcon, 
  Reply, 
  MoreVertical,
  Check,
  CheckCheck,
  Download
} from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OptimizedThumbnailImage } from '@/components/ui/optimized-image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useUser } from '@/lib/auth/use-user';
import { useRealtimeMessages, useTypingIndicators } from '@/lib/realtime/hooks';
import { cn } from '@/lib/utils';
import type { Message, MessageReaction } from '@/types';

import { MessageReactions } from './message-reactions';

interface MessageThreadProps {
  conversationId: string;
  className?: string;
}

interface MessagesResponse {
  data: Message[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    before?: string;
  };
}

export function MessageThread({ conversationId, className }: MessageThreadProps) {
  const user = useUser();
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Enable real-time message updates
  useRealtimeMessages(conversationId);
  
  // Get typing indicators
  const { typingUsers } = useTypingIndicators(conversationId);

  // Fetch messages
  const { 
    data: messagesData, 
    isLoading, 
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ['messages', conversationId],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      const params = new URLSearchParams({
        limit: '50',
        ...(pageParam && { before: pageParam }),
      });
      
      const response = await fetch(`/api/messages/${conversationId}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json() as Promise<MessagesResponse>;
    },
    enabled: !!conversationId,
    refetchInterval: false, // Real-time updates handle this
    getNextPageParam: (lastPage) => {
      return lastPage.pagination.hasNext ? lastPage.pagination.before : undefined;
    },
    initialPageParam: undefined,
  });

  const messages = messagesData?.pages.flatMap(page => page.data) || [];

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll]);

  // Handle scroll to detect if user scrolled up
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    setAutoScroll(isAtBottom);
  }, []);

  // Format message timestamp
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    
    messages.forEach((message) => {
      const messageDate = format(new Date(message.createdAt), 'yyyy-MM-dd');
      
      const existingGroup = groups.find(group => group.date === messageDate);
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groups.push({ date: messageDate, messages: [message] });
      }
    });
    
    return groups;
  };

  // Format date header
  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return format(date, 'MMMM d, yyyy');
    }
  };

  // Reaction mutation
  const reactionMutation = useMutation({
    mutationFn: async ({ messageId, emoji, action }: { 
      messageId: string; 
      emoji: string; 
      action: 'add' | 'remove';
    }) => {
      const url = `/api/messages/${conversationId}/${messageId}/reactions`;
      
      if (action === 'add') {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji }),
        });
        if (!response.ok) throw new Error('Failed to add reaction');
        return response.json();
      } else {
        const response = await fetch(`${url}?emoji=${encodeURIComponent(emoji)}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to remove reaction');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
    },
  });

  const handleReaction = (messageId: string, emoji: string) => {
    // Check if user already reacted with this emoji
    const message = messages.find(m => m.id === messageId);
    const existingReaction = message?.reactions?.find(r => r.emoji === emoji && r.userId === user?.id);
    
    reactionMutation.mutate({
      messageId,
      emoji,
      action: existingReaction ? 'remove' : 'add',
    });
  };

  // Render attachment
  const renderAttachment = (attachment: any) => {
    const isImage = attachment.attachmentType === 'image';
    
    return (
      <div key={attachment.id} className="border rounded-lg p-3 max-w-xs">
        <div className="flex items-center gap-2">
          {isImage ? (
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <File className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="text-sm font-medium truncate">{attachment.fileName}</span>
          <Button variant="ghost" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </div>
        
        {isImage && attachment.thumbnailUrl && (
          <OptimizedThumbnailImage
            src={attachment.thumbnailUrl}
            alt={attachment.fileName}
            className="mt-2 max-w-full h-auto"
            size={200}
          />
        )}
      </div>
    );
  };

  // Render message status
  const renderMessageStatus = (message: Message) => {
    if (message.senderId !== user?.id) return null;
    
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {message.status === 'sent' && <Check className="h-3 w-3" />}
        {message.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
        {message.status === 'read' && <CheckCheck className="h-3 w-3 text-blue-500" />}
        <span>{formatMessageTime(message.createdAt)}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={cn("flex flex-col", className)}>
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={cn("flex gap-3", i % 2 === 0 ? "justify-start" : "justify-end")}>
                {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
                <div className="max-w-xs space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className={cn("h-16 rounded-lg", i % 2 === 0 ? "w-48" : "w-32")} />
                </div>
                {i % 2 === 1 && <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center", className)}>
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">Failed to load messages</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(messages);

  return (
    <div className={cn("flex flex-col", className)}>
      <ScrollArea 
        ref={scrollAreaRef}
        className="flex-1"
        onScrollCapture={handleScroll}
      >
        <div className="p-4 space-y-4">
          {/* Load more messages button */}
          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading...' : 'Load older messages'}
              </Button>
            </div>
          )}

          {/* Message groups */}
          {messageGroups.map((group) => (
            <div key={group.date} className="space-y-4">
              {/* Date header */}
              <div className="flex items-center justify-center">
                <div className="bg-muted px-3 py-1 rounded-full text-xs text-muted-foreground">
                  {formatDateHeader(group.date)}
                </div>
              </div>

              {/* Messages for this date */}
              <div className="space-y-2">
                {group.messages.map((message, index) => {
                  const isOwn = message.senderId === user?.id;
                  const showAvatar = !isOwn && (
                    index === 0 || 
                    group.messages[index - 1].senderId !== message.senderId
                  );
                  
                  return (
                    <div key={message.id} className={cn("flex gap-3", isOwn ? "justify-end" : "justify-start")}>
                      {!isOwn && (
                        <div className="w-8 flex justify-center">
                          {showAvatar ? (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.sender.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {message.sender.firstName?.[0]}
                                {message.sender.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8" />
                          )}
                        </div>
                      )}

                      <div className={cn("max-w-[70%] space-y-1", isOwn && "flex flex-col items-end")}>
                        {/* Sender name and time */}
                        {showAvatar && !isOwn && (
                          <div className="text-xs text-muted-foreground">
                            {message.sender.firstName} {message.sender.lastName}
                          </div>
                        )}

                        {/* Reply context */}
                        {message.replyTo && (
                          <div className="text-xs text-muted-foreground border-l-2 border-muted pl-2 mb-1">
                            <div className="font-medium">
                              {message.replyTo.sender.firstName} {message.replyTo.sender.lastName}
                            </div>
                            <div className="truncate max-w-xs">
                              {message.replyTo.content}
                            </div>
                          </div>
                        )}

                        {/* Message content */}
                        <div className={cn(
                          "rounded-lg px-3 py-2 break-words",
                          isOwn 
                            ? "bg-primary text-primary-foreground" 
                            : "bg-muted"
                        )}>
                          {message.content && (
                            <div className="whitespace-pre-wrap">{message.content}</div>
                          )}
                          
                          {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {message.attachments.map(renderAttachment)}
                            </div>
                          )}

                          {message.isEdited && (
                            <div className="text-xs opacity-70 mt-1">(edited)</div>
                          )}
                        </div>

                        {/* Message reactions */}
                        {message.reactions && message.reactions.length > 0 && (
                          <MessageReactions
                            reactions={message.reactions}
                            onReactionClick={(emoji) => handleReaction(message.id, emoji)}
                            currentUserId={user?.id}
                          />
                        )}

                        {/* Message actions and status */}
                        <div className={cn(
                          "flex items-center gap-1",
                          isOwn ? "justify-end" : "justify-start"
                        )}>
                          {renderMessageStatus(message)}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align={isOwn ? "end" : "start"}>
                              <DropdownMenuItem onClick={() => {/* Handle reply */}}>
                                <Reply className="h-4 w-4 mr-2" />
                                Reply
                              </DropdownMenuItem>
                              {/* Add more actions */}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {isOwn && (
                        <div className="w-8 flex justify-center">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {user?.firstName?.[0]}
                              {user?.lastName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <div className="flex gap-3 items-center">
              <Avatar className="h-8 w-8">
                <AvatarImage src={typingUsers[0].avatarUrl} />
                <AvatarFallback className="text-xs">
                  {typingUsers[0].firstName?.[0]}
                  {typingUsers[0].lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-lg px-3 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}

          {messages.length === 0 && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No messages yet</p>
                <p className="text-sm text-muted-foreground">Start the conversation!</p>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
