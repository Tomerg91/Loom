'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSettingsAuditHistory } from '@/lib/queries/settings';
import type { SettingCategory } from '@/types';

export function SettingsAuditHistory() {
  const t = useTranslations('settings.audit');
  const [category, setCategory] = useState<SettingCategory | undefined>();
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  const { data, isLoading } = useSettingsAuditHistory(limit, offset, category);

  const handleLoadMore = () => {
    if (data?.pagination.hasMore) {
      setOffset((prev) => prev + limit);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const logs = data?.logs || [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('subtitle')}</CardDescription>
          </div>
          <Select
            value={category || 'all'}
            onValueChange={(value) => {
              setCategory(value === 'all' ? undefined : (value as SettingCategory));
              setOffset(0); // Reset pagination
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="profile">{t('categories.profile')}</SelectItem>
              <SelectItem value="notification">{t('categories.notification')}</SelectItem>
              <SelectItem value="display">{t('categories.display')}</SelectItem>
              <SelectItem value="localization">{t('categories.localization')}</SelectItem>
              <SelectItem value="privacy">{t('categories.privacy')}</SelectItem>
              <SelectItem value="accessibility">{t('categories.accessibility')}</SelectItem>
              <SelectItem value="session">{t('categories.session')}</SelectItem>
              <SelectItem value="data">{t('categories.data')}</SelectItem>
              <SelectItem value="security">{t('categories.security')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t('noHistory')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-4 space-y-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {t(`categories.${log.settingCategory}`)}
                      </Badge>
                      <span className="text-sm font-medium">{log.settingKey}</span>
                    </div>
                    {log.changeReason && (
                      <p className="text-sm text-muted-foreground">{log.changeReason}</p>
                    )}
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div>{t(`sources.${log.changeSource}`)}</div>
                    <div>
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">{t('oldValue')}</p>
                    <code className="text-xs bg-muted p-2 rounded block">
                      {JSON.stringify(log.oldValue, null, 2)}
                    </code>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">{t('newValue')}</p>
                    <code className="text-xs bg-muted p-2 rounded block">
                      {JSON.stringify(log.newValue, null, 2)}
                    </code>
                  </div>
                </div>
              </div>
            ))}

            {data?.pagination.hasMore && (
              <div className="flex justify-center pt-4">
                <Button onClick={handleLoadMore} variant="outline">
                  {t('loadMore')}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
