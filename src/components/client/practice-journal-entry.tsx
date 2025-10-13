'use client';

import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Edit2, Trash2, Share2, Lock, Heart, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

import type { JournalEntry } from './practice-journal';

interface PracticeJournalEntryProps {
  entry: JournalEntry;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
}

export function PracticeJournalEntry({
  entry,
  onEdit,
  onDelete,
  onShare,
}: PracticeJournalEntryProps) {
  const t = useTranslations('practiceJournal');

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {/* Shared indicator gradient */}
      {entry.sharedWithCoach && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-teal-600" />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {entry.title && (
              <h3 className="text-lg font-medium text-sand-900 mb-1 truncate">
                {entry.title}
              </h3>
            )}
            <div className="flex items-center gap-2 text-sm text-sand-500">
              <time dateTime={entry.createdAt}>
                {format(parseISO(entry.createdAt), 'PPp', { locale: he })}
              </time>
              {entry.sharedWithCoach ? (
                <Badge variant="default" className="gap-1 text-xs">
                  <Share2 className="h-3 w-3" />
                  {t('shared')}
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Lock className="h-3 w-3" />
                  {t('private')}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="text-sand-600 hover:text-sand-900"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onShare}
              className={
                entry.sharedWithCoach
                  ? 'text-teal-600 hover:text-teal-700'
                  : 'text-sand-600 hover:text-teal-600'
              }
            >
              {entry.sharedWithCoach ? (
                <Lock className="h-4 w-4" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-sand-600 hover:text-terracotta-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Content */}
        <div className="prose prose-sm max-w-none">
          <p className="text-sand-700 whitespace-pre-wrap">{entry.content}</p>
        </div>

        {/* Insights */}
        {entry.insights && (
          <div className="bg-teal-50 rounded-lg p-3 border border-teal-100">
            <p className="text-sm font-medium text-teal-900 mb-1">
              {t('form.insights')}
            </p>
            <p className="text-sm text-teal-700 whitespace-pre-wrap">{entry.insights}</p>
          </div>
        )}

        {/* Mood & Energy */}
        {(entry.moodRating || entry.energyLevel) && (
          <div className="flex gap-4">
            {entry.moodRating && (
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-moss-500" />
                <span className="text-sm text-sand-600">
                  {t('form.moodRating')}: {entry.moodRating}/10
                </span>
              </div>
            )}
            {entry.energyLevel && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-terracotta-500" />
                <span className="text-sm text-sand-600">
                  {t('form.energyLevel')}: {entry.energyLevel}/10
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        <div className="space-y-2">
          {entry.sensations && entry.sensations.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs font-medium text-sand-600 mr-1">
                {t('form.sensations')}:
              </span>
              {entry.sensations.map((sensation, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {sensation}
                </Badge>
              ))}
            </div>
          )}

          {entry.emotions && entry.emotions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs font-medium text-sand-600 mr-1">
                {t('form.emotions')}:
              </span>
              {entry.emotions.map((emotion, i) => (
                <Badge key={i} variant="secondary" className="text-xs bg-moss-100 text-moss-800">
                  {emotion}
                </Badge>
              ))}
            </div>
          )}

          {entry.bodyAreas && entry.bodyAreas.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs font-medium text-sand-600 mr-1">
                {t('form.bodyAreas')}:
              </span>
              {entry.bodyAreas.map((area, i) => (
                <Badge key={i} variant="secondary" className="text-xs bg-teal-100 text-teal-800">
                  {area}
                </Badge>
              ))}
            </div>
          )}

          {entry.practicesDone && entry.practicesDone.length > 0 && (
            <div className="flex flex-wrap gap-1">
              <span className="text-xs font-medium text-sand-600 mr-1">
                {t('form.practicesDone')}:
              </span>
              {entry.practicesDone.map((practice, i) => (
                <Badge key={i} variant="default" className="text-xs">
                  {practice}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}