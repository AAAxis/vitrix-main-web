import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, LogIn, UserCheck, Shield, Users, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LoginScreen() {
    const [isLoading, setIsLoading] = useState(false);
    const [loginError, setLoginError] = useState('');

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setLoginError('');
        try {
            await User.login();
            // On successful login, the user will be redirected automatically
            // by the platform or by a router guard.
        } catch (error) {
            console.error('Login error:', error);
            setLoginError('שגיאה בהתחברות. אנא נסה שוב.');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-lime-50 flex items-center justify-center p-4" dir="rtl">
            <div className="max-w-md w-full space-y-8">
                {/* Logo and Header */}
                <div className="text-center">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
                        <img 
                            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d04615afd_.png"
                            alt="Muscle Up Yavne"
                            className="w-12 h-12 rounded-2xl object-contain"
                        />
                    </div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 via-yellow-500 to-blue-500 bg-clip-text text-transparent">
                        MUSCLE UP YAVNE
                    </h1>
                    <p className="text-slate-600 mt-2 text-lg">Better Than Yesterday</p>
                </div>

                {/* Login Card */}
                <Card className="muscle-glass border-0 shadow-2xl">
                    <CardHeader className="text-center pb-4">
                        <CardTitle className="text-2xl font-bold text-slate-800">
                            ברוך הבא!
                        </CardTitle>
                        <CardDescription className="text-slate-600">
                            מערכת פרטית למתאמני המועדון בלבד.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {loginError && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                                <p className="text-red-600 text-sm">{loginError}</p>
                            </div>
                        )}

                        <Button
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full h-12 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 shadow-sm font-semibold flex items-center justify-center gap-3 transition-all duration-200"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                </svg>
                            )}
                            {isLoading ? 'מתחבר...' : 'התחבר עם Google'}
                        </Button>
                        
                        <div className="text-center text-xs text-slate-500">
                           <p>הגישה למערכת היא למורשים בלבד.</p>
                           <p>נתקלת בבעיה? פנה למאמן שלך.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}