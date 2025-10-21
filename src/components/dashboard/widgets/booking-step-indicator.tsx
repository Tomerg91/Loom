import { Check, ChevronRight } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface BookingStepIndicatorProps {
  currentStep: number;
  steps: string[];
}

export function BookingStepIndicator({ currentStep, steps }: BookingStepIndicatorProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          {steps.map((stepName, index) => {
            const stepNumber = index + 1;
            return (
              <div key={stepNumber} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  currentStep >= stepNumber 
                    ? 'bg-primary border-primary text-white' 
                    : 'border-muted-foreground text-muted-foreground'
                }`}>
                  {currentStep > stepNumber ? <Check className="w-4 h-4" /> : stepNumber}
                </div>
                <div className="ml-2">
                  <p className={`text-sm font-medium ${
                    currentStep >= stepNumber ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {stepName}
                  </p>
                </div>
                {stepNumber < steps.length && (
                  <ChevronRight className="w-4 h-4 mx-4 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}