import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import BoosterEventsCalendar from '../components/progress/BoosterEventsCalendar';

export default function BoosterEvents() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6" dir="rtl">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
          🚀 לוח אירועים - בוסטרים מחזור 8
        </h1>
        <p className="text-slate-600 mt-3 max-w-2xl mx-auto">
          כאן תוכל לראות את כל האירועים המיוחדים, המפגשים והחגיגות המיועדים למשתתפי הבוסטר מחזור 8.
        </p>
      </div>
      
      <Card className="muscle-glass border-0 shadow-lg">
        <CardContent className="p-6">
          <BoosterEventsCalendar />
        </CardContent>
      </Card>
    </div>
  );
}