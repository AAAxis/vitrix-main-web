import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LockedNutrition({ onUnlock }) {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const NUTRITION_ACCESS_CODE = "22061";

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    setTimeout(() => {
      if (accessCode === NUTRITION_ACCESS_CODE) {
        onUnlock();
      } else {
        setError('קוד שגוי. נסה שוב.');
        setAccessCode('');
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-lime-50 to-yellow-50 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="muscle-glass border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-lime-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
              🥗 תזונה בראש
            </CardTitle>
            <p className="text-lg font-semibold text-slate-700 mt-2">BOOST YOURSELF</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">הזן קוד גישה</h3>
              <p className="text-sm text-slate-600">נדרש קוד מיוחד לגישה למאגר המתכונים</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value);
                    setError('');
                  }}
                  placeholder="*****"
                  className="text-center text-lg font-mono tracking-widest"
                  maxLength={5}
                  disabled={isLoading}
                />
                {error && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={accessCode.length !== 5 || isLoading}
                className="w-full muscle-primary-gradient text-white text-lg py-3"
              >
                {isLoading ? "בודק..." : "כניסה"}
              </Button>
            </form>

            <div className="text-center space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-semibold text-green-800 mb-2">📦 בקרוב:</h4>
                <p className="text-sm text-green-700">
                  אפליקציית תזונה מותאמת אישית עם מאגר מתכונים עשיר ומערכת מעקב תזונתית מתקדמת
                </p>
              </div>
              
              <p className="text-xs text-slate-500">
                הישארו מעודכנים... 🚀
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}