'use client';

import { 
  Copy, 
  Download, 
  Eye, 
  EyeOff, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface MfaBackupCodesProps {
  codes: string[];
  usedCodes?: string[];
  onRegenerate?: () => void;
  className?: string;
  showTitle?: boolean;
  isRegenerating?: boolean;
}

export function MfaBackupCodes({ 
  codes, 
  usedCodes = [],
  onRegenerate,
  className,
  showTitle = true,
  isRegenerating = false
}: MfaBackupCodesProps) {
  const t = useTranslations('mfa');
  const [isVisible, setIsVisible] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const unusedCodes = codes.filter(code => !usedCodes.includes(code));
  const usedCount = usedCodes.length;
  const totalCount = codes.length;

  const handleCopyCode = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  const handleCopyAll = async () => {
    try {
      const allCodes = codes.join('\n');
      await navigator.clipboard.writeText(allCodes);
      setCopiedIndex(-1); // Special index for "copy all"
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy codes:', err);
    }
  };

  const handleDownload = () => {
    const content = [
      `${t('backupCodes.downloadTitle')}`,
      `${t('backupCodes.downloadSubtitle')}`,
      '',
      t('backupCodes.downloadInstructions'),
      '',
      ...codes.map((code, index) => `${index + 1}. ${code}`),
      '',
      t('backupCodes.downloadWarning')
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `loom-mfa-backup-codes-${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className={cn('w-full', className)}>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>{t('backupCodes.title')}</span>
            </div>
            <div className="flex items-center space-x-2">
              {usedCount > 0 && (
                <Badge variant={usedCount >= totalCount * 0.7 ? 'destructive' : 'secondary'}>
                  {unusedCodes.length} {t('backupCodes.remaining')}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(!isVisible)}
              >
                {isVisible ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      )}

      <CardContent className="space-y-4">
        {/* Status Alert */}
        {usedCount > 0 && (
          <Alert variant={usedCount >= totalCount * 0.7 ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {usedCount >= totalCount * 0.7 
                ? t('backupCodes.lowWarning', { count: unusedCodes.length })
                : t('backupCodes.usedInfo', { used: usedCount, total: totalCount })
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>{t('backupCodes.instruction')}</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>{t('backupCodes.rule1')}</li>
            <li>{t('backupCodes.rule2')}</li>
            <li>{t('backupCodes.rule3')}</li>
          </ul>
        </div>

        {/* Backup Codes Grid */}
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {codes.map((code, index) => {
              const isUsed = usedCodes.includes(code);
              const isCopied = copiedIndex === index;
              
              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors',
                    isUsed ? 'bg-muted/50 opacity-60' : 'bg-background hover:bg-muted/30',
                    isCopied && 'bg-green-50 border-green-200'
                  )}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {String(index + 1).padStart(2, '0')}.
                    </span>
                    {isVisible ? (
                      <code className={cn(
                        'font-mono text-sm tracking-wider',
                        isUsed && 'line-through text-muted-foreground'
                      )}>
                        {code}
                      </code>
                    ) : (
                      <div className="font-mono text-sm tracking-wider">••••••••</div>
                    )}
                    {isUsed && (
                      <Badge variant="secondary" className="text-xs">
                        {t('backupCodes.used')}
                      </Badge>
                    )}
                  </div>
                  
                  {!isUsed && isVisible && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyCode(code, index)}
                      disabled={!isVisible}
                      className="h-8 w-8 p-0"
                    >
                      {isCopied ? (
                        <CheckCircle className="w-3 h-3 text-green-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyAll}
              disabled={!isVisible}
              className="flex items-center space-x-2"
            >
              {copiedIndex === -1 ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span>{t('backupCodes.copyAll')}</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              {t('backupCodes.download')}
            </Button>
          </div>

          {onRegenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="text-destructive hover:text-destructive"
            >
              {isRegenerating ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {t('backupCodes.regenerate')}
            </Button>
          )}
        </div>

        {/* Warning */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {t('backupCodes.securityWarning')}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}