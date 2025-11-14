'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Search,
  Trash2,
  Archive,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  Users,
} from 'lucide-react';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/toast-provider';

interface RetentionStats {
  total_messages: number;
  active_messages: number;
  archived_messages: number;
  messages_pending_archive: number;
  oldest_message_date: string;
  newest_message_date: string;
}

interface RetentionPolicy {
  id: string;
  policy_name: string;
  retention_days: number;
  apply_to_conversation_type: string | null;
  auto_delete: boolean;
  auto_archive: boolean;
  description: string;
  is_active: boolean;
}

export function MessageModerationPanel() {
  const [search, setSearch] = useState('');
  const [selectedTab, setSelectedTab] = useState('overview');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch retention stats
  const { data: retentionData, isLoading: loadingStats } = useQuery({
    queryKey: ['admin', 'messages', 'retention'],
    queryFn: async () => {
      const response = await fetch('/api/admin/messages/retention');
      if (!response.ok) throw new Error('Failed to fetch retention data');
      return response.json() as Promise<{
        stats: RetentionStats;
        policies: RetentionPolicy[];
      }>;
    },
  });

  // Fetch messages
  const { data: messagesData, isLoading: loadingMessages } = useQuery({
    queryKey: ['admin', 'messages', page, search, selectedTab],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
        ...(selectedTab === 'archived' && { onlyArchived: 'true' }),
      });

      const response = await fetch(`/api/admin/messages?${params}`);
      if (!response.ok) throw new Error('Failed to fetch messages');
      return response.json();
    },
  });

  // Delete message mutation
  const deleteMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await fetch(`/api/admin/messages?messageId=${messageId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete message');
      return response.json();
    },
    onSuccess: () => {
      toast.success('Success', 'Message deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] });
    },
    onError: (error: Error) => {
      toast.error('Error', error.message || 'Failed to delete message');
    },
  });

  // Archive messages mutation
  const archiveMutation = useMutation({
    mutationFn: async (policyName: string) => {
      const response = await fetch('/api/admin/messages/retention/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policyName }),
      });
      if (!response.ok) throw new Error('Failed to archive messages');
      return response.json();
    },
    onSuccess: (data) => {
      toast.success(
        'Success',
        `Archived ${data.archivedCount} messages in ${data.conversationIds?.length || 0} conversations`
      );
      queryClient.invalidateQueries({ queryKey: ['admin', 'messages'] });
    },
    onError: (error: Error) => {
      toast.error('Error', error.message || 'Failed to archive messages');
    },
  });

  const stats = retentionData?.stats;
  const policies = retentionData?.policies || [];
  const messages = messagesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Overview Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.total_messages?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.active_messages?.toLocaleString() || 0} active
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Archived</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.archived_messages?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {((stats?.archived_messages || 0) / (stats?.total_messages || 1) * 100).toFixed(1)}% of total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Archive</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.messages_pending_archive?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Messages past retention
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oldest Message</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.oldest_message_date
                    ? Math.floor(
                        (Date.now() - new Date(stats.oldest_message_date).getTime()) /
                          (1000 * 60 * 60 * 24)
                      )
                    : 0}d
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.oldest_message_date
                    ? format(new Date(stats.oldest_message_date), 'MMM d, yyyy')
                    : 'N/A'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Retention Policies */}
      <Card>
        <CardHeader>
          <CardTitle>Retention Policies</CardTitle>
          <CardDescription>Active message retention and archival policies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {policies.map((policy) => (
              <div
                key={policy.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{policy.policy_name}</h4>
                    {policy.is_active && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {policy.description}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Retention: {policy.retention_days} days</span>
                    {policy.apply_to_conversation_type && (
                      <span>Type: {policy.apply_to_conversation_type}</span>
                    )}
                    {policy.auto_archive && <span>Auto-archive enabled</span>}
                    {policy.auto_delete && <span>Auto-delete enabled</span>}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => archiveMutation.mutate(policy.policy_name)}
                  disabled={archiveMutation.isPending}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Run Now
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Messages</CardTitle>
              <CardDescription>View and moderate all messages</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="overview">Active</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-4">
              {loadingMessages ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No messages found</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sender</TableHead>
                        <TableHead>Content</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {messages.map((message: any) => (
                        <TableRow key={message.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={message.sender?.avatar_url} />
                                <AvatarFallback>
                                  {message.sender?.first_name?.[0]}
                                  {message.sender?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium text-sm">
                                  {message.sender?.first_name} {message.sender?.last_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {message.sender?.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate">{message.content}</div>
                            {message.is_edited && (
                              <span className="text-xs text-muted-foreground">(edited)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{message.type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(message.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {message.is_archived ? (
                                <Badge variant="secondary">
                                  <Archive className="h-3 w-3 mr-1" />
                                  Archived
                                </Badge>
                              ) : (
                                <Badge variant="default">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Active
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(message.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}

              {/* Pagination */}
              {messagesData && messagesData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {page} of {messagesData.pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= messagesData.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
