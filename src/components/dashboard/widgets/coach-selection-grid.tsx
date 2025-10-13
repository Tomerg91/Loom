import { MapPin, Star } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


import { Coach } from '../shared/types';
import { formatPrice } from '../shared/utils';

interface CoachSelectionGridProps {
  coaches: Coach[];
  onSelectCoach: (coach: Coach) => void;
}

export function CoachSelectionGrid({ coaches, onSelectCoach }: CoachSelectionGridProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Choose Your Coach</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {coaches.map((coach) => (
          <Card key={coach.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => onSelectCoach(coach)}>
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
  );
}