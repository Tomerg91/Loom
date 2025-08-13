'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTypingIndicators } from '@/lib/realtime/hooks';
import { OptimizedThumbnailImage } from '@/components/ui/optimized-image';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Send, 
  Paperclip, 
  Smile, 
  Bold, 
  Italic, 
  X,
  File,
  Image as ImageIcon
} from 'lucide-react';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/components/ui/toast-provider';

interface MessageComposerProps {
  conversationId: string;
  replyTo?: {
    id: string;
    content: string;
    sender: {
      firstName: string;
      lastName: string;
    };
  };
  onReplyCancel?: () => void;
}

interface FilePreview {
  file: File;
  url: string;
  type: 'image' | 'document';
}

const EMOJI_SHORTCUTS = [
  { emoji: '😊', shortcut: ':)' },
  { emoji: '😢', shortcut: ':(' },
  { emoji: '😂', shortcut: ':D' },
  { emoji: '👍', shortcut: ':thumbs:' },
  { emoji: '❤️', shortcut: ':heart:' },
  { emoji: '🎉', shortcut: ':party:' },
  { emoji: '🔥', shortcut: ':fire:' },
  { emoji: '💯', shortcut: ':100:' },
];

const COMMON_EMOJIS = [
  '😊', '😂', '😍', '🤔', '😢', '😮', '👍', '👎',
  '❤️', '🎉', '🔥', '💯', '⚡', '✨', '🚀', '💪'
];

export function MessageComposer({ 
  conversationId, 
  replyTo, 
  onReplyCancel 
}: MessageComposerProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<FilePreview[]>([]);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  const toast = useToast();
  const { setTyping } = useTypingIndicators(conversationId);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, []);

  // Handle typing indicators
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleTyping = useCallback(() => {
    setTyping(true);
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      setTyping(false);
    }, 3000);
    
    setTypingTimeout(newTimeout);
  }, [setTyping, typingTimeout]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: {
      content: string;
      replyToId?: string;
      attachments?: any[];
    }) => {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversationId,
          ...messageData,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }

      return response.json();
    },
    onSuccess: () => {
      // Clear composer
      setMessage('');
      setAttachments([]);
      if (onReplyCancel) onReplyCancel();
      
      // Stop typing indicator
      setTyping(false);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      
      // Invalidate messages query to refetch
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error: Error) => {
      console.error('Failed to send message:', error);
      toast.error('Error', error.message || 'Failed to send message');
    },
    onSettled: () => {
      setIsSending(false);
    },
  });

  // Handle message send
  const handleSend = useCallback(() => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage && attachments.length === 0) {
      return;
    }
    
    setIsSending(true);
    
    // Convert attachments to format expected by API
    const attachmentData = attachments.map(attachment => ({
      fileName: attachment.file.name,
      fileSize: attachment.file.size,
      fileType: attachment.file.type,
      attachmentType: attachment.type,
      url: attachment.url, // This would be uploaded URL in real implementation
    }));
    
    sendMessageMutation.mutate({
      content: trimmedMessage,
      replyToId: replyTo?.id,
      attachments: attachmentData.length > 0 ? attachmentData : undefined,
    });
  }, [message, attachments, replyTo?.id, sendMessageMutation]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    
    // Bold text with Ctrl+B
    if (e.key === 'b' && e.ctrlKey) {
      e.preventDefault();
      insertFormattingAtCursor('**', '**');
    }
    
    // Italic text with Ctrl+I
    if (e.key === 'i' && e.ctrlKey) {
      e.preventDefault();
      insertFormattingAtCursor('*', '*');
    }
  };

  // Insert formatting at cursor position
  const insertFormattingAtCursor = (before: string, after: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = message.substring(start, end);
    
    const newText = message.substring(0, start) + before + selectedText + after + message.substring(end);
    
    setMessage(newText);
    
    // Set cursor position after formatting
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + before.length + selectedText.length + after.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    files.forEach(file => {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Error', `File ${file.name} is too large. Maximum size is 10MB.`);
        return;
      }
      
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('image/') ? 'image' : 'document';
      
      setAttachments(prev => [...prev, { file, url, type }]);
    });
    
    // Reset file input
    e.target.value = '';
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].url);
      updated.splice(index, 1);
      return updated;
    });
  };

  // Insert emoji
  const insertEmoji = (emoji: string) => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    const newText = message.substring(0, start) + emoji + message.substring(end);
    setMessage(newText);
    
    // Set cursor position after emoji
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = start + emoji.length;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
      }
    }, 0);
    
    setIsEmojiOpen(false);
  };

  // Auto-replace emoji shortcuts
  useEffect(() => {
    EMOJI_SHORTCUTS.forEach(({ shortcut, emoji }) => {
      if (message.endsWith(shortcut)) {
        setMessage(prev => prev.slice(0, -shortcut.length) + emoji);
      }
    });
  }, [message]);

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
    
    if (e.target.value.trim()) {
      handleTyping();
    } else {
      setTyping(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      attachments.forEach(attachment => {
        URL.revokeObjectURL(attachment.url);
      });
      
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [attachments, typingTimeout]);

  return (
    <div className="border-t bg-background p-4">
      {/* Reply context */}
      {replyTo && (
        <div className="mb-3 p-2 bg-muted/50 border-l-2 border-primary rounded flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">
              Replying to {replyTo.sender.firstName} {replyTo.sender.lastName}
            </div>
            <div className="text-sm truncate">{replyTo.content}</div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReplyCancel}
            className="ml-2 p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* File attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative bg-muted rounded-lg p-2 flex items-center gap-2 max-w-xs"
            >
              {attachment.type === 'image' ? (
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  <OptimizedThumbnailImage
                    src={attachment.url}
                    alt={attachment.file.name}
                    size={32}
                  />
                </div>
              ) : (
                <File className="h-4 w-4 text-muted-foreground" />
              )}
              
              <span className="text-sm font-medium truncate max-w-[150px]">
                {attachment.file.name}
              </span>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeAttachment(index)}
                className="absolute -top-1 -right-1 h-5 w-5 p-0 bg-destructive text-destructive-foreground rounded-full"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Message input area */}
      <div className="flex items-end gap-2">
        {/* Formatting and attachment buttons */}
        <div className="flex items-center gap-1 pb-2">
          {/* File attachment */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="p-2"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/*,application/pdf,.doc,.docx,.txt"
            onChange={handleFileSelect}
          />

          {/* Emoji picker */}
          <Popover open={isEmojiOpen} onOpenChange={setIsEmojiOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Smile className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="grid grid-cols-8 gap-1">
                {COMMON_EMOJIS.map(emoji => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="sm"
                    className="p-1 h-8 w-8"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Text formatting */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormattingAtCursor('**', '**')}
            className="p-2"
            title="Bold (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => insertFormattingAtCursor('*', '*')}
            className="p-2"
            title="Italic (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>
        </div>

        {/* Message input */}
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="min-h-[40px] max-h-[120px] resize-none"
            disabled={isSending}
          />
        </div>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!message.trim() && attachments.length === 0 || isSending}
          className="mb-2 px-3"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Helper text */}
      <div className="text-xs text-muted-foreground mt-2">
        <strong>Ctrl+B</strong> for bold, <strong>Ctrl+I</strong> for italic, <strong>:)</strong> for 😊
      </div>
    </div>
  );
}