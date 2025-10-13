'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen,
  Search,
  Filter,
  MoreHorizontal,
  Heart,
  Target,
  Lightbulb
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import type { Reflection } from '@/types';

// Validation schema for reflections
const reflectionSchema = z.object({
  sessionId: z.string().optional(),
  content: z.string().min(10, 'Reflection should be at least 10 characters').max(2000),
  moodRating: z.number().min(1).max(10).optional(),
  insights: z.string().max(1000).optional(),
  goalsForNextSession: z.string().max(1000).optional(),
});

type ReflectionFormData = z.infer<typeof reflectionSchema>;

interface ReflectionsManagementProps {
  sessionId?: string;
}

interface Session {
  id: string;
  title: string;
  scheduledAt: string;
  status: string;
}

interface ReflectionsResponse {
  data: Reflection[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function ReflectionsManagement({ sessionId: initialSessionId }: ReflectionsManagementProps) {
  const t = useTranslations('reflections');
  const commonT = useTranslations('common');
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReflection, setEditingReflection] = useState<Reflection | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState(initialSessionId || '');
  const [moodRange, setMoodRange] = useState<[number, number]>([1, 10]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReflectionFormData>({
    resolver: zodResolver(reflectionSchema),
    defaultValues: {
      sessionId: initialSessionId || '',
      moodRating: 5,
    },
  });

  const watchedMoodRating = watch('moodRating');

  // Fetch recent sessions for dropdown
  const { data: sessions } = useQuery({
    queryKey: ['client-sessions'],
    queryFn: async (): Promise<Session[]> => {
      const response = await fetch('/api/sessions?limit=20&sortOrder=desc&status=completed');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      return data.data;
    },
  });

  // Fetch reflections
  const { data: reflectionsData, isLoading } = useQuery({
    queryKey: ['reflections', selectedSessionId, searchTerm, moodRange],
    queryFn: async (): Promise<ReflectionsResponse> => {
      const params = new URLSearchParams({
        limit: '20',
        sortBy: 'created_at',
        sortOrder: 'desc',
      });

      if (selectedSessionId) {
        params.append('sessionId', selectedSessionId);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      if (moodRange[0] > 1 || moodRange[1] < 10) {
        params.append('moodMin', moodRange[0].toString());
        params.append('moodMax', moodRange[1].toString());
      }

      const response = await fetch(`/api/reflections?${params}`);
      if (!response.ok) throw new Error('Failed to fetch reflections');
      return response.json();
    },
  });

  // Create/Update reflection mutation
  const saveReflectionMutation = useMutation({
    mutationFn: async (formData: ReflectionFormData) => {
      const url = editingReflection ? `/api/reflections/${editingReflection.id}` : '/api/reflections';
      const method = editingReflection ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save reflection');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reflections'] });
      setIsDialogOpen(false);
      setEditingReflection(null);
      reset();
    },
  });

  // Delete reflection mutation
  const deleteReflectionMutation = useMutation({
    mutationFn: async (reflectionId: string) => {
      const response = await fetch(`/api/reflections/${reflectionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete reflection');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reflections'] });
    },
  });

  const onSubmit = (data: ReflectionFormData) => {
    saveReflectionMutation.mutate(data);
  };

  const handleEdit = (reflection: Reflection) => {
    setEditingReflection(reflection);
    setValue('sessionId', reflection.sessionId || '');
    setValue('content', reflection.content);
    setValue('moodRating', reflection.moodRating || 5);
    setValue('insights', reflection.insights || '');
    setValue('goalsForNextSession', reflection.goalsForNextSession || '');
    setIsDialogOpen(true);
  };

  const handleDelete = (reflectionId: string) => {
    if (confirm(t('confirmDelete'))) {
      deleteReflectionMutation.mutate(reflectionId);
    }
  };

  const handleAddNew = () => {
    setEditingReflection(null);
    reset({
      sessionId: selectedSessionId || '',
      moodRating: 5,
    });
    setIsDialogOpen(true);
  };

  const getMoodColor = (rating?: number) => {
    if (!rating) return 'bg-gray-100 text-gray-800';
    if (rating >= 8) return 'bg-green-100 text-green-800';
    if (rating >= 6) return 'bg-yellow-100 text-yellow-800';
    if (rating >= 4) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const getMoodEmoji = (rating?: number) => {
    if (!rating) return '❓';
    if (rating >= 8) return '😊';
    if (rating >= 6) return '😐';
    if (rating >= 4) return '😕';
    return '😔';
  };

  const reflections = reflectionsData?.data || [];

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('myReflections')}</h2>
          <p className="text-muted-foreground">{t('reflectionsDescription')}</p>
        </div>
        <Button onClick={handleAddNew}>
          <Plus className="h-4 w-4 mr-2" />
          {t('addReflection')}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reflections..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Session</Label>
              <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="All sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All sessions</SelectItem>
                  {sessions?.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.title} - {format(parseISO(session.scheduledAt), 'PP')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mood Range: {moodRange[0]} - {moodRange[1]}</Label>
              <Slider
                value={moodRange}
                onValueChange={(value) => setMoodRange(value as [number, number])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reflections List */}
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
      ) : reflections.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No reflections found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reflections.map((reflection) => (
            <Card key={reflection.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {sessions?.find(s => s.id === reflection.sessionId)?.title || 'General Reflection'}
                      </CardTitle>
                      {reflection.moodRating && (
                        <Badge className={getMoodColor(reflection.moodRating)}>
                          <Heart className="h-3 w-3 mr-1" />
                          {getMoodEmoji(reflection.moodRating)} {reflection.moodRating}/10
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {format(parseISO(reflection.createdAt), 'PPP')}
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
                      <DropdownMenuItem onClick={() => handleEdit(reflection)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(reflection.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Reflection
                  </h4>
                  <p className="text-sm whitespace-pre-wrap">{reflection.content}</p>
                </div>

                {reflection.insights && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Key Insights
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reflection.insights}</p>
                  </div>
                )}

                {reflection.goalsForNextSession && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Goals for Next Session
                    </h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{reflection.goalsForNextSession}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Reflection Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingReflection ? t('editReflection') : t('addReflection')}
            </DialogTitle>
            <DialogDescription>
              {editingReflection ? t('editReflectionDescription') : t('addReflectionDescription')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionId">Session (Optional)</Label>
              <Select value={watch('sessionId')} onValueChange={(value) => setValue('sessionId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a session or leave empty for general reflection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">General reflection</SelectItem>
                  {sessions?.map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.title} - {format(parseISO(session.scheduledAt), 'PP')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Reflection *</Label>
              <Textarea
                id="content"
                {...register('content')}
                placeholder="What did you learn today? How are you feeling about your progress? Any insights or breakthroughs?"
                rows={6}
              />
              {errors.content && (
                <p className="text-sm text-destructive">{errors.content.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="moodRating">
                Mood Rating: {watchedMoodRating}/10 {getMoodEmoji(watchedMoodRating)}
              </Label>
              <Slider
                value={[watchedMoodRating || 5]}
                onValueChange={(value) => setValue('moodRating', value[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>😔 Very Low</span>
                <span>😐 Neutral</span>
                <span>😊 Very High</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="insights">Key Insights (Optional)</Label>
              <Textarea
                id="insights"
                {...register('insights')}
                placeholder="What insights did you gain? What patterns did you notice?"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goalsForNextSession">Goals for Next Session (Optional)</Label>
              <Textarea
                id="goalsForNextSession"
                {...register('goalsForNextSession')}
                placeholder="What would you like to focus on or achieve in your next session?"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                {commonT('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? commonT('loading') : editingReflection ? commonT('save') : t('addReflection')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}