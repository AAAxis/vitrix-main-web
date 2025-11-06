import React, { useState, useEffect } from 'react';
import { WeightEntry, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Scale, TrendingUp, TrendingDown, Calendar, Target } from 'lucide-react';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { he } from 'date-fns/locale';

// WeightReminder entity will be created separately
const WeightReminder = {
  filter: async (filters, sort) => {
    // Temporary mock - will be replaced with actual entity
    return [];
  },
  create: async (data) => {
    // Temporary mock - will be replaced with actual entity
    console.log('Creating reminder:', data);
    return { id: Date.now(), ...data };
  },
  update: async (id, data) => {
    // Temporary mock - will be replaced with actual entity
    console.log('Updating reminder:', id, data);
    return { id, ...data };
  }
};

export default function WeightReminderComponent({ user }) {
  const [reminder, setReminder] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [showReminder, setShowReminder] = useState(false);
  const [showMonthlySummary, setShowMonthlySummary] = useState(false);

  useEffect(() => {
    if (user?.email) {
      checkForReminders();
      checkForMonthlySummary();
    }
  }, [user]);

  const checkForReminders = async () => {
    try {
      // Get latest weight entry
      const entries = await WeightEntry.filter({ user_email: user.email }, "-date", 1);
      if (entries.length === 0) return;

      const latestEntry = entries[0];
      const daysSinceUpdate = differenceInDays(new Date(), parseISO(latestEntry.date));

      // Check if 7 days have passed
      if (daysSinceUpdate >= 7) {
        // Check if reminder already exists and is active
        const existingReminders = await WeightReminder.filter({ 
          user_email: user.email, 
          is_dismissed: false 
        });

        if (existingReminders.length === 0) {
          // Create new reminder
          const newReminder = await WeightReminder.create({
            user_email: user.email,
            message: "הגיע הזמן לעדכן את משקל הגוף השבועי. יש להזין את המשקל הנוכחי למעקב.",
            days_since_last_update: daysSinceUpdate,
            reminder_date: new Date().toISOString()
          });
          setReminder(newReminder);
          setShowReminder(true);
        } else {
          setReminder(existingReminders[0]);
          setShowReminder(true);
        }
      }
    } catch (error) {
      console.error("Error checking reminders:", error);
    }
  };

  const checkForMonthlySummary = async () => {
    try {
      const now = new Date();
      const currentMonth = startOfMonth(now);
      const previousMonth = startOfMonth(subMonths(now, 1));
      const endPreviousMonth = endOfMonth(subMonths(now, 1));

      // Get entries for current and previous month
      const allEntries = await WeightEntry.filter({ user_email: user.email }, "-date");
      
      const currentMonthEntries = allEntries.filter(entry => {
        const entryDate = parseISO(entry.date);
        return entryDate >= currentMonth;
      });

      const previousMonthEntries = allEntries.filter(entry => {
        const entryDate = parseISO(entry.date);
        return entryDate >= previousMonth && entryDate <= endPreviousMonth;
      });

      if (currentMonthEntries.length > 0 && previousMonthEntries.length > 0) {
        const currentWeight = currentMonthEntries[0].weight;
        const previousWeight = previousMonthEntries[0].weight;
        const change = currentWeight - previousWeight;

        setMonthlySummary({
          currentWeight,
          previousWeight,
          change,
          month: format(subMonths(now, 1), 'MMMM yyyy', { locale: he })
        });

        // Show monthly summary only at the beginning of the month
        if (now.getDate() <= 3) {
          setShowMonthlySummary(true);
        }
      }
    } catch (error) {
      console.error("Error checking monthly summary:", error);
    }
  };

  const dismissReminder = async () => {
    if (reminder) {
      try {
        await WeightReminder.update(reminder.id, { is_dismissed: true });
        setShowReminder(false);
      } catch (error) {
        console.error("Error dismissing reminder:", error);
      }
    }
  };

  const dismissMonthlySummary = () => {
    setShowMonthlySummary(false);
  };

  if (!showReminder && !showMonthlySummary) return null;

  return (
    <div className="space-y-4">
      {/* Weekly Reminder */}
      {showReminder && reminder && (
        <Card className="border-l-4 border-orange-500 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Bell className="w-5 h-5" />
              תזכורת עדכון משקל שבועי
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-orange-700">{reminder.message}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  {reminder.days_since_last_update} ימים מהעדכון האחרון
                </Badge>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => window.location.href = '/Progress'}
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <Scale className="w-4 h-4 mr-2" />
                  עדכן משקל עכשיו
                </Button>
                <Button variant="outline" onClick={dismissReminder}>
                  דחה תזכורת
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Summary */}
      {showMonthlySummary && monthlySummary && (
        <Card className="border-l-4 border-blue-500 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Target className="w-5 h-5" />
              סיכום חודשי - {monthlySummary.month}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-blue-700">כך השתנה המשקל שלך החודש:</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600">משקל נוכחי</p>
                  <p className="text-2xl font-bold text-blue-600">{monthlySummary.currentWeight} ק"ג</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600">שינוי החודש</p>
                  <div className="flex items-center justify-center gap-1">
                    {monthlySummary.change > 0 ? (
                      <TrendingUp className="w-5 h-5 text-red-500" />
                    ) : monthlySummary.change < 0 ? (
                      <TrendingDown className="w-5 h-5 text-green-500" />
                    ) : null}
                    <p className={`text-2xl font-bold ${
                      monthlySummary.change > 0 ? 'text-red-500' : 
                      monthlySummary.change < 0 ? 'text-green-500' : 'text-gray-500'
                    }`}>
                      {monthlySummary.change > 0 ? '+' : ''}{monthlySummary.change.toFixed(1)} ק"ג
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={() => window.location.href = '/Progress'}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  צפה בגרף מלא
                </Button>
                <Button variant="outline" onClick={dismissMonthlySummary}>
                  סגור סיכום
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}