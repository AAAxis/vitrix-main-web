import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-green-50 to-lime-50 p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="max-w-lg w-full text-center shadow-2xl border-t-4 border-emerald-500">
          <CardHeader>
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <Rocket className="w-8 h-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800">
              שלב הבוסטר הושלם בהצלחה!
            </CardTitle>
            <CardDescription className="text-slate-600 mt-2">
              כל הכבוד על 12 שבועות של עבודה קשה, התמדה והישגים.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-700" />
                <p className="text-green-800 font-semibold">המשוב שלך נשלח למאמן!</p>
              </div>
            </div>
            
            <div className="text-slate-700 space-y-2">
              <p>הגעת לסוף תוכנית הבוסטר, אבל המסע שלך רק מתחיל.</p>
              <p>כעת, ניכנס יחד ל**שלב התחזוקה**, בו ניישם את כל מה שלמדנו כדי לשמר את ההישגים ולהמשיך להתקדם.</p>
              <p className="font-semibold text-blue-600">המאמן שלך יצור איתך קשר בקרוב עם הנחיות להמשך הדרך.</p>
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs text-slate-400">
                MUSCLE UP YAVNE • Better Than Yesterday
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}