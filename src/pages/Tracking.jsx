import React, { useState, useEffect } from "react";
import { User, Workout } from "@/api/entities";
import WorkoutStats from "../components/progress/WorkoutStats";
import ExerciseProgress from "../components/progress/ExerciseProgress";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Tracking() {
  const [user, setUser] = useState(null);
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      console.log("Loading tracking data...");
      
      const currentUser = await User.me();
      setUser(currentUser);

      // Load completed workouts with detailed logging
      const completedWorkouts = await Workout.filter({ 
        created_by: currentUser.email, 
        status: "הושלם" 
      }, "-date");
      
      console.log("Loaded completed workouts for tracking:", completedWorkouts);
      console.log("Number of workouts:", completedWorkouts?.length || 0);
      
      // Log detailed information about each workout
      completedWorkouts?.forEach((workout, index) => {
        console.log(`Workout ${index + 1}:`, {
          id: workout.id,
          date: workout.date,
          type: workout.workout_type,
          exercises_count: workout.exercises?.length || 0,
          completed_exercises: workout.completed_exercises_count,
          total_reps: workout.total_repetitions,
          total_weight: workout.total_weight_lifted
        });
      });
      
      setWorkouts(completedWorkouts || []);
      
    } catch (error) {
      console.error("Error loading tracking data:", error);
      setError(`שגיאה בטעינת נתוני המעקב: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">טוען נתוני מעקב...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="muscle-glass border-0 shadow-lg">
        <CardContent className="text-center py-12">
          <Activity className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-xl font-semibold text-red-600 mb-2">שגיאה בטעינת הנתונים</h3>
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={loadData} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            נסה שוב
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">📊 מעקב אימונים</h1>
        <p className="text-slate-600">עקוב אחר ההתקדמות שלך באימונים</p>
        {workouts.length > 0 && (
          <p className="text-sm text-slate-500 mt-2">נמצאו {workouts.length} אימונים שהושלמו</p>
        )}
      </div>

      <div className="space-y-6">
        <WorkoutStats workouts={workouts} />
        <ExerciseProgress workouts={workouts} />
      </div>
    </div>
  );
}