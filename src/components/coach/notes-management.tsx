'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Tag,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api/client-api-request';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CoachNote, PrivacyLevel } from '@/types';

// Validation schema for notes
const noteSchema = z.object({
  clientId: z.string().min(1, 'Client selection is required'),
  sessionId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(100),
  content: z.string().min(1, 'Content is required').max(10000),
  privacyLevel: z.enum(['private', 'shared_with_client']),
  tags: z.array(z.string()).optional(),
});

type NoteFormData = z.infer<typeof noteSchema>;

interface NotesManagementProps {
  clientId?: string;
  sessionId?: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
}

interface Session {
  id: string;
  title: string;
  scheduledAt: string;
}

interface NotesResponse {
  data: CoachNote[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function NotesManagement({ clientId: initialClientId, sessionId: initialSessionId }: NotesManagementProps) {
  const t = useTranslations('coach');
  const commonT = useTranslations('common');
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<CoachNote | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search term with 300ms delay
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);
  const [privacyFilter, setPrivacyFilter] = useState<PrivacyLevel | 'all'>('all');
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteSchema),
    defaultValues: {
      clientId: initialClientId || '',
      sessionId: initialSessionId || '',
      privacyLevel: 'private',
    },
  });

  const watchedClientId = watch('clientId');

  // Fetch clients
  const { data: clients } = useQuery({
    queryKey: ['coach-clients'],
    queryFn: async (): Promise<Client[]> => {
      const data = await apiGet<{ data: Client[] }>('/api/users?role=client&limit=50');
      return data.data;
    },
  });

  // Fetch sessions for selected client
  const { data: sessions } = useQuery({
    queryKey: ['client-sessions', watchedClientId],
    queryFn: async (): Promise<Session[]> => {
      if (!watchedClientId) return [];
      const data = await apiGet<{ data: Session[] }>(`/api/sessions?clientId=${watchedClientId}&limit=20`);
      return data.data;
    },
    enabled: !!watchedClientId,
  });

  // Fetch all available tags
  const { data: availableTags } = useQuery({
    queryKey: ['coach-notes-tags'],
    queryFn: async (): Promise<string[]> => {
      const data = await apiGet<{ data: string[] }>('/api/notes/tags');
      return data.data || [];
    },
  });

  // Fetch notes
  const { data: notesData, isLoading } = useQuery({
    queryKey: ['coach-notes', selectedClientId, debouncedSearchTerm, privacyFilter, selectedTags],
    queryFn: async (): Promise<NotesResponse> => {
      const params = new URLSearchParams({
        limit: '20',
        sortBy: 'created_at',
        sortOrder: 'desc',
      });

      if (selectedClientId) {
        params.append('clientId', selectedClientId);
      }
      if (privacyFilter !== 'all') {
        params.append('privacyLevel', privacyFilter);
      }
      if (debouncedSearchTerm) {
        params.append('search', debouncedSearchTerm);
      }
      if (selectedTags.length > 0) {
        params.append('tags', selectedTags.join(','));
      }

      return await apiGet<NotesResponse>(`/api/notes?${params}`);
    },
  });

  // Create/Update note mutation
  const saveNoteMutation = useMutation({
    mutationFn: async (formData: NoteFormData) => {
      const payload = {
        ...formData,
        tags: formData.tags?.filter(tag => tag.trim()) || [],
      };

      if (editingNote) {
        return await apiPut(`/api/notes/${editingNote.id}`, payload);
      } else {
        return await apiPost('/api/notes', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-notes'] });
      setIsDialogOpen(false);
      setEditingNote(null);
      reset();
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      await apiDelete(`/api/notes/${noteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach-notes'] });
    },
  });

  const onSubmit = (data: NoteFormData) => {
    saveNoteMutation.mutate(data);
  };

  const handleEdit = (note: CoachNote) => {
    setEditingNote(note);
    setValue('clientId', note.clientId);
    setValue('sessionId', note.sessionId || '');
    setValue('title', note.title);
    setValue('content', note.content);
    setValue('privacyLevel', note.privacyLevel);
    setValue('tags', note.tags || []);
    setIsDialogOpen(true);
  };

  const handleDelete = (noteId: string) => {
    if (confirm(t('confirmDeleteNote'))) {
      deleteNoteMutation.mutate(noteId);
    }
  };

  const handleAddNew = () => {
    setEditingNote(null);
    reset({
      clientId: selectedClientId || '',
      sessionId: '',
      privacyLevel: 'private',
    });
    setIsDialogOpen(true);
  };

  const getPrivacyIcon = (privacyLevel: PrivacyLevel) => {
    return privacyLevel === 'private' ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />;
  };

  const getPrivacyColor = (privacyLevel: PrivacyLevel) => {
    return privacyLevel === 'private' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800';
  };

  // Highlight search terms in content
  const highlightSearchTerm = (content: string, searchTerm: string) => {
    if (!searchTerm || !content) return content;
    
    // Create a case-insensitive regex to find the search term
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return content.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
  };

  const notes = notesData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('clientNotes')}</h2>
          <p className="text-muted-foreground">{t('manageClientNotes')}</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          {t('addNote')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="All clients" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All clients</SelectItem>
                  {clients?.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Privacy</Label>
              <Select value={privacyFilter} onValueChange={(value) => setPrivacyFilter(value as PrivacyLevel | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All notes</SelectItem>
                  <SelectItem value="private">{t('private')}</SelectItem>
                  <SelectItem value="shared_with_client">{t('sharedWithClient')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <Select
                value={selectedTags.length > 0 ? selectedTags[0] : ''}
                onValueChange={(value) => {
                  if (value === '') {
                    setSelectedTags([]);
                  } else if (!selectedTags.includes(value)) {
                    setSelectedTags([...selectedTags, value]);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tags</SelectItem>
                  {availableTags?.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                      <button
                        onClick={() => setSelectedTags(selectedTags.filter(t => t !== tag))}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No notes found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle 
                        className="text-lg"
                        dangerouslySetInnerHTML={{ 
                          __html: highlightSearchTerm(note.title, debouncedSearchTerm) 
                        }}
                      />
                      <Badge className={getPrivacyColor(note.privacyLevel)}>
                        {getPrivacyIcon(note.privacyLevel)}
                        <span className="ml-1">
                          {note.privacyLevel === 'private' ? t('private') : t('sharedWithClient')}
                        </span>
                      </Badge>
                    </div>
                    <CardDescription>
                      {format(parseISO(note.createdAt), 'PPP')} •{' '}
                      {clients?.find(c => c.id === note.clientId)?.firstName || 'Unknown'}{' '}
                      {clients?.find(c => c.id === note.clientId)?.lastName || 'Client'}
                    </CardDescription>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleEdit(note)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(note.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                <div 
                  className="text-sm mb-4 prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                  dangerouslySetInnerHTML={{ 
                    __html: highlightSearchTerm(note.content, debouncedSearchTerm) 
                  }}
                />
                
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {note.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Note Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? t('editNote') : t('addNote')}
            </DialogTitle>
            <DialogDescription>
              {editingNote ? t('editNoteDescription') : t('addNoteDescription')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                <Select value={watch('clientId')} onValueChange={(value) => setValue('clientId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="text-sm text-destructive">{errors.clientId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="sessionId">Session (Optional)</Label>
                <Select value={watch('sessionId')} onValueChange={(value) => setValue('sessionId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No specific session</SelectItem>
                    {sessions?.map((session) => (
                      <SelectItem key={session.id} value={session.id}>
                        {session.title} - {format(parseISO(session.scheduledAt), 'PP')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="Note title"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <RichTextEditor
                value={watch('content') || ''}
                onChange={(value) => setValue('content', value)}
                placeholder="Write your note content... Use the toolbar above for formatting."
                maxLength={10000}
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="privacyLevel">Privacy Level *</Label>
              <Select value={watch('privacyLevel')} onValueChange={(value) => setValue('privacyLevel', value as PrivacyLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <EyeOff className="h-4 w-4" />
                      {t('private')} - Only visible to you
                    </div>
                  </SelectItem>
                  <SelectItem value="shared_with_client">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      {t('sharedWithClient')} - Visible to client
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {commonT('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? commonT('loading') : editingNote ? commonT('save') : t('addNote')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}