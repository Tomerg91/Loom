'use client';

import { useQueryClient, useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { Calendar, Loader2, Clock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';


interface AddSessionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachId?: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
}

export function AddSessionModal({ open, onOpenChange, coachId }: AddSessionModalProps) {
  const t = useTranslations('coach.addSession');
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientId: '',
    title: '',
    scheduledDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    scheduledTime: '10:00',
    durationMinutes: '60',
    meetingUrl: '',
  });

  // Fetch available clients
  const { data: clients } = useQuery({
    queryKey: ['coach-clients-list', coachId],
    queryFn: async (): Promise<Client[]> => {
      const response = await fetch('/api/coach/clients');
      if (!response.ok) throw new Error('Failed to fetch clients');
      const data = await response.json();
      return data.data;
    },
    enabled: open && !!coachId,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`).toISOString();

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: formData.clientId,
          title: formData.title,
          scheduledAt,
          durationMinutes: parseInt(formData.durationMinutes, 10),
          meetingUrl: formData.meetingUrl || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create session');
      }

      // Refresh dashboard data
      queryClient.invalidateQueries({ queryKey: ['coach-stats'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activity'] });

      const client = clients?.find((c) => c.id === formData.clientId);
      toast.success(t('success', { client: `${client?.firstName} ${client?.lastName}` }));

      // Reset form and close modal
      setFormData({
        clientId: '',
        title: '',
        scheduledDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        scheduledTime: '10:00',
        durationMinutes: '60',
        meetingUrl: '',
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sand-900">
            <Calendar className="h-5 w-5 text-teal-600" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-sand-500">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="client" className="text-sand-700">
              {t('client')} <span className="text-terracotta-500">*</span>
            </Label>
            <Select
              required
              value={formData.clientId}
              onValueChange={(value) => setFormData({ ...formData, clientId: value })}
              disabled={loading || !clients?.length}
            >
              <SelectTrigger className="border-sand-300 focus:border-teal-400">
                <SelectValue placeholder={t('selectClient')} />
              </SelectTrigger>
              <SelectContent>
                {clients?.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!clients?.length && (
              <p className="text-xs text-terracotta-500">{t('noClients')}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title" className="text-sand-700">
              {t('sessionTitle')} <span className="text-terracotta-500">*</span>
            </Label>
            <Input
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t('titlePlaceholder')}
              disabled={loading}
              className="border-sand-300 focus:border-teal-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sand-700">
                {t('date')} <span className="text-terracotta-500">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                required
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                disabled={loading}
                className="border-sand-300 focus:border-teal-400"
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="time" className="text-sand-700">
                {t('time')} <span className="text-terracotta-500">*</span>
              </Label>
              <Input
                id="time"
                type="time"
                required
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                disabled={loading}
                className="border-sand-300 focus:border-teal-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sand-700">
              {t('duration')} <span className="text-terracotta-500">*</span>
            </Label>
            <Select
              required
              value={formData.durationMinutes}
              onValueChange={(value) => setFormData({ ...formData, durationMinutes: value })}
              disabled={loading}
            >
              <SelectTrigger className="border-sand-300 focus:border-teal-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 {t('minutes')}</SelectItem>
                <SelectItem value="45">45 {t('minutes')}</SelectItem>
                <SelectItem value="60">60 {t('minutes')}</SelectItem>
                <SelectItem value="90">90 {t('minutes')}</SelectItem>
                <SelectItem value="120">120 {t('minutes')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meetingUrl" className="text-sand-700">
              {t('meetingUrl')}
            </Label>
            <Input
              id="meetingUrl"
              type="url"
              value={formData.meetingUrl}
              onChange={(e) => setFormData({ ...formData, meetingUrl: e.target.value })}
              placeholder={t('meetingUrlPlaceholder')}
              disabled={loading}
              className="border-sand-300 focus:border-teal-400"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading || !clients?.length} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}