
import React, { useState, useEffect, useCallback } from 'react';
import { PreMadeWorkout, Workout } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dumbbell, Play, Loader2, ChevronDown, RefreshCw, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Simple cache for coach workouts
const workoutCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Helper function for retry logic
const withRetry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = error.message?.includes('429') || error.message?.includes('Rate limit');
      if (isRateLimit && i < maxRetries - 1) {
        const delayTime = baseDelay * Math.pow(2, i);
        console.log(`Rate limit hit in CoachWorkouts, retrying in ${delayTime}ms (attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayTime));
        continue;
      }
      throw error;
    }
  }
};

export default function CoachWorkouts({ user }) {
  const [coachWorkouts, setCoachWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [startingWorkoutId, setStartingWorkoutId] = useState(null);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);
  const navigate = useNavigate();

  const loadWorkouts = useCallback(async () => {
    if (!user) return;
    
    const cacheKey = `workouts_${user.email}`;
    const cachedData = workoutCache.get(cacheKey);
    
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      setCoachWorkouts(cachedData.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    
    try {
      const workouts = await withRetry(async () => {
        return await PreMadeWorkout.filter(
          { target_user_email: user.email, is_accepted: false },
          '-created_date'
        );
      });
      
      // Cache the results
      workoutCache.set(cacheKey, {
        data: workouts,
        timestamp: Date.now()
      });
      
      setCoachWorkouts(workouts);
    } catch (error) {
      console.error('Error loading coach workouts:', error);
      setLoadError('שגיאה בטעינת אימונים מהמאמן');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const handleStartWorkout = async (preMadeWorkout) => {
    setStartingWorkoutId(preMadeWorkout.id);
    try {
      const existingActive = await Workout.filter({ created_by: user.email, status: 'פעיל' });
      if (existingActive.length > 0) {
        alert('יש לך כבר אימון פעיל. אנא סיים אותו לפני התחלת אימון חדש.');
        setStartingWorkoutId(null);
        return;
      }
      
      // Helper to add unique keys during creation
      const addKeys = (exercises, part) => (exercises || []).map((ex, i) => ({
          ...ex,
          key: `${part}-${ex.name || 'ex'}-${Date.now()}-${i}`
      }));
        
      const newWorkoutData = {
        date: new Date().toISOString().split('T')[0],
        workout_type: 'אימון כוח',
        status: 'פעיל',
        start_time: new Date().toISOString(),
        workout_description: preMadeWorkout.workout_description,
        notes: preMadeWorkout.coach_notes || '',
        warmup_description: preMadeWorkout.warmup_description,
        warmup_duration: preMadeWorkout.warmup_duration,
        warmup_completed: false,
        part_1_exercises: addKeys(preMadeWorkout.part_1_exercises, 'p1').map(ex => ({ ...ex, sets: [], completed: false, name: ex.name || '' })),
        part_2_exercises: addKeys(preMadeWorkout.part_2_exercises, 'p2').map(ex => ({ ...ex, sets: [], completed: false, name: ex.name || '' })),
        part_3_exercises: addKeys(preMadeWorkout.part_3_exercises, 'p3').map(ex => ({ ...ex, sets: [], completed: false, name: ex.name || '' })),
        exercises: addKeys(preMadeWorkout.exercises, 'ex').map(ex => ({ ...ex, sets: [], completed: false, name: ex.name || '' })),
      };

      await Workout.create(newWorkoutData);
      await PreMadeWorkout.update(preMadeWorkout.id, { is_accepted: true, accepted_date: new Date().toISOString() });

      // Clear cache after accepting workout
      workoutCache.clear();
      
      // Navigate to Journal page after a short delay to ensure state is updated
      setTimeout(() => navigate(createPageUrl('Journal')), 100);

    } catch (error) {
      console.error("Error starting workout:", error);
      alert('שגיאה בהתחלת האימון. נסה שוב.');
    } finally {
      setStartingWorkoutId(null);
    }
  };

  const handleToggleExpand = (workoutId) => {
    setExpandedWorkoutId(prevId => prevId === workoutId ? null : workoutId);
  };

  const handleRetryLoad = () => {
    workoutCache.clear();
    setLoadError(null);
    loadWorkouts();
  };

  if (loadError) {
    return (
      <Card className="bg-gradient-to-br from-white to-red-50 border border-red-200/80 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            שגיאה בטעינת אימונים
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-center">
          <p className="text-slate-600 mb-4">{loadError}</p>
          <Button onClick={handleRetryLoad} variant="outline">
            <RefreshCw className="w-4 h-4 ml-2" />
            נסה שוב
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-white/80 backdrop-blur-sm p-6 text-center">
        <CardContent className="p-0 text-center"> {/* Removed default padding, handled by Card's className */}
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
          <p className="text-slate-600 mt-2 text-sm">טוען אימונים מהמאמן...</p>
        </CardContent>
      </Card>
    );
  }

  if (coachWorkouts.length === 0) {
    return (
        <>
            {/* Desktop View */}
            <div className="hidden sm:block">
                <Card className="bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Dumbbell className="w-5 h-5 text-emerald-600" />
                        אימון שנשלח מהמאמן
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 flex items-center justify-center gap-3">
                        <p className="text-slate-600 font-medium">אין אימונים חדשים מהמאמן</p>
                    </CardContent>
                </Card>
            </div>

            {/* Mobile View - Shows nothing */}
            <div className="sm:hidden">
            </div>
        </>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-white to-green-50 border border-green-200/80 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Dumbbell className="w-5 h-5 text-emerald-600" />
          אימון שנשלח מהמאמן
        </CardTitle>
        <CardDescription>אימונים חדשים שהמאמן שלך שלח</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-60">
          <div className="space-y-3 pr-2">
            <AnimatePresence>
                {coachWorkouts.map(workout => (
                    <motion.div
                        key={workout.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                    >
                      <div className="p-3 bg-slate-100/70 rounded-lg">
                        <div 
                          className="flex items-center justify-between cursor-pointer" 
                          onClick={() => handleToggleExpand(workout.id)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{workout.workout_title}</p>
                          </div>
                          <motion.div animate={{ rotate: expandedWorkoutId === workout.id ? 180 : 0 }} transition={{ duration: 0.2 }}>
                            <ChevronDown className="w-5 h-5 text-slate-500" />
                          </motion.div>
                        </div>
                        
                        <AnimatePresence>
                          {expandedWorkoutId === workout.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0, marginTop: 0 }}
                              animate={{ opacity: 1, height: 'auto', marginTop: '12px' }}
                              exit={{ opacity: 0, height: 0, marginTop: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="border-t pt-3 space-y-3">
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-600 mb-1">מטרת האימון:</h4>
                                  <p className="text-sm text-slate-700">{workout.workout_description || 'לא צוינה מטרה.'}</p>
                                </div>
                                <Button
                                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => handleStartWorkout(workout)}
                                  disabled={startingWorkoutId === workout.id}
                                >
                                  {startingWorkoutId === workout.id ? (
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                  ) : (
                                    <Play className="w-4 h-4 ml-2" />
                                  )}
                                  {startingWorkoutId === workout.id ? 'מתחיל אימון...' : 'הפעל אימון'}
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
