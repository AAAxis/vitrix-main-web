import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import PersonalContract from '../components/auth/PersonalContract';
import NetworkErrorDisplay from '../components/errors/NetworkErrorDisplay';

export default function Contract() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        
        // If user already signed contract, redirect to home
        if (currentUser.contract_signed) {
          window.location.href = createPageUrl('Home');
          return;
        }
      } catch (error) {
        console.error("Error loading user:", error);
        if (error.message?.includes('Network Error') || !navigator.onLine) {
          setNetworkError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleContractSigned = async (contractData) => {
    setIsUpdating(true);
    try {
      await User.updateMyUserData({
        contract_signed: true,
        contract_signed_date: new Date().toISOString(),
        contract_signature: contractData.signature,
        contract_full_name: contractData.fullName
      });

      // Redirect to home page after successful contract signing
      window.location.href = createPageUrl('Home');
    } catch (error) {
      console.error("Error saving contract:", error);
      alert("שגיאה בשמירת החוזה. אנא נסה שוב.");
    } finally {
      setIsUpdating(false);
    }
  };

  const retryLoad = () => {
    setNetworkError(false);
    window.location.reload();
  };

  if (networkError) {
    return <NetworkErrorDisplay onRetry={retryLoad} />;
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-lime-50" dir="rtl">
        <div className="relative">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d04615afd_.png"
            alt="טוען..."
            className="w-20 h-20 rounded-2xl object-contain animate-pulse"
          />
          <div className="absolute -inset-1 w-22 h-22 rounded-full border-4 border-blue-300 border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="text-center py-8">
            <p className="text-red-600">שגיאה בטעינת נתוני המשתמש</p>
            <Button onClick={retryLoad} className="mt-4">נסה שוב</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-lime-50 p-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d04615afd_.png"
            alt="MUSCLE UP YAVNE"
            className="w-16 h-16 rounded-2xl object-contain mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 via-yellow-500 to-blue-500 bg-clip-text text-transparent">
            חתימה על חוזה אישי
          </h1>
          <p className="text-slate-600 mt-2">
            שלב אחרון לפני תחילת המסע שלך ב-MUSCLE UP YAVNE
          </p>
        </div>

        <PersonalContract 
          user={user}
          onContractSigned={handleContractSigned}
          isUpdating={isUpdating}
        />
      </div>
    </div>
  );
}