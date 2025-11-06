import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock } from 'lucide-react';

export default function LockedScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4" dir="rtl">
      <Card className="max-w-md w-full text-center shadow-2xl border-t-4 border-red-500">
        <CardHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">החשבון שלך הוקפא</CardTitle>
          <CardDescription className="text-slate-600 mt-2">
            הגישה שלך לאפליקציה הוקפאה זמנית.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-semibold mb-2">🚫 האפליקציה חסומה</p>
              <p className="text-red-600 text-sm">
                השימוש באפליקציה הושעה באופן זמני על ידי המאמן המלווה שלך.
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-700 font-semibold mb-2">📞 פנה למאמן</p>
              <p className="text-blue-600 text-sm">
                לקבלת פרטים נוספים ולשחרור החשבון, אנא פנה למאמן המלווה שלך.
              </p>
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400">
                MUSCLE UP YAVNE • Better Than Yesterday
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}