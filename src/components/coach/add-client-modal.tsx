'use client';

import { UserPlus, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'sonner';

import { apiPost } from '@/lib/api/client-api-request';
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


interface AddClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AddClientModal({ open, onOpenChange, onSuccess }: AddClientModalProps) {
  const t = useTranslations('coach.addClient');

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiPost('/api/coach/clients', formData);

      // Refresh dashboard data in parent context
      onSuccess?.();

      toast.success(t('success', { name: `${formData.firstName} ${formData.lastName}` }));

      // Reset form and close modal
      setFormData({ firstName: '', lastName: '', email: '', phone: '' });
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding client:', error);
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sand-900">
            <UserPlus className="h-5 w-5 text-teal-600" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-sand-500">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sand-700">
                {t('firstName')} <span className="text-terracotta-500">*</span>
              </Label>
              <Input
                id="firstName"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder={t('firstNamePlaceholder')}
                disabled={loading}
                className="border-sand-300 focus:border-teal-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sand-700">
                {t('lastName')} <span className="text-terracotta-500">*</span>
              </Label>
              <Input
                id="lastName"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder={t('lastNamePlaceholder')}
                disabled={loading}
                className="border-sand-300 focus:border-teal-400"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sand-700">
              {t('email')} <span className="text-terracotta-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('emailPlaceholder')}
              disabled={loading}
              className="border-sand-300 focus:border-teal-400"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sand-700">
              {t('phone')}
            </Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={t('phonePlaceholder')}
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
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}