'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ShareIcon, UserIcon, XIcon, AlertTriangleIcon, CheckIcon } from 'lucide-react';

interface User {
  id: string;
  name: string;
  role: 'coach' | 'client' | 'admin';
  email?: string;
}

interface FileShareDialogProps {
  fileId: string;
  filename: string;
  currentShares?: Array<{
    id: string;
    sharedWith: User;
    permissionType: 'view' | 'download' | 'edit';
    expiresAt?: string | null;
    createdAt: string;
  }>;
  availableUsers: User[];
  onShare: (data: {
    fileId: string;
    sharedWith: string[];
    permissionType: 'view' | 'download' | 'edit';
    expiresAt?: string;
    message?: string;
  }) => Promise<void>;
  onRevokeShare: (shareId: string) => Promise<void>;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export function FileSharingDialog({
  fileId,
  filename,
  currentShares = [],
  availableUsers,
  onShare,
  onRevokeShare,
  isLoading = false,
  children,
}: FileShareDialogProps) {
  const t = useTranslations('files');
  const [open, setOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [permissionType, setPermissionType] = useState<'view' | 'download' | 'edit'>('view');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string>('');

  // Filter available users based on search and exclude already shared users
  const sharedUserIds = currentShares.map(share => share.sharedWith.id);
  const filteredUsers = availableUsers.filter(user => 
    !sharedUserIds.includes(user.id) &&
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAddUser = (userId: string) => {
    if (!selectedUsers.includes(userId)) {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(id => id !== userId));
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user to share with');
      return;
    }

    setSharing(true);
    setError('');

    try {
      await onShare({
        fileId,
        sharedWith: selectedUsers,
        permissionType,
        expiresAt: expiresAt || undefined,
        message: message || undefined,
      });

      // Reset form
      setSelectedUsers([]);
      setPermissionType('view');
      setExpiresAt('');
      setMessage('');
      setSearchTerm('');
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to share file');
    } finally {
      setSharing(false);
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await onRevokeShare(shareId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to revoke share');
    }
  };

  const getPermissionIcon = (permission: 'view' | 'download' | 'edit') => {
    switch (permission) {
      case 'view':
        return '👁️';
      case 'download':
        return '⬇️';
      case 'edit':
        return '✏️';
      default:
        return '👁️';
    }
  };

  const getPermissionLabel = (permission: 'view' | 'download' | 'edit') => {
    switch (permission) {
      case 'view':
        return t('permissions.view', { defaultValue: 'Can view' });
      case 'download':
        return t('permissions.download', { defaultValue: 'Can download' });
      case 'edit':
        return t('permissions.edit', { defaultValue: 'Can edit' });
      default:
        return t('permissions.view', { defaultValue: 'Can view' });
    }
  };

  const getRoleColor = (role: 'coach' | 'client' | 'admin') => {
    switch (role) {
      case 'coach':
        return 'bg-blue-100 text-blue-800';
      case 'client':
        return 'bg-green-100 text-green-800';
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <ShareIcon className="h-4 w-4 mr-2" />
            {t('share.button', { defaultValue: 'Share' })}
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShareIcon className="h-5 w-5" />
            {t('share.title', { defaultValue: 'Share File' })} "{filename}"
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Current Shares */}
          {currentShares.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-600">
                {t('share.currentShares', { defaultValue: 'Current Shares' })} ({currentShares.length})
              </h3>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {currentShares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <UserIcon className="h-4 w-4 text-gray-500" />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{share.sharedWith.name}</span>
                          <Badge variant="secondary" className={getRoleColor(share.sharedWith.role)}>
                            {share.sharedWith.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{getPermissionIcon(share.permissionType)} {getPermissionLabel(share.permissionType)}</span>
                          {share.expiresAt && (
                            <span>• Expires {new Date(share.expiresAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeShare(share.id)}
                      disabled={isLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Separator />
            </div>
          )}

          {/* Add New Shares */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-600">
              {t('share.addNew', { defaultValue: 'Share with Others' })}
            </h3>

            {/* User Search */}
            <div className="space-y-2">
              <Label htmlFor="user-search">
                {t('share.searchUsers', { defaultValue: 'Search Users' })}
              </Label>
              <Input
                id="user-search"
                placeholder={t('share.searchPlaceholder', { defaultValue: 'Search by name or email...' })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Available Users */}
            {filteredUsers.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer"
                    onClick={() => handleAddUser(user.id)}
                  >
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-gray-500" />
                      <span className="font-medium text-sm">{user.name}</span>
                      <Badge variant="secondary" className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      {t('share.add', { defaultValue: 'Add' })}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <Label>{t('share.selectedUsers', { defaultValue: 'Selected Users' })}</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((userId) => {
                    const user = availableUsers.find(u => u.id === userId);
                    if (!user) return null;
                    
                    return (
                      <Badge
                        key={userId}
                        variant="secondary"
                        className="flex items-center gap-1 px-3 py-1"
                      >
                        <span>{user.name}</span>
                        <button
                          onClick={() => handleRemoveUser(userId)}
                          className="ml-1 hover:text-red-600"
                        >
                          <XIcon className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Permission Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="permission-type">
                  {t('share.permission', { defaultValue: 'Permission Level' })}
                </Label>
                <Select value={permissionType} onValueChange={(value) => setPermissionType(value as 'view' | 'download' | 'edit')}>
                  <SelectTrigger id="permission-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      👁️ {getPermissionLabel('view')}
                    </SelectItem>
                    <SelectItem value="download">
                      ⬇️ {getPermissionLabel('download')}
                    </SelectItem>
                    <SelectItem value="edit">
                      ✏️ {getPermissionLabel('edit')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires-at">
                  {t('share.expiresAt', { defaultValue: 'Expires At (Optional)' })}
                </Label>
                <Input
                  id="expires-at"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>

            {/* Optional Message */}
            <div className="space-y-2">
              <Label htmlFor="share-message">
                {t('share.message', { defaultValue: 'Message (Optional)' })}
              </Label>
              <Textarea
                id="share-message"
                placeholder={t('share.messagePlaceholder', { defaultValue: 'Add a note about this shared file...' })}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
              {message && (
                <div className="text-xs text-gray-500">
                  {message.length}/500 characters
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={sharing}
          >
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            onClick={handleShare}
            disabled={sharing || selectedUsers.length === 0 || isLoading}
            className="min-w-[120px]"
          >
            {sharing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {t('share.sharing', { defaultValue: 'Sharing...' })}
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4 mr-2" />
                {t('share.shareFile', { defaultValue: 'Share File' })}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}