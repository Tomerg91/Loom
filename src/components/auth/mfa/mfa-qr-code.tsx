'use client';

import { Copy, Download, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';


export interface MfaQrCodeProps {
  secret: string;
  issuer: string;
  accountName: string;
  size?: number;
  className?: string;
}

export function MfaQrCode({ 
  secret, 
  issuer, 
  accountName, 
  size = 200,
  className = '' 
}: MfaQrCodeProps) {
  const t = useTranslations('mfa');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate TOTP URI
  const generateTotpUri = () => {
    const label = encodeURIComponent(`${issuer}:${accountName}`);
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: '6',
      period: '30'
    });
    
    return `otpauth://totp/${label}?${params.toString()}`;
  };

  // Generate QR code using a simple QR code implementation
  // In a real app, you'd use a library like 'qrcode' or 'qr-code-generator'
  const generateQrCode = async () => {
    if (!canvasRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas size
      canvas.width = size;
      canvas.height = size;

      // For demo purposes, we'll create a simple placeholder
      // In a real app, use a proper QR code library
      const uri = generateTotpUri();
      
      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);

      // Create a simple grid pattern (placeholder for actual QR code)
      const gridSize = 20;
      const cellSize = size / gridSize;
      
      ctx.fillStyle = '#000000';
      
      // Create a pattern based on the secret (simplified)
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j < gridSize; j++) {
          const shouldFill = (i + j + secret.charCodeAt((i + j) % secret.length)) % 3 === 0;
          if (shouldFill) {
            ctx.fillRect(i * cellSize, j * cellSize, cellSize, cellSize);
          }
        }
      }

      // Add corner markers (like real QR codes)
      const markerSize = cellSize * 3;
      ctx.fillStyle = '#000000';
      
      // Top-left marker
      ctx.fillRect(0, 0, markerSize, markerSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cellSize, cellSize, cellSize, cellSize);
      
      // Top-right marker
      ctx.fillStyle = '#000000';
      ctx.fillRect(size - markerSize, 0, markerSize, markerSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(size - markerSize + cellSize, cellSize, cellSize, cellSize);
      
      // Bottom-left marker
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, size - markerSize, markerSize, markerSize);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cellSize, size - markerSize + cellSize, cellSize, cellSize);

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    generateQrCode();
  }, [secret, issuer, accountName, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `${issuer.toLowerCase()}-mfa-qr-code.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleCopyUri = async () => {
    try {
      const uri = generateTotpUri();
      await navigator.clipboard.writeText(uri);
      // You might want to show a toast here
    } catch (err) {
      console.error('Failed to copy URI to clipboard:', err);
    }
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {t('qrCode.error')}: {error}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={generateQrCode}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t('qrCode.retry')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className={`p-6 ${className}`}>
      <div className="space-y-4">
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={`border rounded-lg ${isLoading ? 'opacity-50' : ''}`}
              style={{ maxWidth: '100%', height: 'auto' }}
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="text-center space-y-2">
          <p className="text-sm font-medium">{t('qrCode.instruction')}</p>
          <p className="text-xs text-muted-foreground">
            {t('qrCode.apps')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('qrCode.download')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyUri}
            disabled={isLoading}
          >
            <Copy className="w-4 h-4 mr-2" />
            {t('qrCode.copy')}
          </Button>
        </div>

        {/* Accessibility alternative */}
        <div className="border-t pt-4">
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              {t('qrCode.accessibility')}
            </summary>
            <div className="mt-2 p-3 bg-muted rounded text-xs font-mono break-all">
              {generateTotpUri()}
            </div>
          </details>
        </div>
      </div>
    </Card>
  );
}