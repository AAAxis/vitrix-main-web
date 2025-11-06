import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Target, CheckCircle, Dumbbell, Repeat, Weight, TrendingUp } from "lucide-react";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";

export default function WorkoutStats({ workouts }) {
  if (!workouts || workouts.length === 0) {
    return (
      <Card className="muscle-glass border-0 shadow-lg">
        <CardContent className="text-center py-12">
          <Dumbbell className="w-16 h-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-xl font-semibold text-slate-600 mb-2">אין נתוני אימונים</h3>
          <p className="text-slate-500">השלם אימון כדי לראות סטטיסטיקות כאן.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="muscle-glass border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Target className="w-6 h-6 text-indigo-600" />
            📈 סיכום אימונים שהושלמו
          </CardTitle>
          <CardDescription>
            היסטוריית האימונים האחרונים שלך, עם פירוט ביצועים.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {workouts.map((workout) => (
        <Card key={workout.id} className="muscle-glass border-l-4 border-green-500 shadow-md">
          <CardHeader>
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg text-slate-800">{workout.workout_type || 'אימון כוח'}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                  <Calendar className="w-4 h-4" />
                  <span>{format(parseISO(workout.date), "dd/MM/yyyy", { locale: he })}</span>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {workout.total_duration || 60} דקות
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Exercises Details */}
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">פירוט תרגילים:</h4>
              {workout.exercises && workout.exercises.length > 0 && workout.exercises.some(ex => ex.sets?.some(s => s.completed)) ? (
                <div className="space-y-3">
                  {workout.exercises.filter(ex => ex.sets && ex.sets.some(s => s.completed)).map((exercise, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg border">
                      <p className="font-semibold text-slate-800 mb-2">{exercise.name}</p>
                      <div className="space-y-1 text-sm">
                        {exercise.sets.filter(s => s.completed).map((set, setIndex) => (
                           <div key={setIndex} className="flex items-center justify-between text-slate-600 border-b border-dashed border-slate-200 py-1 last:border-b-0">
                             <span>סט {setIndex + 1}</span>
                             <div className="flex items-center gap-4 font-mono">
                               <span>{set.weight || 0}kg</span>
                               <span>x</span>
                               <span>{set.repetitions || 0} reps</span>
                             </div>
                           </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">לא תועדו תרגילים לאימון זה.</p>
              )}
            </div>

            {/* Summary Stats */}
            <div>
                <h4 className="font-semibold text-slate-700 mb-2">סיכום סטטיסטי:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-blue-50 p-3 rounded-lg text-center">
                        <p className="text-sm text-blue-700 font-semibold">סה"כ סטים</p>
                        <p className="text-xl font-bold text-blue-900">{workout.total_sets_completed || 0}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg text-center">
                        <p className="text-sm text-purple-700 font-semibold">סה"כ חזרות</p>
                        <p className="text-xl font-bold text-purple-900">{workout.total_repetitions || 0}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg text-center">
                        <p className="text-sm text-green-700 font-semibold">נפח עבודה</p>
                        <p className="text-xl font-bold text-green-900">{workout.total_weight_lifted || 0} <span className="text-xs">ק"ג</span></p>
                    </div>
                    <div className="bg-amber-50 p-3 rounded-lg text-center">
                        <p className="text-sm text-amber-700 font-semibold">השלמה</p>
                        <p className="text-xl font-bold text-amber-900">{workout.completion_rate || 0}%</p>
                    </div>
                </div>
            </div>

            {workout.notes && (
                <div>
                    <h4 className="font-semibold text-slate-700 mb-1">הערות מהאימון:</h4>
                    <p className="text-sm text-slate-600 bg-slate-100 p-3 rounded-md">{workout.notes}</p>
                </div>
            )}

            {workout.warmup_completed && (
              <div className="text-xs text-green-600 mt-4 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                <span>חימום הושלם</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}