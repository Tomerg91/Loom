'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, X, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { JournalEntry } from './practice-journal';
import { TagInput } from './tag-input';


interface PracticeJournalFormProps {
  entry?: JournalEntry | null;
  onClose: () => void;
}

export function PracticeJournalForm({ entry, onClose }: PracticeJournalFormProps) {
  const t = useTranslations('practiceJournal');
  const queryClient = useQueryClient();
  const isEditing = !!entry;

  const [formData, setFormData] = useState({
    title: entry?.title || '',
    content: entry?.content || '',
    insights: entry?.insights || '',
    sensations: entry?.sensations || [],
    emotions: entry?.emotions || [],
    bodyAreas: entry?.bodyAreas || [],
    practicesDone: entry?.practicesDone || [],
    moodRating: entry?.moodRating || undefined,
    energyLevel: entry?.energyLevel || undefined,
    sharedWithCoach: entry?.sharedWithCoach || false,
  });

  const [showPrompts, setShowPrompts] = useState(true);

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      const url = isEditing ? `/api/practice-journal/${entry.id}` : '/api/practice-journal';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save entry');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['practice-journal'] });
      toast.success(isEditing ? t('success.updated') : t('success.created'));
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || (isEditing ? t('error.updateFailed') : t('error.createFailed')));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.content.trim()) {
      toast.error('יש למלא את שדה התוכן');
      return;
    }

    saveMutation.mutate(formData);
  };

  // Guided prompts
  const prompts = [
    t('prompts.sensations'),
    t('prompts.location'),
    t('prompts.learning'),
    t('prompts.awareness'),
    t('prompts.breath'),
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sand-900">
            {isEditing ? t('editEntry') : t('newEntry')}
          </DialogTitle>
          <DialogDescription className="text-sand-500">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guided Prompts */}
          {showPrompts && (
            <div className="bg-teal-50 rounded-lg p-4 border border-teal-200 relative">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setShowPrompts(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-teal-600" />
                <h4 className="font-medium text-teal-900">{t('prompts.title')}</h4>
              </div>
              <ul className="space-y-2 text-sm text-teal-700">
                {prompts.map((prompt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-teal-400 mt-0.5">•</span>
                    <span>{prompt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sand-700">
              {t('form.title')}
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('form.titlePlaceholder')}
              className="border-sand-300 focus:border-teal-400"
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content" className="text-sand-700">
              {t('form.content')} <span className="text-terracotta-500">*</span>
            </Label>
            <Textarea
              id="content"
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder={t('form.contentPlaceholder')}
              className="border-sand-300 focus:border-teal-400 min-h-[150px]"
              dir="auto"
            />
          </div>

          {/* Insights */}
          <div className="space-y-2">
            <Label htmlFor="insights" className="text-sand-700">
              {t('form.insights')}
            </Label>
            <Textarea
              id="insights"
              value={formData.insights}
              onChange={(e) => setFormData({ ...formData, insights: e.target.value })}
              placeholder={t('form.insightsPlaceholder')}
              className="border-sand-300 focus:border-teal-400 min-h-[100px]"
              dir="auto"
            />
          </div>

          {/* Tags Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sensations */}
            <div className="space-y-2">
              <Label className="text-sand-700">{t('form.sensations')}</Label>
              <TagInput
                value={formData.sensations}
                onChange={(sensations) => setFormData({ ...formData, sensations })}
                placeholder={t('form.sensationsPlaceholder')}
                suggestions={Object.keys(t.raw('tags.sensations'))}
              />
            </div>

            {/* Emotions */}
            <div className="space-y-2">
              <Label className="text-sand-700">{t('form.emotions')}</Label>
              <TagInput
                value={formData.emotions}
                onChange={(emotions) => setFormData({ ...formData, emotions })}
                placeholder={t('form.emotionsPlaceholder')}
                suggestions={Object.keys(t.raw('tags.emotions'))}
              />
            </div>

            {/* Body Areas */}
            <div className="space-y-2">
              <Label className="text-sand-700">{t('form.bodyAreas')}</Label>
              <TagInput
                value={formData.bodyAreas}
                onChange={(bodyAreas) => setFormData({ ...formData, bodyAreas })}
                placeholder={t('form.bodyAreasPlaceholder')}
                suggestions={Object.keys(t.raw('tags.bodyAreas'))}
              />
            </div>

            {/* Practices Done */}
            <div className="space-y-2">
              <Label className="text-sand-700">{t('form.practicesDone')}</Label>
              <TagInput
                value={formData.practicesDone}
                onChange={(practicesDone) => setFormData({ ...formData, practicesDone })}
                placeholder={t('form.practicesDonePlaceholder')}
                suggestions={Object.keys(t.raw('tags.practices'))}
              />
            </div>
          </div>

          {/* Ratings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mood Rating */}
            <div className="space-y-2">
              <Label htmlFor="moodRating" className="text-sand-700">
                {t('form.moodRating')}
              </Label>
              <Input
                id="moodRating"
                type="number"
                min="1"
                max="10"
                value={formData.moodRating || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    moodRating: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                className="border-sand-300 focus:border-teal-400"
              />
            </div>

            {/* Energy Level */}
            <div className="space-y-2">
              <Label htmlFor="energyLevel" className="text-sand-700">
                {t('form.energyLevel')}
              </Label>
              <Input
                id="energyLevel"
                type="number"
                min="1"
                max="10"
                value={formData.energyLevel || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    energyLevel: e.target.value ? parseInt(e.target.value, 10) : undefined,
                  })
                }
                className="border-sand-300 focus:border-teal-400"
              />
            </div>
          </div>

          {/* Share with Coach */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sharedWithCoach"
              checked={formData.sharedWithCoach}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, sharedWithCoach: checked as boolean })
              }
            />
            <Label
              htmlFor="sharedWithCoach"
              className="text-sm font-normal cursor-pointer text-sand-700"
            >
              {t('form.shareWithCoach')}
            </Label>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="secondary" onClick={onClose} disabled={saveMutation.isPending}>
              {t('form.cancel')}
            </Button>
            <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {saveMutation.isPending ? t('form.saving') : t('form.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}