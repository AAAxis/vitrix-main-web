import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, Target, TrendingUp, Dumbbell, Calendar } from 'lucide-react';
import { formatDate } from '@/components/utils/timeUtils';

const WorkoutSummary = ({ workout }) => {
    const stats = useMemo(() => {
        if (!workout) return {};

        const allExercises = [
            ...(workout.part_1_exercises || []),
            ...(workout.part_2_exercises || []),
            ...(workout.part_3_exercises || []),
            ...(workout.exercises || [])
        ];

        // Count completed exercises
        const completedExercises = allExercises.filter(exercise => exercise.completed).length;
        const totalExercises = allExercises.length;

        // Count completed sets
        let completedSets = 0;
        let totalSets = 0;
        let totalReps = 0;
        let totalWeightLifted = 0;

        allExercises.forEach(exercise => {
            if (exercise.sets && Array.isArray(exercise.sets)) {
                exercise.sets.forEach(set => {
                    totalSets++;
                    if (set.completed) {
                        completedSets++;
                        totalReps += set.repetitions || 0;
                        totalWeightLifted += (set.weight || 0) * (set.repetitions || 0);
                    }
                });
            }
        });

        // Calculate completion rate based on completed sets
        const completionRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

        return {
            totalExercises,
            completedExercises,
            totalSets,
            completedSets,
            completionRate,
            totalReps,
            totalWeightLifted,
            warmupCompleted: workout.warmup_completed || false,
            duration: workout.total_duration || 0
        };
    }, [workout]);

    if (!workout) {
        return (
            <Card className="muscle-glass border-0 shadow-lg">
                <CardContent className="p-6 text-center">
                    <p className="text-slate-500">לא נמצא מידע על האימון</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="muscle-glass border-0 shadow-lg">
            <CardHeader className="pb-4">
                <CardTitle className="text-center text-2xl font-bold text-slate-800 flex items-center justify-center gap-2">
                    <Target className="w-6 h-6 text-green-600" />
                    סיכום האימון
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Main completion rate display */}
                <div className="text-center p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                        {stats.completionRate}%
                    </div>
                    <p className="text-lg text-slate-700 font-medium">אחוז השלמה</p>
                    <p className="text-sm text-slate-500 mt-1">
                        {stats.completedSets} מתוך {stats.totalSets} סטים הושלמו
                    </p>
                </div>

                {/* Statistics grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Exercises completed */}
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <CheckCircle className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                        <div className="text-xl font-bold text-blue-800">
                            {stats.completedExercises}/{stats.totalExercises}
                        </div>
                        <div className="text-xs text-blue-600">תרגילים</div>
                    </div>

                    {/* Duration */}
                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                        <Clock className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                        <div className="text-xl font-bold text-purple-800">
                            {stats.duration}
                        </div>
                        <div className="text-xs text-purple-600">דקות</div>
                    </div>

                    {/* Total reps */}
                    <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                        <TrendingUp className="w-6 h-6 mx-auto mb-2 text-orange-600" />
                        <div className="text-xl font-bold text-orange-800">
                            {stats.totalReps.toLocaleString()}
                        </div>
                        <div className="text-xs text-orange-600">חזרות</div>
                    </div>

                    {/* Total weight */}
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <Dumbbell className="w-6 h-6 mx-auto mb-2 text-red-600" />
                        <div className="text-xl font-bold text-red-800">
                            {stats.totalWeightLifted.toLocaleString()}
                        </div>
                        <div className="text-xs text-red-600">ק"ג הורם</div>
                    </div>
                </div>

                {/* Workout info */}
                <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(workout.date) || 'היום'}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            {stats.warmupCompleted && (
                                <Badge className="bg-green-100 text-green-700 border-green-300">
                                    חימום הושלם
                                </Badge>
                            )}
                            <Badge 
                                className={`${
                                    stats.completionRate >= 80 
                                        ? 'bg-green-100 text-green-700 border-green-300'
                                        : stats.completionRate >= 60
                                        ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                        : 'bg-red-100 text-red-700 border-red-300'
                                }`}
                            >
                                {stats.completionRate >= 80 ? 'אימון מצוין' : 
                                 stats.completionRate >= 60 ? 'אימון טוב' : 'השלם עוד'}
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default WorkoutSummary;