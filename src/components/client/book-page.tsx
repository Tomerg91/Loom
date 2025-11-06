'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  Calendar,
  Clock,
  Star,
  MapPin,
  Video,
  Phone,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { logger } from '@/lib/logger';


interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  avatarUrl?: string;
  specialties: string[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  location: string;
  bio: string;
}

interface TimeSlot {
  id: string;
  coachId: string;
  date: string;
  time: string;
  duration: number;
  available: boolean;
  sessionType: 'video' | 'phone' | 'in-person';
}

interface BookingForm {
  coachId: string;
  timeSlotId: string;
  sessionType: 'video' | 'phone' | 'in-person';
  goals: string;
  notes: string;
  preferredCommunication: string;
}

export function ClientBookPage() {
  const t = useTranslations('client.book');
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    coachId: '',
    timeSlotId: '',
    sessionType: 'video',
    goals: '',
    notes: '',
    preferredCommunication: 'email',
  });
  const [bookingStep, setBookingStep] = useState(1); // 1: Select Coach, 2: Select Time, 3: Session Details, 4: Confirmation

  // Real coaches data from API
  const { data: coaches, isLoading: coachesLoading } = useQuery<Coach[]>({
    queryKey: ['available-coaches-booking'],
    queryFn: async () => {
      const response = await fetch('/api/coaches');
      if (!response.ok) {
        throw new Error('Failed to fetch coaches');
      }
      const data = await response.json();
      return data.data || [];
    },
  });

  // Real time slots data from availability API
  const { data: timeSlots } = useQuery<TimeSlot[]>({
    queryKey: ['time-slots', selectedCoach?.id],
    queryFn: async () => {
      if (!selectedCoach) return [];
      
      const slots: TimeSlot[] = [];
      const startDate = new Date();
      
      // Fetch availability for the next 7 days
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        
        // Skip weekends for this example
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          const response = await fetch(`/api/coaches/${selectedCoach.id}/availability?date=${dateStr}&duration=60`);
          if (response.ok) {
            const availabilityData = await response.json();
            const daySlots = availabilityData.data || [];
            
            daySlots.forEach((slot: any) => {
              slots.push({
                id: `${selectedCoach.id}-${dateStr}-${slot.time}`,
                coachId: selectedCoach.id,
                date: date.toISOString(),
                time: slot.time,
                duration: 60,
                available: slot.available,
                sessionType: 'video',
              });
            });
          }
        } catch (error) {
          logger.error(`Failed to fetch availability for ${dateStr}:`, error);
          // Fallback to some default times if API fails
          const timeOptions = ['09:00', '14:00', '16:00'];
          timeOptions.forEach((time) => {
            slots.push({
              id: `${selectedCoach.id}-${dateStr}-${time}`,
              coachId: selectedCoach.id,
              date: date.toISOString(),
              time,
              duration: 60,
              available: true,
              sessionType: 'video',
            });
          });
        }
      }
      
      return slots;
    },
    enabled: !!selectedCoach,
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleCoachSelect = (coach: Coach) => {
    setSelectedCoach(coach);
    setBookingForm(prev => ({ ...prev, coachId: coach.id }));
    setBookingStep(2);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return;
    
    setSelectedSlot(slot);
    setBookingForm(prev => ({
      ...prev,
      timeSlotId: slot.id,
      sessionType: slot.sessionType,
    }));
    setBookingStep(3);
  };

  const handleBookingSubmit = async () => {
    if (!selectedCoach || !selectedSlot) {
      logger.error('Missing coach or slot information');
      return;
    }

    try {
      // Prepare booking data for API
      const bookingData = {
        coachId: selectedCoach.id,
        title: `${bookingForm.sessionType} Session with ${selectedCoach.firstName} ${selectedCoach.lastName}`,
        description: `Session goals: ${bookingForm.goals}\nAdditional notes: ${bookingForm.notes}`,
        scheduledAt: new Date(`${selectedSlot.date.split('T')[0]}T${selectedSlot.time}:00.000Z`).toISOString(),
        durationMinutes: selectedSlot.duration,
      };

      const response = await fetch('/api/sessions/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to book session');
      }

      const result = await response.json();
      logger.debug('Session booked successfully:', result);
      setBookingStep(4);
    } catch (error) {
      logger.error('Booking failed:', error);
      // In a real app, you would show an error message to the user
      alert('Booking failed. Please try again.');
    }
  };

  const resetBooking = () => {
    setSelectedCoach(null);
    setSelectedSlot(null);
    setBookingForm({
      coachId: '',
      timeSlotId: '',
      sessionType: 'video',
      goals: '',
      notes: '',
      preferredCommunication: 'email',
    });
    setBookingStep(1);
  };

  if (coachesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      {/* Booking Steps Indicator */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  bookingStep >= step 
                    ? 'bg-primary border-primary text-white' 
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {bookingStep > step ? <Check className="w-4 h-4" /> : step}
                </div>
                <div className="ml-2">
                  <p className={`text-sm font-medium ${
                    bookingStep >= step ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step === 1 && 'Select Coach'}
                    {step === 2 && 'Choose Time'}
                    {step === 3 && 'Session Details'}
                    {step === 4 && 'Confirmation'}
                  </p>
                </div>
                {step < 4 && (
                  <ChevronRight className="w-4 h-4 mx-4 text-muted-foreground" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Coach Selection */}
      {bookingStep === 1 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Choose Your Coach</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {coaches?.map((coach) => (
              <Card key={coach.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleCoachSelect(coach)}>
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={coach.avatarUrl} alt={`${coach.firstName} ${coach.lastName}`} />
                      <AvatarFallback className="text-lg">
                        {coach.firstName.charAt(0)}{coach.lastName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{coach.firstName} {coach.lastName}</CardTitle>
                      <p className="text-sm text-muted-foreground font-medium">{coach.title}</p>
                      <div className="flex items-center mt-1">
                        <MapPin className="h-4 w-4 text-muted-foreground mr-1" />
                        <span className="text-sm text-muted-foreground">{coach.location}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center mb-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                        <span className="font-medium">{coach.rating}</span>
                        <span className="text-sm text-muted-foreground ml-1">({coach.reviewCount})</span>
                      </div>
                      <p className="text-lg font-bold text-primary">{formatPrice(coach.hourlyRate)}/hr</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{coach.bio}</p>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Specialties</h4>
                    <div className="flex flex-wrap gap-1">
                      {coach.specialties.map((specialty, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button className="w-full">
                    Select {coach.firstName}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Time Selection */}
      {bookingStep === 2 && selectedCoach && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Select Date &amp; Time</h2>
              <p className="text-muted-foreground">
                Booking with {selectedCoach.firstName} {selectedCoach.lastName}
              </p>
            </div>
            <Button variant="outline" onClick={() => setBookingStep(1)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Change Coach
            </Button>
          </div>

          {/* Calendar Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Available Time Slots</CardTitle>
              <CardDescription>Select your preferred date and time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {timeSlots && [...new Set(timeSlots.map(slot => slot.date.split('T')[0]))].map((date) => {
                  const daySlots = timeSlots.filter(slot => slot.date.startsWith(date));
                  const dateObj = new Date(date);
                  
                  return (
                    <div key={date} className="space-y-2">
                      <h4 className="font-medium text-center text-sm">
                        {formatDate(dateObj.toISOString())}
                      </h4>
                      <div className="space-y-1">
                        {daySlots.map((slot) => (
                          <Button
                            key={slot.id}
                            variant={slot.available ? "outline" : "ghost"}
                            size="sm"
                            className={`w-full text-xs ${
                              !slot.available ? 'opacity-50 cursor-not-allowed' : ''
                            } ${
                              selectedSlot?.id === slot.id ? 'bg-primary text-white' : ''
                            }`}
                            disabled={!slot.available}
                            onClick={() => handleSlotSelect(slot)}
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Session Details */}
      {bookingStep === 3 && selectedCoach && selectedSlot && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Session Details</h2>
              <p className="text-muted-foreground">
                {formatDate(selectedSlot.date)} at {selectedSlot.time} with {selectedCoach.firstName} {selectedCoach.lastName}
              </p>
            </div>
            <Button variant="outline" onClick={() => setBookingStep(2)}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Change Time
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Form */}
            <Card>
              <CardHeader>
                <CardTitle>Tell us about your goals</CardTitle>
                <CardDescription>Help your coach prepare for your session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="sessionType">Session Type</Label>
                  <Select value={bookingForm.sessionType} onValueChange={(value: 'video' | 'phone' | 'in-person') => setBookingForm(prev => ({ ...prev, sessionType: value }))}>
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

                <div>
                  <Label htmlFor="goals">What would you like to focus on?</Label>
                  <Textarea
                    id="goals"
                    placeholder="e.g., I want to improve my leadership skills and work on team communication..."
                    value={bookingForm.goals}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, goals: e.target.value }))}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional information you'd like your coach to know..."
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="communication">Preferred Communication</Label>
                  <Select value={bookingForm.preferredCommunication} onValueChange={(value) => setBookingForm(prev => ({ ...prev, preferredCommunication: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="sms">Text Message</SelectItem>
                      <SelectItem value="app">In-App Notifications</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={handleBookingSubmit}>
                  Confirm Booking
                </Button>
              </CardContent>
            </Card>

            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedCoach.avatarUrl} alt={`${selectedCoach.firstName} ${selectedCoach.lastName}`} />
                    <AvatarFallback>
                      {selectedCoach.firstName.charAt(0)}{selectedCoach.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedCoach.firstName} {selectedCoach.lastName}</p>
                    <p className="text-sm text-muted-foreground">{selectedCoach.title}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date:</span>
                    <span className="font-medium">{formatDate(selectedSlot.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time:</span>
                    <span className="font-medium">{selectedSlot.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium">{selectedSlot.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Session Type:</span>
                    <span className="font-medium capitalize">{bookingForm.sessionType.replace('-', ' ')}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total:</span>
                    <span className="font-bold text-lg">{formatPrice(selectedCoach.hourlyRate)}</span>
                  </div>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Cancellation Policy</p>
                      <p>Free cancellation up to 24 hours before your session. Cancellations within 24 hours may incur a fee.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {bookingStep === 4 && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
                  <p className="text-muted-foreground">
                    Your session with {selectedCoach?.firstName} {selectedCoach?.lastName} has been booked successfully.
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">What&apos;s Next?</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• You&apos;ll receive a confirmation email with session details</li>
                    <li>• Your coach will send you a preparation guide</li>
                    <li>• You&apos;ll get a reminder 24 hours before your session</li>
                    <li>• Session link will be available 15 minutes before start time</li>
                  </ul>
                </div>

                <div className="flex gap-4 justify-center">
                  <Button onClick={() => window.location.href = '/dashboard'}>
                    <Calendar className="mr-2 h-4 w-4" />
                    View in Dashboard
                  </Button>
                  <Button variant="outline" onClick={resetBooking}>
                    Book Another Session
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Export as default for dynamic imports
export default ClientBookPage;