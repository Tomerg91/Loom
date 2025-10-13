'use client';

import { Sparkles, Edit2, Save, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ReflectionSpaceWidgetProps {
  className?: string;
}

export function ReflectionSpaceWidget({ className }: ReflectionSpaceWidgetProps) {
  const t = useTranslations('dashboard.reflectionSpace');

  // Get default prompts from translations
  const defaultPrompts = t.raw('defaultPrompts') as string[] || [
    'מה עלה בגוף שלי היום?',
    'איפה הרגשתי נוכחות?',
  ];

  // Random prompt selection
  const [currentPromptIndex] = useState(() => Math.floor(Math.random() * defaultPrompts.length));
  const [isEditing, setIsEditing] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [savedCustomPrompt, setSavedCustomPrompt] = useState<string | null>(null);

  const currentPrompt = savedCustomPrompt || defaultPrompts[currentPromptIndex];

  const handleSave = () => {
    if (customPrompt.trim()) {
      setSavedCustomPrompt(customPrompt);
      setIsEditing(false);
    }
  };

  const handleReset = () => {
    setSavedCustomPrompt(null);
    setCustomPrompt('');
    setIsEditing(false);
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden',
        'before:absolute before:inset-0 before:bg-gradient-to-br before:from-teal-50/50 before:to-transparent before:pointer-events-none',
        className
      )}
      data-testid="reflection-space-widget"
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-teal-700">
              <Sparkles className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription className="text-sand-500">
              {t('description')}
            </CardDescription>
          </div>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(true);
                setCustomPrompt(savedCustomPrompt || '');
              }}
              className="text-teal-600 hover:text-teal-700 hover:bg-teal-50"
              aria-label={t('edit')}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder={t('customPrompt')}
              className="w-full min-h-[100px] p-3 rounded-lg border border-sand-200 bg-white/80 text-sand-900 placeholder:text-sand-400 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
              dir="auto"
              aria-label={t('customPrompt')}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                איפוס
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!customPrompt.trim()}
                className="gap-2 bg-teal-500 hover:bg-teal-600"
              >
                <Save className="h-4 w-4" />
                {t('save')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <blockquote className="text-lg leading-relaxed text-sand-700 font-normal italic">
              &ldquo;{currentPrompt}&rdquo;
            </blockquote>
            <div
              className="absolute -top-4 -right-4 text-6xl text-teal-200/30 select-none pointer-events-none"
              aria-hidden="true"
            >
              &ldquo;
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}