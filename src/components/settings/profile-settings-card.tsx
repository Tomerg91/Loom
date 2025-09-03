'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  User,
  Mail,
  Save,
  Edit,
  Shield
} from 'lucide-react';
import { useUser } from '@/lib/auth/use-user';
import { AvatarUpload } from '@/components/ui/file-upload';
import { useFormToast } from '@/components/ui/toast-provider';

export function ProfileSettingsCard() {
  const user = useUser();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState<number | undefined>();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { notifySuccess, notifyError } = useFormToast();
  
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || '',
    specialties: user?.specialties || [],
  });
  
  const [hasChanges, setHasChanges] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setHasChanges(false);
      notifySuccess('Profile updated');
    },
    onError: (error) => {
      notifyError('Update profile', error.message);
    },
  });

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          notifySuccess('Profile picture updated');
          queryClient.invalidateQueries({ queryKey: ['user'] });
          setUploadProgress(undefined);
        } else {
          const errorData = JSON.parse(xhr.responseText);
          setUploadError(errorData.error || 'Upload failed');
          setUploadProgress(undefined);
        }
      });

      xhr.addEventListener('error', () => {
        setUploadError('Upload failed');
        setUploadProgress(undefined);
      });

      xhr.open('POST', '/api/auth/avatar');
      xhr.send(formData);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setUploadProgress(undefined);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      const response = await fetch('/api/auth/avatar', { method: 'DELETE' });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove avatar');
      }

      notifySuccess('Profile picture removed');
      queryClient.invalidateQueries({ queryKey: ['user'] });
    } catch (error) {
      notifyError('Remove avatar', error instanceof Error ? error.message : 'Failed to remove avatar');
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(formData);
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Picture */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>
            Your profile picture is visible to other users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <AvatarUpload
              currentFile={user?.avatarUrl || null}
              onFileSelect={handleFileUpload}
              onFileRemove={handleRemoveAvatar}
              uploadProgress={uploadProgress}
              error={uploadError}
              userName={`${user?.firstName} ${user?.lastName}`}
            />
          </div>
        </CardContent>
      </Card>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>
            Your basic profile information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email"
            />
            <p className="text-sm text-muted-foreground mt-1">
              This email will be used for notifications and account recovery
            </p>
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Enter your phone number"
            />
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      {user.role === 'coach' && (
        <Card>
          <CardHeader>
            <CardTitle>Professional Information</CardTitle>
            <CardDescription>
              Information visible to potential clients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bio">Professional Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell potential clients about your coaching approach and experience"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., New York, NY"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            <div>
              <Label>Specialties</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary">
                    {specialty}
                  </Badge>
                ))}
                <Button type="button" variant="outline" size="sm">
                  <Edit className="mr-1 h-3 w-3" />
                  Edit Specialties
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Status */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
          <CardDescription>
            Your account information and verification status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Account Role</p>
                  <p className="text-sm text-muted-foreground">Your current role in the system</p>
                </div>
              </div>
              <Badge variant={user.role === 'admin' ? 'default' : user.role === 'coach' ? 'secondary' : 'outline'}>
                {user.role?.charAt(0).toUpperCase() + user.role?.slice(1)}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Email Verification</p>
                  <p className="text-sm text-muted-foreground">Your email address verification status</p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-800">
                Verified
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Account Created</p>
                  <p className="text-sm text-muted-foreground">When you joined the platform</p>
                </div>
              </div>
              <span className="text-sm text-muted-foreground">
                {new Date(user.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={!hasChanges || updateProfileMutation.isPending}
        >
          <Save className="mr-2 h-4 w-4" />
          {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
