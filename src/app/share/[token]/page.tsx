'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { 
  Download, 
  Eye, 
  Lock, 
  Calendar, 
  FileText, 
  Image, 
  Video, 
  Music, 
  Archive,
  AlertTriangle,
  CheckCircle,
  Clock,
  HardDrive
} from 'lucide-react';
import { formatFileSize, formatDate } from '@/lib/utils';

interface FileInfo {
  id: string;
  filename: string;
  original_filename: string;
  file_type: string;
  file_size: number;
  storage_path: string;
  created_at: string;
  description?: string;
  expires_at: string;
  max_downloads?: number;
  current_downloads: number;
}

interface ShareAccessValidation {
  share_id: string | null;
  file_id: string | null;
  can_access: boolean;
  failure_reason: string | null;
  file_info: FileInfo | null;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;
  const t = useTranslations('share');
  
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [password, setPassword] = useState('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [validation, setValidation] = useState<ShareAccessValidation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    if (token) {
      validateAccess();
    }
  }, [token]);

  const validateAccess = async (inputPassword?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/share/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password: inputPassword || password
        })
      });

      if (!response.ok) {
        throw new Error('Failed to validate access');
      }

      const result = await response.json();
      setValidation(result);

      if (!result.can_access && result.failure_reason === 'Invalid password') {
        setShowPasswordInput(true);
      }

      // Log the access attempt
      if (result.share_id) {
        await logAccess(result.share_id, 'view', result.can_access, result.failure_reason);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate access');
    } finally {
      setLoading(false);
    }
  };

  const logAccess = async (
    shareId: string, 
    accessType: 'view' | 'download', 
    success: boolean, 
    failureReason?: string | null,
    bytesServed?: number
  ) => {
    try {
      // Get user agent
      const userAgent = navigator.userAgent;
      
      await fetch('/api/share/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_id: shareId,
          user_agent: userAgent,
          access_type: accessType,
          success,
          failure_reason: failureReason || undefined,
          bytes_served: bytesServed,
        })
      });
    } catch (error) {
      console.error('Failed to log access:', error);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    
    await validateAccess(password);
  };

  const handleDownload = async () => {
    if (!validation?.can_access || !validation.file_info || !validation.share_id) {
      return;
    }

    try {
      setDownloading(true);

      // Get download URL from Supabase Storage
      const { data, error } = await supabase.storage
        .from('uploads')
        .createSignedUrl(validation.file_info.storage_path, 3600); // 1 hour expiry

      if (error) {
        throw new Error('Failed to generate download URL');
      }

      if (!data.signedUrl) {
        throw new Error('No download URL available');
      }

      // Log download attempt
      await logAccess(validation.share_id, 'download', true, null, validation.file_info.file_size);

      // Start download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = validation.file_info.original_filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Refresh validation to update download count
      setTimeout(() => {
        validateAccess();
      }, 1000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
      
      // Log failed download
      if (validation.share_id) {
        await logAccess(validation.share_id, 'download', false, err instanceof Error ? err.message : 'Download failed');
      }
    } finally {
      setDownloading(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-6 w-6" />;
    if (fileType.startsWith('video/')) return <Video className="h-6 w-6" />;
    if (fileType.startsWith('audio/')) return <Music className="h-6 w-6" />;
    if (fileType.includes('zip') || fileType.includes('tar') || fileType.includes('rar')) {
      return <Archive className="h-6 w-6" />;
    }
    return <FileText className="h-6 w-6" />;
  };

  const getStatusBadge = () => {
    if (!validation) return null;

    const fileInfo = validation.file_info;
    if (!fileInfo) return null;

    const now = new Date();
    const expiresAt = new Date(fileInfo.expires_at);
    const isExpired = expiresAt <= now;
    const isDownloadLimitReached = fileInfo.max_downloads && 
                                   fileInfo.current_downloads >= fileInfo.max_downloads;

    if (isExpired) {
      return <Badge variant="destructive"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
    }

    if (isDownloadLimitReached) {
      return <Badge variant="destructive"><Download className="h-3 w-3 mr-1" />Download Limit Reached</Badge>;
    }

    return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading shared file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validation?.can_access) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              {showPasswordInput ? (
                <>
                  <Lock className="h-5 w-5 mr-2" />
                  Password Required
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Access Denied
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {showPasswordInput ? (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <p className="text-gray-600 mb-4">
                  This shared file is password protected. Please enter the password to access it.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="share-password">{t('passwordLabel')}</Label>
                  <Input
                    id="share-password"
                    type="password"
                    placeholder={t('passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={!password.trim()}>
                  Access File
                </Button>
              </form>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">
                  {validation?.failure_reason || 'You do not have access to this file.'}
                </p>
                <Button onClick={() => window.history.back()} className="w-full">
                  Go Back
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const fileInfo = validation.file_info!;
  const now = new Date();
  const expiresAt = new Date(fileInfo.expires_at);
  const isExpired = expiresAt <= now;
  const isDownloadLimitReached = fileInfo.max_downloads && 
                                 fileInfo.current_downloads >= fileInfo.max_downloads;
  const canDownload = !isExpired && !isDownloadLimitReached;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                {getFileIcon(fileInfo.file_type)}
                <span className="ml-3">Shared File</span>
              </CardTitle>
              {getStatusBadge()}
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* File Information */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {fileInfo.original_filename}
                </h3>
                {fileInfo.description && (
                  <p className="text-gray-600 text-sm">{fileInfo.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <HardDrive className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-gray-600">Size:</span>
                  <span className="ml-1 font-medium">{formatFileSize(fileInfo.file_size)}</span>
                </div>
                
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-gray-600">Type:</span>
                  <span className="ml-1 font-medium">{fileInfo.file_type}</span>
                </div>

                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-gray-600">Expires:</span>
                  <span className={`ml-1 font-medium ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatDate(fileInfo.expires_at)}
                  </span>
                </div>

                {fileInfo.max_downloads && (
                  <div className="flex items-center">
                    <Download className="h-4 w-4 mr-2 text-gray-500" />
                    <span className="text-gray-600">Downloads:</span>
                    <span className={`ml-1 font-medium ${isDownloadLimitReached ? 'text-red-600' : 'text-gray-900'}`}>
                      {fileInfo.current_downloads} / {fileInfo.max_downloads}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Download Section */}
            <div className="text-center space-y-4">
              {canDownload ? (
                <>
                  <Button
                    onClick={handleDownload}
                    disabled={downloading}
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {downloading ? 'Preparing Download...' : 'Download File'}
                  </Button>
                  
                  {fileInfo.max_downloads && (
                    <p className="text-sm text-gray-500">
                      {fileInfo.max_downloads - fileInfo.current_downloads} downloads remaining
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center">
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                    <p className="text-red-700 font-medium">File Unavailable</p>
                    <p className="text-red-600 text-sm mt-1">
                      {isExpired ? 'This shared file has expired.' : 'Download limit has been reached.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* File Preview Information */}
            <Separator />
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Shared on {formatDate(fileInfo.created_at)} • Secure file sharing
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}