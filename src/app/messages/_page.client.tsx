'use client';

// Extracted client page content to run under [locale] Providers
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useUser } from '@/lib/auth/use-user';
import { useQuery } from '@tanstack/react-query';
import { useRealtimeConversations } from '@/lib/realtime/hooks';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  MessageCircle, 
  Users, 
  Settings, 
  Archive,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConversationList } from '@/components/messages/conversation-list';
import { MessageThread } from '@/components/messages/message-thread';
import { MessageComposer } from '@/components/messages/message-composer';
import { ContactSearch } from '@/components/messages/contact-search';
import type { Conversation } from '@/types';

export default function MessagesClientPage() {
  const user = useUser();
  const searchParams = useSearchParams();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    searchParams?.get('conversation') || null
  );
  const [showContactSearch, setShowContactSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileView, setIsMobileView] = useState(false);

  // Enable real-time conversation updates
  useRealtimeConversations();

  // Fetch conversations
  const { data: conversationsData, isLoading, error } = useQuery({
    queryKey: ['conversations', user?.id, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: '50',
        ...(searchQuery && { search: searchQuery }),
      });
      
      const response = await fetch(`/api/messages?${params}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    },
    enabled: !!user?.id,
    refetchInterval: false, // Real-time updates handle this
  });

  const conversations = conversationsData?.data || [];
  const selectedConversation = conversations.find((c: Conversation) => c.id === selectedConversationId);

  // Handle mobile responsive view
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-select first conversation on desktop
  useEffect(() => {
    if (!isMobileView && conversations.length > 0 && !selectedConversationId) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId, isMobileView]);

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleBackToList = () => {
    setSelectedConversationId(null);
  };

  const handleNewConversation = (recipientId: string) => {
    setShowContactSearch(false);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">Please sign in to access messages.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground mb-2">Failed to load conversations</p>
          <p className="text-sm text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  // Mobile view
  if (isMobileView) {
    if (selectedConversation) {
      return (
        <div className="h-screen flex flex-col">
          <div className="p-4 border-b bg-background">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversation.participants[0]?.avatarUrl} />
                  <AvatarFallback>
                    {selectedConversation.participants[0]?.firstName?.[0]}
                    {selectedConversation.participants[0]?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {selectedConversation.participants[0]?.firstName} {selectedConversation.participants[0]?.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">Online now</div>
                </div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button variant="outline" size="sm">
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive conversation
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Conversation settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <MessageThread conversationId={selectedConversationId!} className="flex-1" />
            <MessageComposer conversationId={selectedConversationId!} />
          </div>
        </div>
      );
    }
    
    return (
      <div className="h-screen flex flex-col">
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Messages</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContactSearch(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <ConversationList
          conversations={conversations}
          isLoading={isLoading}
          onConversationSelect={handleConversationSelect}
          selectedConversationId={selectedConversationId}
          className="flex-1"
        />
        
        {showContactSearch && (
          <ContactSearch
            onSelect={handleNewConversation}
            onClose={() => setShowContactSearch(false)}
          />
        )}
      </div>
    );
  }

  // Desktop
  return (
    <div className="h-screen flex bg-background">
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Messages</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowContactSearch(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <ConversationList
          conversations={conversations}
          isLoading={isLoading}
          onConversationSelect={handleConversationSelect}
          selectedConversationId={selectedConversationId}
          className="flex-1"
        />
      </div>
      
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="flex items-center gap-4 p-4 border-b bg-background">
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConversation.participants[0]?.avatarUrl} />
                  <AvatarFallback>
                    {selectedConversation.participants[0]?.firstName?.[0]}
                    {selectedConversation.participants[0]?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
              </div>
              
              <div className="flex-1">
                <div className="font-medium">
                  {selectedConversation.participants[0]?.firstName} {selectedConversation.participants[0]?.lastName}
                </div>
                <div className="text-xs text-muted-foreground">Online now</div>
              </div>
              
              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                <Button variant="outline" size="sm">
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Archive className="h-4 w-4 mr-2" />
                      Archive conversation
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="h-4 w-4 mr-2" />
                      Conversation settings
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex-1 flex flex-col min-h-0">
              <MessageThread conversationId={selectedConversationId!} className="flex-1" />
              <MessageComposer conversationId={selectedConversationId!} />
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Select a conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

