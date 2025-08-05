import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Video,
  Phone,
  MapPin,
} from 'lucide-react';
import { SessionFormData, SessionFormField } from '@/types';

interface SessionTypeSelectorProps {
  formData: SessionFormData;
  onFieldChange: (field: SessionFormField, value: string | number) => void;
}

export function SessionTypeSelector({ formData, onFieldChange }: SessionTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Type &amp; Location</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="sessionType">Session Type</Label>
          <Select 
            value={formData.sessionType} 
            onValueChange={(value: 'video' | 'phone' | 'in-person') => onFieldChange('sessionType', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">
                <div className="flex items-center">
                  <Video className="mr-2 h-4 w-4" />
                  Video Call
                </div>
              </SelectItem>
              <SelectItem value="phone">
                <div className="flex items-center">
                  <Phone className="mr-2 h-4 w-4" />
                  Phone Call
                </div>
              </SelectItem>
              <SelectItem value="in-person">
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4" />
                  In Person
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.sessionType === 'video' && (
          <div>
            <Label htmlFor="meetingUrl">Meeting URL</Label>
            <Input
              id="meetingUrl"
              type="url"
              value={formData.meetingUrl}
              onChange={(e) => onFieldChange('meetingUrl', e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </div>
        )}

        {formData.sessionType === 'in-person' && (
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => onFieldChange('location', e.target.value)}
              placeholder="Enter meeting location"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}