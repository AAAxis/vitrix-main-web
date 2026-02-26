import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Calendar, Dumbbell, Target, Activity, Eye, EyeOff, BrainCircuit, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { WorkoutLog, User, Workout } from '@/api/entities';

export default function ExerciseProgress() {
  const [selectedExercise, setSelectedExercise] = useState('');
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [expandedWorkoutId, setExpandedWorkoutId] = useState(null);
  const [activeView, setActiveView] = useState('workouts'); // 'workouts' or 'exercises'

  useEffect(() => {
    const loadData = async () => {
      setIsLoadingLogs(true);
      try {
        const currentUser = await User.me();
        const [logs, completedWorkouts] = await Promise.all([
          WorkoutLog.filter({ user_email: currentUser.email }, "-date"),
          Workout.filter({ created_by: currentUser.email, status: "הושלם" }, "-date")
        ]);
        setWorkoutLogs(logs);
        setWorkoutHistory(completedWorkouts);
      } catch (error) {
        console.error("Error loading workout data:", error);
      } finally {
        setIsLoadingLogs(false);
      }
    };
    loadData();
  }, []);

  const exerciseData = useMemo(() => {
    if (workoutLogs.length === 0) return new Map();
    
    const exerciseMap = new Map();
    workoutLogs.forEach(log => {
      if (!exerciseMap.has(log.exercise_name)) {
        exerciseMap.set(log.exercise_name, []);
      }
      exerciseMap.get(log.exercise_name).push(log);
    });

    exerciseMap.forEach(data => data.sort((a, b) => parseISO(a.date) - parseISO(b.date)));
    return exerciseMap;
  }, [workoutLogs]);

  const exerciseNames = Array.from(exerciseData.keys()).sort();

  const selectedExerciseLogs = useMemo(() => {
    return selectedExercise ? exerciseData.get(selectedExercise) || [] : [];
  }, [selectedExercise, exerciseData]);

  const chartData = useMemo(() => {
    if (selectedExerciseLogs.length === 0) return [];

    const aggregation = new Map();
    selectedExerciseLogs.forEach(log => {
      const dateStr = format(parseISO(log.date), 'yyyy-MM-dd');
      if (!aggregation.has(dateStr)) {
        aggregation.set(dateStr, {
          date: dateStr,
          totalReps: 0,
          maxWeight: 0,
          totalDuration: 0,
          sets: 0,
          is_bodyweight: log.is_bodyweight
        });
      }
      const dayData = aggregation.get(dateStr);
      dayData.totalReps += log.reps || 0;
      dayData.totalDuration += log.duration_seconds || 0;
      if ((log.weight || 0) > dayData.maxWeight) {
        dayData.maxWeight = log.weight;
      }
      dayData.sets += 1;
    });

    return Array.from(aggregation.values()).sort((a,b) => new Date(a.date) - new Date(b.date));
  }, [selectedExerciseLogs]);

  // New analytics data
  const workoutAnalytics = useMemo(() => {
    if (workoutHistory.length === 0) return null;

    const last30Days = workoutHistory.filter(w => {
      const workoutDate = parseISO(w.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return workoutDate >= thirtyDaysAgo;
    });

    const frequencyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayWorkouts = last30Days.filter(w => 
        parseISO(w.date).toDateString() === date.toDateString()
      ).length;
      frequencyData.push({
        name: format(date, 'dd/MM', { locale: he }),
        workouts: dayWorkouts
      });
    }

    const totalWorkouts = workoutHistory.length;
    const avgDuration = workoutHistory.reduce((sum, w) => sum + (w.total_duration || 60), 0) / totalWorkouts;
    const totalExercises = workoutHistory.reduce((sum, w) => {
      const allExercises = [
        ...(w.part_1_exercises || []),
        ...(w.part_2_exercises || []),
        ...(w.part_3_exercises || []),
        ...(w.exercises || [])
      ];
      return sum + allExercises.filter(e => e.completed).length;
    }, 0);

    return {
      frequencyData,
      totalWorkouts,
      avgDuration: Math.round(avgDuration),
      totalExercises,
      last30DaysCount: last30Days.length
    };
  }, [workoutHistory]);
  
  const isBodyweight = chartData[0]?.is_bodyweight;
  
  const formatDate = (dateString) => format(parseISO(dateString), 'dd/MM/yy', { locale: he });

  if (isLoadingLogs) {
    return <Card className="muscle-glass p-6 text-center"><Loader2 className="animate-spin mx-auto" /> טוען נתונים...</Card>;
  }

  if (workoutHistory.length === 0 && exerciseNames.length === 0) {
    return (
      <Card className="muscle-glass text-center p-8">
        <Dumbbell className="w-12 h-12 mx-auto mb-4 text-slate-400" />
        <h3 className="text-xl font-semibold text-slate-700">אין נתוני אימונים</h3>
        <p className="text-slate-500">השלם אימון כדי לראות סטטיסטיקות כאן.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* View Toggle */}
      <Card className="muscle-glass border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
              התקדמות סייקל אימונים
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={activeView === 'workouts' ? 'default' : 'outline'}
                onClick={() => setActiveView('workouts')}
                size="sm"
              >
                אימונים
              </Button>
              <Button
                variant={activeView === 'exercises' ? 'default' : 'outline'}
                onClick={() => setActiveView('exercises')}
                size="sm"
              >
                תרגילים
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {activeView === 'workouts' ? (
        <>
          {/* Workout Analytics */}
          {workoutAnalytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Workout Frequency Chart */}
              <Card className="muscle-glass border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">תדירות אימונים - שבוע אחרון</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={workoutAnalytics.frequencyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="workouts" fill="#16a34a" name="אימונים" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <Card className="muscle-glass border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg">סיכום כללי</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{workoutAnalytics.totalWorkouts}</div>
                      <div className="text-sm text-blue-700">סה"כ אימונים</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{workoutAnalytics.last30DaysCount}</div>
                      <div className="text-sm text-green-700">ב-30 ימים</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{workoutAnalytics.avgDuration}</div>
                      <div className="text-sm text-purple-700">דקות ממוצע</div>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">{workoutAnalytics.totalExercises}</div>
                      <div className="text-sm text-orange-700">סה"כ תרגילים</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Workout History */}
          <Card className="muscle-glass border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg">היסטוריית אימונים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workoutHistory.map((workout) => {
                  const isExpanded = expandedWorkoutId === workout.id;
                  
                  return (
                    <Card key={workout.id} className="border-s-4 border-green-500">
                      <CardHeader 
                        className="cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => setExpandedWorkoutId(isExpanded ? null : workout.id)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-lg text-slate-800">
                              {format(parseISO(workout.date), "dd/MM/yyyy", { locale: he })}
                            </CardTitle>
                            {workout.start_time && (
                              <p className="text-sm text-slate-500">
                                התחיל ב-{format(parseISO(workout.start_time), "HH:mm")}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-slate-600">
                              {workout.exercises?.length || 0} תרגילים
                            </Badge>
                            <Button variant="ghost" size="sm">
                              {isExpanded ? "סגור" : "הרחב"}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      {isExpanded && (
                        <CardContent>
                          <div className="space-y-3">
                            {workout.exercises && workout.exercises.length > 0 ? (
                              workout.exercises.map((exercise, index) => (
                                <div key={index} className="p-3 bg-slate-50 rounded-lg border">
                                  <h4 className="font-semibold text-slate-800 mb-2">{exercise.name}</h4>
                                  {exercise.sets && exercise.sets.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {exercise.sets.map((set, setIndex) => (
                                        <div key={setIndex} className={`text-sm p-2 rounded border ${set.completed ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                                          <div className="flex justify-between items-center">
                                            <span className="font-medium">סט {setIndex + 1}</span>
                                            <div className="flex gap-2 text-xs text-slate-600">
                                              {set.weight > 0 && <span>{set.weight}kg</span>}
                                              {set.repetitions > 0 && <span>{set.repetitions} חזרות</span>}
                                              {set.duration_seconds > 0 && <span>{set.duration_seconds}s</span>}
                                            </div>
                                          </div>
                                          {!set.completed && (
                                            <div className="text-xs text-slate-400 mt-1">לא הושלם</div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-slate-500">אין סטים מתועדים</p>
                                  )}
                                  {exercise.notes && (
                                    <p className="text-xs text-slate-500 mt-2">📝 {exercise.notes}</p>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-center text-slate-500 py-4">אין תרגילים מתועדים לאימון זה</p>
                            )}
                            {workout.notes && (
                              <div className="mt-4 p-3 bg-blue-50 rounded-lg border">
                                <h5 className="font-semibold text-blue-800 mb-1">הערות מהאימון:</h5>
                                <p className="text-blue-700 text-sm">{workout.notes}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {/* Exercise Analysis */}
          <Card className="muscle-glass border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
                מעקב התקדמות לפי תרגיל
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger><SelectValue placeholder="בחר תרגיל לניתוח..." /></SelectTrigger>
                <SelectContent>
                  {exerciseNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <AnimatePresence>
            {selectedExercise && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="muscle-glass border-0 shadow-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
                    <CardTitle className="flex items-center justify-between">
                      <span className="flex items-center gap-3">
                        <Activity className="w-6 h-6 text-indigo-600" />
                        ניתוח ביצועים: {selectedExercise}
                      </span>
                      <Badge variant="outline">{isBodyweight ? 'משקל גוף' : 'משקולות'}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tickFormatter={formatDate} />
                          <YAxis yAxisId="left" stroke="#8884d8" />
                          {!isBodyweight && <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />}
                          <Tooltip labelFormatter={formatDate} />
                          <Legend />
                          {isBodyweight ? (
                             <Line yAxisId="left" type="monotone" dataKey="totalReps" name="סהכ חזרות" stroke="#8884d8" />
                          ) : (
                            <>
                              <Line yAxisId="left" type="monotone" dataKey="maxWeight" name="משקל שיא (קג)" stroke="#8884d8" />
                              <Line yAxisId="right" type="monotone" dataKey="totalReps" name="סהכ חזרות" stroke="#82ca9d" />
                            </>
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3 text-slate-700">📋 היסטוריית סטים</h4>
                      <div className="max-h-72 overflow-y-auto pe-2 space-y-2">
                        {[...selectedExerciseLogs].reverse().map((log) => (
                          <div key={log.id} className="p-3 bg-slate-50 rounded-lg border">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold text-slate-700">{formatDate(log.date)}</span>
                              <Badge variant="secondary">סט {log.set_number}</Badge>
                            </div>
                            <div className="flex justify-around text-center text-sm">
                              {!log.is_bodyweight && <div><p className="font-semibold">{log.weight || 0}</p><p className="text-xs text-slate-500">ק"ג</p></div>}
                              <div><p className="font-semibold">{log.reps || 0}</p><p className="text-xs text-slate-500">חזרות</p></div>
                              {log.duration_seconds > 0 && <div><p className="font-semibold">{log.duration_seconds}</p><p className="text-xs text-slate-500">שניות</p></div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}