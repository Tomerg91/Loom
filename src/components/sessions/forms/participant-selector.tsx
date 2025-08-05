import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  X,
  Search,
} from 'lucide-react';
import { User, SessionFormData, SessionFormField } from '@/types';

interface ParticipantSelectorProps {
  formData: SessionFormData;
  onFieldChange: (field: SessionFormField, value: string | number) => void;
  availableUsers?: User[];
  currentUser?: User | null;
}

export function ParticipantSelector({ 
  formData, 
  onFieldChange, 
  availableUsers = [], 
  currentUser 
}: ParticipantSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const selectUser = (selectedUser: User) => {
    if (selectedUser.role === 'coach') {
      onFieldChange('coachId', selectedUser.id);
    } else if (selectedUser.role === 'client') {
      onFieldChange('clientId', selectedUser.id);
    }
    setSearchTerm('');
  };

  const getSelectedUser = (userId: string) => {
    return availableUsers?.find(u => u.id === userId);
  };

  const renderUserCard = (user: User, isSelected: boolean, onRemove: () => void) => (
    <div className="flex items-center justify-between p-2 border rounded">
      <div className="flex items-center space-x-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatarUrl} />
          <AvatarFallback>
            {user.firstName.charAt(0)}{user.lastName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            {user.email}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );

  const renderUserSearch = (placeholder: string, filterRole: 'coach' | 'client') => (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      {searchTerm && availableUsers && (
        <div className="border rounded-md max-h-32 overflow-y-auto">
          {availableUsers
            .filter(u => u.role === filterRole)
            .map((user) => (
              <button
                key={user.id}
                type="button"
                className="w-full flex items-center space-x-2 p-2 hover:bg-muted text-left"
                onClick={() => selectUser(user)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatarUrl} />
                  <AvatarFallback>
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Participants</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Coach Selection */}
        {currentUser?.role !== 'coach' && (
          <div>
            <Label>Coach</Label>
            {formData.coachId ? 
              renderUserCard(
                getSelectedUser(formData.coachId)!,
                true,
                () => onFieldChange('coachId', '')
              ) :
              renderUserSearch("Search for a coach...", 'coach')
            }
          </div>
        )}

        {/* Client Selection */}
        {currentUser?.role !== 'client' && (
          <div>
            <Label>Client</Label>
            {formData.clientId ? 
              renderUserCard(
                getSelectedUser(formData.clientId)!,
                true,
                () => onFieldChange('clientId', '')
              ) :
              renderUserSearch("Search for a client...", 'client')
            }
          </div>
        )}

        {/* Show current user if they're a participant */}
        {currentUser && (currentUser.role === 'coach' || currentUser.role === 'client') && (
          <div>
            <Label>
              {currentUser.role === 'coach' ? 'Coach' : 'Client'} (You)
            </Label>
            <div className="flex items-center space-x-2 p-2 border rounded bg-muted/50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentUser.avatarUrl} />
                <AvatarFallback>
                  {currentUser.firstName?.charAt(0)}{currentUser.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {currentUser.firstName} {currentUser.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentUser.email}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}