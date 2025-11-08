'use client';

import {
  Share2,
  Users,
  Link,
  Eye,
  Download,
  Edit3,
  Trash2,
  Copy,
  Check
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { FileMetadata } from '@/lib/services/file-management-service';

interface ShareDialogProps {
  file: FileMetadata;
  open: boolean;
  onClose: () => void;
}

interface ShareEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  permission: 'view' | 'download' | 'edit';
  expiresAt?: Date;
  accessCount: number;
  lastAccessedAt?: Date;
}

const permissionIcons = {
  view: Eye,
  download: Download,
  edit: Edit3
};

const permissionLabels = {
  view: 'Can view',
  download: 'Can download', 
  edit: 'Can edit'
};

export function ShareDialog({ file, open, onClose }: ShareDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'share' | 'link'>('share');
  const [userEmail, setUserEmail] = useState('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'download' | 'edit'>('view');
  const [expirationEnabled, setExpirationEnabled] = useState(false);
  const [expirationDate, setExpirationDate] = useState('');
  const [publicLinkEnabled, setPublicLinkEnabled] = useState(file.isPublic);
  const [linkCopied, setLinkCopied] = useState(false);
  const [shares, setShares] = useState<ShareEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchShares();
    }
  }, [open, file.id]);

  const fetchShares = async () => {
    try {
      const response = await fetch(`/api/files/${file.id}/share`);
      if (response.ok) {
        const data = await response.json();
        setShares(data.map((share: unknown) => ({
          id: share.id,
          userId: share.shared_with_id,
          userName: `${share.users.first_name} ${share.users.last_name}`.trim() || share.users.email,
          userEmail: share.users.email,
          permission: share.permission,
          expiresAt: share.expires_at ? new Date(share.expires_at) : undefined,
          accessCount: share.access_count,
          lastAccessedAt: share.last_accessed_at ? new Date(share.last_accessed_at) : undefined
        })));
      }
    } catch (error) {
      console.error('Error fetching shares:', error);
    }
  };

  const handleShareWithUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/files/${file.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: userEmail.trim(),
          permission: selectedPermission,
          expiresAt: expirationEnabled && expirationDate ? new Date(expirationDate).toISOString() : null
        })
      });

      if (response.ok) {
        toast({
          title: 'File shared',
          description: `File shared with ${userEmail} successfully.`
        });
        setUserEmail('');
        setExpirationEnabled(false);
        setExpirationDate('');
        fetchShares();
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error || 'Failed to share file',
          variant: 'destructive'
        });
      }
    } catch () {
      toast({
        title: 'Error',
        description: 'Failed to share file. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: string, userName: string) => {
    try {
      const response = await fetch(`/api/files/${file.id}/share?userId=${shareId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({
          title: 'Access revoked',
          description: `Revoked ${userName}'s access to this file.`
        });
        fetchShares();
      } else {
        throw new Error('Failed to revoke access');
      }
    } catch () {
      toast({
        title: 'Error',
        description: 'Failed to revoke access. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleCopyLink = () => {
    const publicUrl = `${window.location.origin}/files/${file.id}${!file.isPublic ? '?token=...' : ''}`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast({
        title: 'Link copied',
        description: 'File link copied to clipboard'
      });
    });
  };

  const handleTogglePublicLink = async () => {
    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !publicLinkEnabled })
      });

      if (response.ok) {
        setPublicLinkEnabled(!publicLinkEnabled);
        toast({
          title: publicLinkEnabled ? 'Public access disabled' : 'Public access enabled',
          description: publicLinkEnabled 
            ? 'File is no longer publicly accessible' 
            : 'Anyone with the link can now access this file'
        });
      }
    } catch () {
      toast({
        title: 'Error',
        description: 'Failed to update public access setting',
        variant: 'destructive'
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share "{file.name}"
          </DialogTitle>
        </DialogHeader>

        {/* Tab navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'share' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Users className="h-4 w-4 inline mr-2" />
            Share with people
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'link' 
                ? 'bg-white text-gray-900 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Link className="h-4 w-4 inline mr-2" />
            Share with link
          </button>
        </div>

        {/* Share with people tab */}
        {activeTab === 'share' && (
          <div className="space-y-4">
            <form onSubmit={handleShareWithUser} className="space-y-4">
              <div>
                <Label htmlFor="user-email">Email address</Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="Enter email address"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Permission</Label>
                  <Select value={selectedPermission} onValueChange={setSelectedPermission as unknown}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Can view
                        </div>
                      </SelectItem>
                      <SelectItem value="download">
                        <div className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          Can download
                        </div>
                      </SelectItem>
                      <SelectItem value="edit">
                        <div className="flex items-center gap-2">
                          <Edit3 className="h-4 w-4" />
                          Can edit
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Expiration</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={expirationEnabled}
                      onCheckedChange={setExpirationEnabled}
                    />
                    <span className="text-sm">Set expiration</span>
                  </div>
                  {expirationEnabled && (
                    <Input
                      type="datetime-local"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="mt-2"
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  )}
                </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sharing...' : 'Share'}
              </Button>
            </form>

            <Separator />

            {/* Existing shares */}
            <div>
              <h3 className="font-medium mb-3">People with access</h3>
              <ScrollArea className="max-h-60">
                <div className="space-y-2">
                  {shares.map(share => {
                    const PermissionIcon = permissionIcons[share.permission];
                    return (
                      <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-sm">{share.userName}</p>
                              <p className="text-xs text-gray-600">{share.userEmail}</p>
                            </div>
                            <Badge variant="outline" className="ml-2">
                              <PermissionIcon className="h-3 w-3 mr-1" />
                              {permissionLabels[share.permission]}
                            </Badge>
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-gray-500">
                            <span>Accessed {share.accessCount} times</span>
                            {share.lastAccessedAt && (
                              <span>Last: {share.lastAccessedAt.toLocaleDateString()}</span>
                            )}
                            {share.expiresAt && (
                              <span>Expires: {share.expiresAt.toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeShare(share.userId, share.userName)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  {shares.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      No one has access to this file yet.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}

        {/* Share with link tab */}
        {activeTab === 'link' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium">Public link sharing</h3>
                <p className="text-sm text-gray-600">
                  {publicLinkEnabled 
                    ? 'Anyone with the link can access this file'
                    : 'Only people with access can open with this link'
                  }
                </p>
              </div>
              <Switch
                checked={publicLinkEnabled}
                onCheckedChange={handleTogglePublicLink}
              />
            </div>

            <div>
              <Label>Link to file</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  readOnly
                  value={`${window.location.origin}/files/${file.id}${!publicLinkEnabled ? '?token=...' : ''}`}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {linkCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {publicLinkEnabled 
                  ? 'Anyone with this link can access the file'
                  : 'Only people you\'ve shared with can use this link'
                }
              </p>
            </div>

            {publicLinkEnabled && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 mt-0.5">
                    <Link className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-blue-900">Public link is active</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Anyone with this link can view and download your file. 
                      Be careful when sharing it.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}