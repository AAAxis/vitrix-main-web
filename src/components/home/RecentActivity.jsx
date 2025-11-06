
import React, { useState, useEffect, useCallback } from 'react';
import { Workout } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Clock, Calendar, AlertTriangle, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { formatDate } from '@/components/utils/timeUtils';

export default function RecentActivity({ user }) {
    const [recentWorkouts, setRecentWorkouts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [networkError, setNetworkError] = useState(false);
    const navigate = useNavigate();

    const loadRecentActivity = useCallback(async () => {
        setIsLoading(true);
        setNetworkError(false);
        try {
            const workouts = await Workout.filter(
                { created_by: user.email, status: 'הושלם' },
                '-date',
                3
            );
            setRecentWorkouts(workouts);
        } catch (error) {
            console.error('Error loading recent activity:', error);
            setNetworkError(true);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const safeFormatDate = useCallback((dateValue) => {
        if (!dateValue) return 'תאריך לא זמין';
        try {
            // Enhanced date formatting with multiple fallbacks
            if (typeof dateValue === 'string') {
                return formatDate(dateValue);
            } else if (dateValue instanceof Date) {
                return formatDate(dateValue.toISOString());
            } else if (typeof dateValue === 'object' && dateValue.toISOString) {
                return formatDate(dateValue.toISOString());
            }
            return 'תאריך לא תקין';
        } catch (error) {
            console.warn('Error formatting date:', dateValue, error);
            return 'תאריך לא תקין';
        }
    }, []);

    useEffect(() => {
        if (user?.email) {
            loadRecentActivity();
        }
    }, [user, loadRecentActivity]);

    if (isLoading) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>פעילות אחרונה</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>טוען פעילות...</p>
                </CardContent>
            </Card>
        );
    }

    if (networkError) {
        return (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                <Card className="bg-gradient-to-br from-white to-red-50 border border-red-200/80 shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl text-red-600">
                           <AlertTriangle className="w-5 h-5" />
                           שגיאת רשת
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-8">
                            <p className="text-slate-600 mb-4">לא ניתן היה לטעון פעילות אחרונה.</p>
                            <Button onClick={loadRecentActivity}>
                                <RefreshCw className="w-4 h-4 ml-2" />
                                נסה שוב
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    }
    
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-gradient-to-br from-white to-teal-50 border border-teal-200/80 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl text-slate-800">אימונים אחרונים</CardTitle>
                    <CardDescription>סיכום 3 האימונים האחרונים שלך.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {recentWorkouts.length > 0 ? (
                        recentWorkouts.map((workout, index) => (
                            <motion.div
                                key={workout.id}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.1 * index }}
                            >
                                <div className="p-4 border rounded-lg flex items-center justify-between muscle-card-variant-green">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-green-100 p-3 rounded-full">
                                            <Dumbbell className="w-6 h-6 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800">{workout.workout_type || 'אימון'}</p>
                                            <div className="text-sm text-slate-500 flex items-center gap-2">
                                                <Calendar className="w-4 h-4" />
                                                <span>{safeFormatDate(workout.date)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                         <Badge variant="outline" className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {workout.total_duration || '60'} דק'
                                        </Badge>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {workout.completion_rate || 100}% הושלם
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            <p>אין אימונים אחרונים להצגה.</p>
                            <p className="text-sm">השלם אימון כדי לראות אותו כאן!</p>
                        </div>
                    )}
                     <Button variant="link" className="w-full" onClick={() => navigate(createPageUrl('Journal'))}>
                        צפה בכל היסטוריית האימונים
                    </Button>
                </CardContent>
            </Card>
        </motion.div>
    );
}
