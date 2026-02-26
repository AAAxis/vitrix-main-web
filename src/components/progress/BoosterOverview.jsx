
import React, { useState, useEffect, useMemo } from 'react';
import { WeeklyTask, WeightEntry } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format, parseISO, differenceInDays, isWithinInterval, startOfToday, subDays, startOfWeek } from "date-fns";
import { he } from "date-fns/locale";
import { TrendingUp, TrendingDown, Scale, Calendar, Dumbbell, Clock, CheckCircle, Target, Activity } from 'lucide-react';
import CoachMeasurementsView from './CoachMeasurementsView';
import ExerciseProgressTracker from './ExerciseProgressTracker';

export default function BoosterOverview({ user, workouts, weightEntries }) {
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [allMeasurements, setAllMeasurements] = useState([]);
  const [isLoadingMeasurements, setIsLoadingMeasurements] = useState(true);

  useEffect(() => {
    loadWeeklyTasks();
    loadAllMeasurements();
  }, [user]);

  const loadWeeklyTasks = async () => {
    if (!user?.email) return;
    
    setIsLoadingTasks(true);
    try {
      const tasks = await WeeklyTask.filter({ user_email: user.email }, "week");
      setWeeklyTasks(tasks);
    } catch (error) {
      console.error("Error loading weekly tasks:", error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const loadAllMeasurements = async () => {
    if (!user?.email) return;
    
    setIsLoadingMeasurements(true);
    try {
      // Get all weight entries (from both coach and user), sorted by measurement date descending
      const measurements = await WeightEntry.filter({ user_email: user.email }, "-date");
      setAllMeasurements(measurements || []);
    } catch (error) {
      console.error("Error loading measurements:", error);
    } finally {
      setIsLoadingMeasurements(false);
    }
  };

  // Memoize heavy calculations to prevent re-computation on every render
  const stats = useMemo(() => {
    if (!workouts) return { totalWorkouts: 0, totalDuration: 0, totalExercises: 0, avgDuration: 0 };
    const totalDuration = workouts.reduce((sum, w) => sum + (w.total_duration || 0), 0);
    
    // Corrected syntax and logic for calculating total exercises
    const totalExercises = workouts.reduce((sum, w) => {
        const allExercises = [
            ...(w.part_1_exercises || []),
            ...(w.part_2_exercises || []),
            ...(w.part_3_exercises || []),
            ...(w.exercises || [])
        ];
        // An exercise is counted if it has sets and at least one set was marked as completed.
        const completedInWorkout = allExercises.filter(ex => 
            ex && ex.sets && Array.isArray(ex.sets) && ex.sets.some(set => set && set.completed)
        ).length;
        return sum + completedInWorkout;
    }, 0);

    const avgDuration = workouts.length > 0 ? Math.round(totalDuration / workouts.length) : 0;

    return { totalWorkouts: workouts.length, totalDuration, totalExercises, avgDuration };
  }, [workouts]);

  const weeklyTasksStatus = useMemo(() => {
    if (!weeklyTasks.length) return null;
    
    const today = startOfToday();
    const completedTasks = weeklyTasks.filter(task => task.status === "הושלם");
    const activeTasks = weeklyTasks.filter(task => {
      try {
        const startDate = parseISO(task.week_start_date);
        const endDate = parseISO(task.week_end_date);
        return isWithinInterval(today, { start: startDate, end: endDate });
      } catch {
        return false;
      }
    });
    
    const activeTask = activeTasks[0];
    const completionRate = weeklyTasks.length > 0 ? Math.round((completedTasks.length / weeklyTasks.length) * 100) : 0;
    
    return {
      totalTasks: weeklyTasks.length,
      completedTasks: completedTasks.length,
      completionRate,
      activeTask,
      hasActiveTask: activeTasks.length > 0
    };
  }, [weeklyTasks]);

  // Get latest value for each metric individually - Updated Logic
  const latestMeasurements = useMemo(() => {
    if (!allMeasurements.length) return {};

    // Helper function to get the latest valid measurement for a specific field
    // Assumes allMeasurements is already sorted by 'date' in descending order (most recent first)
    const findLatestValue = (fieldName) => {
        // Find the first entry (most recent) that has a non-null, non-undefined, non-empty value for the field
        const entry = allMeasurements.find(m => 
            m[fieldName] !== null && 
            m[fieldName] !== undefined &&
            m[fieldName] !== ''
        );
        return entry ? entry[fieldName] : null;
    };
    
    return {
      weight: findLatestValue('weight'),
      bmi: findLatestValue('bmi'),
      fat_percentage: findLatestValue('fat_percentage'),
      muscle_mass: findLatestValue('muscle_mass'),
      bmr: findLatestValue('bmr'),
      metabolic_age: findLatestValue('metabolic_age'),
      visceral_fat: findLatestValue('visceral_fat'),
      body_water_percentage: findLatestValue('body_water_percentage'),
      physique_rating: findLatestValue('physique_rating'),
      chest_circumference: findLatestValue('chest_circumference'),
      waist_circumference: findLatestValue('waist_circumference'),
      glutes_circumference: findLatestValue('glutes_circumference')
    };
  }, [allMeasurements]);

  const weightTrend = useMemo(() => {
    if (!allMeasurements || allMeasurements.length < 2) return null;
    
    // Use the same logic as getLatestWeight to ensure we compare latest valid weights
    const validWeights = allMeasurements.filter(m => 
      m.weight !== null && 
      m.weight !== undefined && 
      m.weight !== '' &&
      !isNaN(parseFloat(m.weight))
    ).sort((a, b) => new Date(b.created_date || b.date) - new Date(a.created_date || a.date));

    if (validWeights.length < 2) return null;

    const latestWeight = validWeights[0].weight;
    const previousWeight = validWeights[1].weight;
    
    if (latestWeight === null || previousWeight === null) return null; // Should not happen with filtering but for safety
    
    const change = (parseFloat(latestWeight) - parseFloat(previousWeight)).toFixed(2);
    
    return {
      change,
      direction: change > 0 ? "up" : "down"
    };
  }, [allMeasurements]);

  const weightChartData = useMemo(() => {
    if (!allMeasurements || allMeasurements.length === 0) return [];
    
    return allMeasurements
      .filter(entry => entry.weight && !isNaN(parseFloat(entry.weight))) // Only entries with valid weight
      .sort((a, b) => new Date(a.date || a.created_date) - new Date(b.date || b.created_date))
      .slice(-10)
      .map(entry => ({
        name: format(parseISO(entry.date || entry.created_date), "d/M", { locale: he }),
        משקל: parseFloat(entry.weight), // Ensure weight is number for chart
        date: entry.date || entry.created_date
      }));
  }, [allMeasurements]);

  const workoutFrequencyData = useMemo(() => {
    if (!workouts || workouts.length === 0) return [];
    
    const last30Days = workouts
      .filter(w => {
        const workoutDate = parseISO(w.date);
        const thirtyDaysAgo = subDays(new Date(), 30);
        return workoutDate >= thirtyDaysAgo;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const groupedByWeek = {};
    last30Days.forEach(workout => {
      const weekStart = startOfWeek(parseISO(workout.date), { locale: he });
      const weekKey = format(weekStart, "d/M", { locale: he });
      
      if (!groupedByWeek[weekKey]) {
        groupedByWeek[weekKey] = 0;
      }
      groupedByWeek[weekKey]++;
    });

    return Object.entries(groupedByWeek).map(([week, count]) => ({
      name: week,
      אימונים: count
    }));
  }, [workouts]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-lg">
          <p className="font-bold text-slate-800">{`תאריך: ${label}`}</p>
          <p className="text-blue-600">{`משקל: ${payload[0].value} ק"ג`}</p>
        </div>
      );
    }
    return null;
  };

  // Helper functions for status indicators
  const getBMIDisplay = (bmi) => {
    if (!bmi || bmi === "לא נמדד") return { text: "לא נמדד", color: "text-gray-500"};
    const bmiNum = parseFloat(bmi); 
    if (isNaN(bmiNum)) return { text: "לא נמדד", color: "text-gray-500"};
    if (bmiNum < 18.5) return { text: "תת-משקל", color: "text-blue-600"};
    if (bmiNum < 25) return { text: "משקל תקין", color: "text-green-600"};
    if (bmiNum < 30) return { text: "עודף משקל", color: "text-orange-600"};
    return { text: "השמנה", color: "text-red-600"};
  };

  const formatValue = (value, unit = '', isPercentage = false) => {
    if (value === null || value === undefined || value === '' || value === "לא נמדד") {
      return 'לא נמדד';
    }
    
    // Handle numeric values
    if (typeof value === 'number' || !isNaN(parseFloat(value))) {
      const numValue = typeof value === 'number' ? value : parseFloat(value);
      if (isPercentage) return `${numValue}%`;
      return unit ? `${numValue} ${unit}` : numValue.toString();
    }
    
    return 'לא נמדד';
  };
  
  if (!user || isLoadingMeasurements) {
    return (
        <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  // Measurements data for the unified table - Only show metrics that have values
  const measurementsData = [
    { 
      label: 'משקל', 
      value: formatValue(latestMeasurements.weight, 'ק"ג'), 
      icon: '⚖️', 
      userCanUpdate: true,
      hasValue: latestMeasurements.weight !== null && latestMeasurements.weight !== undefined
    },
    { 
      label: 'BMI', 
      value: formatValue(latestMeasurements.bmi), 
      icon: '📊', 
      status: getBMIDisplay(latestMeasurements.bmi),
      hasValue: latestMeasurements.bmi !== null && latestMeasurements.bmi !== undefined
    },
    { 
      label: 'אחוז שומן', 
      value: formatValue(latestMeasurements.fat_percentage, '', true), 
      icon: '🔥',
      hasValue: latestMeasurements.fat_percentage !== null && latestMeasurements.fat_percentage !== undefined
    },
    { 
      label: 'מסת שריר', 
      value: formatValue(latestMeasurements.muscle_mass, 'ק"ג'), 
      icon: '💪',
      hasValue: latestMeasurements.muscle_mass !== null && latestMeasurements.muscle_mass !== undefined
    },
    { 
      label: 'BMR', 
      value: formatValue(latestMeasurements.bmr, 'קל"ד/יום'), 
      icon: '⚡',
      hasValue: latestMeasurements.bmr !== null && latestMeasurements.bmr !== undefined
    },
    { 
      label: 'גיל מטבולי', 
      value: formatValue(latestMeasurements.metabolic_age, 'שנים'), 
      icon: '🔄',
      hasValue: latestMeasurements.metabolic_age !== null && latestMeasurements.metabolic_age !== undefined
    },
    { 
      label: 'שומן ויסצרלי', 
      value: formatValue(latestMeasurements.visceral_fat), 
      icon: '⚠️',
      hasValue: latestMeasurements.visceral_fat !== null && latestMeasurements.visceral_fat !== undefined
    },
    { 
      label: 'אחוז מים', 
      value: formatValue(latestMeasurements.body_water_percentage, '', true), 
      icon: '💧',
      hasValue: latestMeasurements.body_water_percentage !== null && latestMeasurements.body_water_percentage !== undefined
    },
    { 
      label: 'דירוג מבנה גוף', 
      value: formatValue(latestMeasurements.physique_rating, '/9'), 
      icon: '🎯',
      hasValue: latestMeasurements.physique_rating !== null && latestMeasurements.physique_rating !== undefined
    },
    { 
      label: 'היקף חזה', 
      value: formatValue(latestMeasurements.chest_circumference, 'ס"מ'), 
      icon: '📏',
      hasValue: latestMeasurements.chest_circumference !== null && latestMeasurements.chest_circumference !== undefined
    },
    { 
      label: 'היקף מותן', 
      value: formatValue(latestMeasurements.waist_circumference, 'ס"מ'), 
      icon: '📐',
      hasValue: latestMeasurements.waist_circumference !== null && latestMeasurements.waist_circumference !== undefined
    },
    { 
      label: 'היקף ישבן', 
      value: formatValue(latestMeasurements.glutes_circumference, 'ס"מ'), 
      icon: '📏',
      hasValue: latestMeasurements.glutes_circumference !== null && latestMeasurements.glutes_circumference !== undefined
    }
  ].filter(item => item.hasValue); // Only show metrics that have values

  return (
    <ScrollArea className="h-[calc(100vh-200px)] w-full">
      <div className="space-y-4 md:space-y-6 p-1">
        <h2 className="text-xl md:text-2xl font-bold text-center text-slate-800">📊 סקירה כללית</h2>

        {/* Main Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
          {/* Total Workouts */}
          <Card className="muscle-card-variant-blue">
            <CardContent className="p-2 md:p-4 flex flex-col items-center justify-center text-center">
              <Dumbbell className="w-5 h-5 md:w-8 md:h-8 text-blue-600 mb-1 md:mb-2" />
              <p className="text-lg md:text-2xl font-bold text-slate-800">{stats.totalWorkouts}</p>
              <p className="text-xs md:text-sm text-slate-600 leading-tight">סה"כ אימונים</p>
            </CardContent>
          </Card>

          {/* Current Weight */}
          <Card className="muscle-card-variant-green">
            <CardContent className="p-2 md:p-4 flex flex-col items-center justify-center text-center">
              <Scale className="w-5 h-5 md:w-8 md:h-8 text-green-600 mb-1 md:mb-2" />
              <p className="text-lg md:text-2xl font-bold text-slate-800">
                {formatValue(latestMeasurements.weight, 'ק"ג')}
              </p>
              <p className="text-xs md:text-sm text-slate-600 leading-tight">משקל נוכחי</p>
            </CardContent>
          </Card>
          
          {/* BMI */}
          <Card className="muscle-card-variant-gold">
            <CardContent className="p-2 md:p-4 flex flex-col items-center justify-center text-center">
               <Activity className="w-5 h-5 md:w-8 md:h-8 text-yellow-600 mb-1 md:mb-2" />
              <p className={`text-lg md:text-2xl font-bold ${getBMIDisplay(latestMeasurements.bmi).color}`}>
                {formatValue(latestMeasurements.bmi)}
              </p>
              <p className="text-xs md:text-sm text-slate-600 leading-tight">
                BMI {latestMeasurements.bmi ? `(${getBMIDisplay(latestMeasurements.bmi).text})` : ''}
              </p>
            </CardContent>
          </Card>
          
          {/* Total Duration */}
           <Card className="muscle-card-variant-blue">
            <CardContent className="p-2 md:p-4 flex flex-col items-center justify-center text-center">
              <Calendar className="w-5 h-5 md:w-8 md:h-8 text-blue-600 mb-1 md:mb-2" />
              <p className="text-lg md:text-2xl font-bold text-slate-800">
                {Math.floor(stats.totalDuration / 60)} 
                <span className="text-sm md:text-base font-normal">ש'</span>
              </p>
              <p className="text-xs md:text-sm text-slate-600 leading-tight">זמן אימון כולל</p>
            </CardContent>
          </Card>
        </div>

        {/* Unified Measurements Table */}
        {measurementsData.length > 0 && (
          <Card className="muscle-glass border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-slate-800">
                <Scale className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                <span className="text-base md:text-lg">מדידות עדכניות</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {measurementsData.map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{metric.icon}</span>
                      <span className="text-sm font-medium text-slate-700">{metric.label}</span>
                      {metric.userCanUpdate && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">עדכון ע"י משתמש</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold ${metric.status?.color || 'text-slate-800'}`}>
                        {metric.value}
                      </span>
                      {metric.status && metric.status.text !== "לא נמדד" && (
                        <div className="text-xs text-slate-500">{metric.status.text}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weight Chart and Tasks in Grid */}
        <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
          {/* Weight Chart */}
          {weightChartData.length > 0 && (
            <Card className="muscle-glass border-0 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-slate-800">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 md:w-5 md:h-5 text-green-600" />
                    <span className="text-base md:text-lg">מגמת משקל</span>
                  </div>
                  {weightTrend && (
                    <div className="flex items-center">
                      {weightTrend.direction === 'up' ? 
                        <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-red-500" /> : 
                        <TrendingDown className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                      }
                      <span className={`ms-1 font-semibold text-sm md:text-base ${
                        weightTrend.direction === 'up' ? 'text-red-500' : 'text-green-500'
                      }`}>
                        {Math.abs(parseFloat(weightTrend.change))} ק"ג
                      </span>
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 md:h-40" dir="ltr">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                      data={weightChartData}
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" reversed={false} />
                      <YAxis 
                        tick={{ fontSize: 10 }} 
                        domain={['dataMin - 1', 'dataMax + 1']} 
                        stroke="#94a3b8" 
                        orientation="left"
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="משקל" stroke="#16a34a" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Weekly Tasks Card */}
          <Card className="muscle-glass border-0 shadow-lg">
            <CardHeader className="pb-3">
               <CardTitle className="flex items-center justify-between text-slate-800">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                  <span className="text-base md:text-lg">משימות שבועיות</span>
                </div>
                 {weeklyTasksStatus && (
                   <Badge className="bg-indigo-100 text-indigo-700 text-xs">
                     {weeklyTasksStatus.completionRate}% הושלמו
                   </Badge>
                 )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingTasks ? (
                <p className="text-slate-500 text-center py-4 text-sm">טוען משימות...</p>
              ) : !weeklyTasksStatus ? (
                <p className="text-slate-500 text-center py-4 text-sm">לא הוגדרו משימות עדיין.</p>
              ) : (
                  <div className="space-y-3">
                      {weeklyTasksStatus.hasActiveTask ? (
                          <div className="bg-indigo-50 p-3 rounded-lg">
                              <h4 className="font-bold text-indigo-800 text-sm md:text-base">משימה לשבוע זה:</h4>
                              <p className="text-indigo-700 text-sm">{weeklyTasksStatus.activeTask.title}</p>
                          </div>
                      ) : (
                          <div className="bg-green-50 p-3 rounded-lg text-center">
                              <h4 className="font-bold text-green-800 text-sm">כל הכבוד! אין משימות פעילות לשבוע זה.</h4>
                          </div>
                      )}
                      
                      <div>
                          <h4 className="font-medium text-slate-700 mb-2 text-sm">התקדמות כללית:</h4>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500" 
                                style={{ width: `${weeklyTasksStatus.completionRate}%` }}
                              ></div>
                          </div>
                          <p className="text-xs text-slate-500 mt-1 text-center">
                            {weeklyTasksStatus.completedTasks} מתוך {weeklyTasksStatus.totalTasks} משימות הושלמו
                          </p>
                      </div>
                  </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coach Measurements Panel */}
        {/* Pass allMeasurements to CoachMeasurementsView to allow it to identify coach vs user entries */}
        <CoachMeasurementsView user={user} allMeasurements={allMeasurements} />

        {/* Exercise Progress Tracker */}
        <ExerciseProgressTracker workouts={workouts} />
      </div>
    </ScrollArea>
  );
}
