'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/coach/empty-state';
import { PracticeJournalForm } from './practice-journal-form';
import { PracticeJournalEntry } from './practice-journal-entry';
import { BookOpen, Plus, Share2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

export interface JournalEntry {
  id: string;
  clientId: string;
  content: string;
  title?: string;
  sensations?: string[];
  emotions?: string[];
  bodyAreas?: string[];
  insights?: string;
  practicesDone?: string[];
  moodRating?: number;
  energyLevel?: number;
  sharedWithCoach: boolean;
  sharedAt?: string;
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

export function PracticeJournal() {
  const t = useTranslations('practiceJournal');
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [filter, setFilter] = useState<'all' | 'shared' | 'private'>('all');

  // Fetch journal entries
  const { data: entries, isLoading } = useQuery({
    queryKey: ['practice-journal', filter],
    queryFn: async (): Promise<JournalEntry[]> => {
      const params = new URLSearchParams();
      if (filter === 'shared') params.append('sharedOnly', 'true');

      const response = await fetch(`/api/practice-journal?${params}`);
      if (!response.ok) throw new Error('Failed to fetch journal entries');
      const data = await response.json();
      return data.data.entries;
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/practice-journal/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete entry');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-journal'] });
      toast.success(t('success.deleted'));
    },
    onError: () => {
      toast.error(t('error.deleteFailed'));
    },
  });

  // Share/unshare mutation
  const shareMutation = useMutation({
    mutationFn: async ({ id, share }: { id: string; share: boolean }) => {
      const response = await fetch(`/api/practice-journal/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sharedWithCoach: share }),
      });
      if (!response.ok) throw new Error('Failed to update sharing');
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['practice-journal'] });
      toast.success(variables.share ? t('success.shared') : t('success.unshared'));
    },
    onError: () => {
      toast.error(t('error.shareFailed'));
    },
  });

  const handleEdit = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm(t('confirmDelete.description'))) {
      deleteMutation.mutate(id);
    }
  };

  const handleShare = (id: string, currentlyShared: boolean) => {
    shareMutation.mutate({ id, share: !currentlyShared });
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const filteredEntries = entries?.filter((entry) => {
    if (filter === 'shared') return entry.sharedWithCoach;
    if (filter === 'private') return !entry.sharedWithCoach;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-sand-900">{t('title')}</h2>
          <p className="text-sand-500 mt-1">{t('description')}</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('newEntry')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          {t('filters.all')}
        </Button>
        <Button
          variant={filter === 'shared' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setFilter('shared')}
          className="gap-2"
        >
          <Share2 className="h-4 w-4" />
          {t('filters.shared')}
        </Button>
        <Button
          variant={filter === 'private' ? 'default' : 'secondary'}
          size="sm"
          onClick={() => setFilter('private')}
          className="gap-2"
        >
          <Lock className="h-4 w-4" />
          {t('filters.private')}
        </Button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <PracticeJournalForm
          entry={editingEntry}
          onClose={handleFormClose}
        />
      )}

      {/* Entries List */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-sand-500">טוען...</div>
          </CardContent>
        </Card>
      ) : !filteredEntries || filteredEntries.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          actionLabel={t('emptyAction')}
          onAction={() => setShowForm(true)}
        />
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <PracticeJournalEntry
              key={entry.id}
              entry={entry}
              onEdit={() => handleEdit(entry)}
              onDelete={() => handleDelete(entry.id)}
              onShare={() => handleShare(entry.id, entry.sharedWithCoach)}
            />
          ))}
        </div>
      )}
    </div>
  );
}