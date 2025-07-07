'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Users, 
  Search, 
  Star,
  Calendar,
  MessageSquare,
  MapPin,
  Award,
  BookOpen,
  Heart,
  Filter
} from 'lucide-react';

interface Coach {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  title: string;
  bio: string;
  specialties: string[];
  experience: number; // years
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  location: string;
  languages: string[];
  availability: {
    timezone: string;
    slots: Array<{
      day: string;
      times: string[];
    }>;
  };
  credentials: string[];
  approach: string;
  successStories: number;
}

export function ClientCoachesPage() {
  const t = useTranslations('client.coaches');
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');

  // Mock data - in real app, this would come from an API
  const { data: coaches, isLoading, error } = useQuery<Coach[]>({
    queryKey: ['available-coaches', searchTerm, specialtyFilter, ratingFilter, priceFilter],
    queryFn: async () => {
      // Mock API call
      return [
        {
          id: '1',
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'sarah.johnson@loom.com',
          title: 'Executive Leadership Coach',
          bio: 'Experienced executive coach specializing in leadership development and career transitions. I help professionals unlock their potential and achieve their career goals.',
          specialties: ['Leadership Development', 'Career Coaching', 'Executive Presence'],
          experience: 8,
          rating: 4.9,
          reviewCount: 127,
          hourlyRate: 150,
          location: 'New York, NY',
          languages: ['English', 'Spanish'],
          availability: {
            timezone: 'EST',
            slots: [
              { day: 'Monday', times: ['09:00', '14:00', '16:00'] },
              { day: 'Tuesday', times: ['10:00', '15:00'] },
              { day: 'Wednesday', times: ['09:00', '13:00', '17:00'] },
            ],
          },
          credentials: ['ICF PCC', 'MBA', 'Leadership Certified'],
          approach: 'Solution-focused coaching with a blend of strategic thinking and emotional intelligence development.',
          successStories: 89,
        },
        {
          id: '2',
          firstName: 'Michael',
          lastName: 'Chen',
          email: 'michael.chen@loom.com',
          title: 'Life &amp; Wellness Coach',
          bio: 'Passionate about helping individuals achieve work-life balance and personal fulfillment. Specialized in stress management and holistic wellness approaches.',
          specialties: ['Work-Life Balance', 'Stress Management', 'Mindfulness'],
          experience: 5,
          rating: 4.7,
          reviewCount: 85,
          hourlyRate: 120,
          location: 'San Francisco, CA',
          languages: ['English', 'Mandarin'],
          availability: {
            timezone: 'PST',
            slots: [
              { day: 'Monday', times: ['08:00', '12:00', '18:00'] },
              { day: 'Thursday', times: ['09:00', '14:00'] },
              { day: 'Friday', times: ['10:00', '15:00', '19:00'] },
            ],
          },
          credentials: ['ICF ACC', 'Wellness Certified', 'Mindfulness Teacher'],
          approach: 'Holistic approach combining mindfulness practices with practical life strategies.',
          successStories: 67,
        },
        {
          id: '3',
          firstName: 'Emily',
          lastName: 'Rodriguez',
          email: 'emily.rodriguez@loom.com',
          title: 'Career Transition Specialist',
          bio: 'Dedicated to helping professionals navigate career changes and find their true calling. Expert in career assessment and transition planning.',
          specialties: ['Career Transition', 'Professional Development', 'Skills Assessment'],
          experience: 6,
          rating: 4.8,
          reviewCount: 93,
          hourlyRate: 135,
          location: 'Austin, TX',
          languages: ['English'],
          availability: {
            timezone: 'CST',
            slots: [
              { day: 'Tuesday', times: ['11:00', '16:00'] },
              { day: 'Wednesday', times: ['09:00', '14:00', '17:00'] },
              { day: 'Thursday', times: ['10:00', '15:00'] },
            ],
          },
          credentials: ['ICF PCC', 'Career Development Facilitator', 'Assessment Certified'],
          approach: 'Data-driven approach using assessments and structured planning for successful transitions.',
          successStories: 74,
        },
      ];
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const filteredCoaches = coaches?.filter(coach => {
    const matchesSearch = 
      `${coach.firstName} ${coach.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coach.specialties.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesSpecialty = specialtyFilter === 'all' || 
      coach.specialties.some(s => s.toLowerCase().includes(specialtyFilter.toLowerCase()));
    
    const matchesRating = ratingFilter === 'all' || 
      (ratingFilter === '4+' && coach.rating >= 4) ||
      (ratingFilter === '4.5+' && coach.rating >= 4.5);
    
    const matchesPrice = priceFilter === 'all' ||
      (priceFilter === 'under100' && coach.hourlyRate < 100) ||
      (priceFilter === '100-150' && coach.hourlyRate >= 100 && coach.hourlyRate <= 150) ||
      (priceFilter === 'over150' && coach.hourlyRate > 150);
    
    return matchesSearch && matchesSpecialty && matchesRating && matchesPrice;
  });

  if (isLoading) {
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('description')}</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <p className="text-destructive">Error loading coaches</p>
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

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Coaches</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coaches?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coaches?.length ? 
                (coaches.reduce((sum, c) => sum + c.rating, 0) / coaches.length).toFixed(1) :
                '0.0'
              }
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Specialties</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coaches ? new Set(coaches.flatMap(c => c.specialties)).size : 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Stories</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {coaches?.reduce((sum, c) => sum + c.successStories, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Find Your Perfect Coach
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search coaches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by specialty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                <SelectItem value="leadership">Leadership Development</SelectItem>
                <SelectItem value="career">Career Coaching</SelectItem>
                <SelectItem value="wellness">Work-Life Balance</SelectItem>
                <SelectItem value="transition">Career Transition</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="4.5+">4.5+ Stars</SelectItem>
                <SelectItem value="4+">4+ Stars</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={priceFilter} onValueChange={setPriceFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by price" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Prices</SelectItem>
                <SelectItem value="under100">Under $100/hr</SelectItem>
                <SelectItem value="100-150">$100-150/hr</SelectItem>
                <SelectItem value="over150">Over $150/hr</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Coaches Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCoaches?.map((coach) => (
          <Card key={coach.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={coach.avatarUrl} alt={`${coach.firstName} ${coach.lastName}`} />
                    <AvatarFallback className="text-lg">
                      {coach.firstName.charAt(0)}{coach.lastName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-xl">{coach.firstName} {coach.lastName}</CardTitle>
                    <p className="text-sm text-muted-foreground font-medium">{coach.title}</p>
                    <div className="flex items-center mt-1">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-1" />
                      <span className="text-sm text-muted-foreground">{coach.location}</span>
                    </div>
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
            <CardContent className="space-y-4">
              {/* Bio */}
              <p className="text-sm text-muted-foreground leading-relaxed">{coach.bio}</p>

              {/* Specialties */}
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

              {/* Credentials */}
              <div>
                <h4 className="text-sm font-medium mb-2">Credentials</h4>
                <div className="flex flex-wrap gap-1">
                  {coach.credentials.map((credential, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      <Award className="h-3 w-3 mr-1" />
                      {credential}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 text-center py-3 border-t border-b">
                <div>
                  <p className="text-lg font-bold text-primary">{coach.experience}</p>
                  <p className="text-xs text-muted-foreground">Years Experience</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{coach.successStories}</p>
                  <p className="text-xs text-muted-foreground">Success Stories</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-primary">{coach.languages.length}</p>
                  <p className="text-xs text-muted-foreground">Languages</p>
                </div>
              </div>

              {/* Languages */}
              <div>
                <h4 className="text-sm font-medium mb-2">Languages</h4>
                <p className="text-sm text-muted-foreground">{coach.languages.join(', ')}</p>
              </div>

              {/* Approach */}
              <div>
                <h4 className="text-sm font-medium mb-2">Coaching Approach</h4>
                <p className="text-sm text-muted-foreground italic">&quot;{coach.approach}&quot;</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button className="flex-1">
                  <Calendar className="mr-2 h-4 w-4" />
                  Book Session
                </Button>
                <Button variant="outline" className="flex-1">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Send Message
                </Button>
                <Button variant="outline" size="sm">
                  <BookOpen className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredCoaches?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No coaches found</h3>
            <p className="text-muted-foreground text-center mb-4">
              Try adjusting your filters or search terms to find the perfect coach for you.
            </p>
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setSpecialtyFilter('all');
                setRatingFilter('all');
                setPriceFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}