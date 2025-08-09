'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useUser } from '@/lib/store/auth-store';
import { cn } from '@/lib/utils';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Users, 
  MessageCircle,
  X
} from 'lucide-react';
import type { User } from '@/types';

interface ContactSearchProps {
  onSelect: (userId: string) => void;
  onClose: () => void;
}

interface ContactsResponse {
  data: User[];
  pagination: {
    total: number;
  };
}

export function ContactSearch({ onSelect, onClose }: ContactSearchProps) {
  const user = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch potential contacts based on user role
  const { data: contactsData, isLoading, error } = useQuery({
    queryKey: ['contacts', user?.id, debouncedQuery],
    queryFn: async (): Promise<ContactsResponse> => {
      const params = new URLSearchParams({
        limit: '20',
        ...(debouncedQuery && { search: debouncedQuery }),
      });

      // Fetch coaches if user is client, clients if user is coach
      const endpoint = user?.role === 'client' ? '/api/coaches' : '/api/coach/clients';
      const response = await fetch(`${endpoint}?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch contacts');
      }
      
      return response.json();
    },
    enabled: !!user?.id,
  });

  const contacts = contactsData?.data || [];

  const handleSelect = (contactId: string) => {
    onSelect(contactId);
  };

  const getContactRoleBadge = (contact: User) => {
    if (contact.role === 'coach') {
      return (
        <Badge variant="secondary" className="text-xs">
          Coach
        </Badge>
      );
    } else if (contact.role === 'client') {
      return (
        <Badge variant="outline" className="text-xs">
          Client
        </Badge>
      );
    }
    return null;
  };

  const getEmptyStateContent = () => {
    if (searchQuery && contacts.length === 0 && !isLoading) {
      return (
        <div className="text-center py-8">
          <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium mb-2">No contacts found</h3>
          <p className="text-sm text-muted-foreground">
            Try searching with a different name or email
          </p>
        </div>
      );
    }

    if (!searchQuery && contacts.length === 0 && !isLoading) {
      const roleText = user?.role === 'client' ? 'coaches' : 'clients';
      return (
        <div className="text-center py-8">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium mb-2">No {roleText} available</h3>
          <p className="text-sm text-muted-foreground">
            {user?.role === 'client' 
              ? 'You haven\'t been assigned any coaches yet.'
              : 'You don\'t have any clients yet.'
            }
          </p>
        </div>
      );
    }

    return (
      <div className="text-center py-8">
        <MessageCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="font-medium mb-2">Start a conversation</h3>
        <p className="text-sm text-muted-foreground">
          Search for {user?.role === 'client' ? 'coaches' : 'clients'} to start messaging
        </p>
      </div>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>New Conversation</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${user?.role === 'client' ? 'coaches' : 'clients'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          {/* Results */}
          <div className="min-h-[300px] max-h-[400px]">
            {isLoading ? (
              <div className="space-y-3 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-2">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-destructive mb-2">Failed to load contacts</div>
                <p className="text-sm text-muted-foreground">{error.message}</p>
              </div>
            ) : contacts.length > 0 ? (
              <ScrollArea className="h-full">
                <div className="space-y-1 p-1">
                  {contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelect(contact.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors hover:bg-muted"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={contact.avatarUrl} />
                        <AvatarFallback>
                          {contact.firstName?.[0]}
                          {contact.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">
                            {contact.firstName} {contact.lastName}
                          </h3>
                          {getContactRoleBadge(contact)}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {contact.email}
                        </p>
                      </div>

                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              getEmptyStateContent()
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end pt-2 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}