import React from 'react';
import WorkoutPlanner from '../components/workout/WorkoutPlanner';
import { Card, CardContent } from '@/components/ui/card';

export default function ExercisesSetup() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6" dir="rtl">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 via-yellow-500 to-blue-500 bg-clip-text text-transparent">
          תכנון ובניית אימון
        </h1>
        <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
          כאן תוכל לבנות אימון חדש בעזרת בינה מלאכותית, ליצור אימון מותאם אישית באופן ידני, או לטעון תבנית קיימת שהכנת מראש.
        </p>
      </div>
      <Card className="muscle-glass border-0 shadow-lg">
        <CardContent className="p-6">
            <WorkoutPlanner />
        </CardContent>
      </Card>
    </div>
  );
}