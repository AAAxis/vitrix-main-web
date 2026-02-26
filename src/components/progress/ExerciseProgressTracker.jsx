
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Added Tabs imports
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Trophy, Calendar, TrendingUp, TrendingDown, Search, BarChart3, Repeat, Weight, ExternalLink, Dumbbell, Timer } from 'lucide-react'; // Added Dumbbell, Timer icons
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

// Define labels for different metrics to be used in tooltips and charts
const metricLabels = {
    maxWeight: "משקל מקסימלי (ק\"ג)",
    maxReps: "חזרות מקסימליות",
    volume: "נפח אימון (ק\"ג)",
    maxDuration: "זמן מקסימלי (שניות)",
};

const CustomTooltip = ({ active, payload, label, metric }) => { // Added metric prop to CustomTooltip
  if (active && payload && payload.length) {
    const metricLabel = metricLabels[metric] || "ערך"; // Get dynamic label based on selected metric
    return (
      <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-200 shadow-lg">
        <p className="font-bold text-slate-800">{`תאריך: ${format(parseISO(label), "d/M/yy")}`}</p>
        <p className="text-blue-600">{`${metricLabel}: ${payload[0].value}`}</p> {/* Display dynamic label and value */}
      </div>
    );
  }
  return null;
};

export default function ExerciseProgressTracker({ workouts }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('maxWeight'); // New state to control which metric is displayed in the chart

  const exerciseProgressData = useMemo(() => {
    if (!workouts || workouts.length === 0) return [];

    const progress = new Map();

    workouts.forEach(workout => {
      const allExercises = [
        ...(workout.part_1_exercises || []),
        ...(workout.part_2_exercises || []),
        ...(workout.part_3_exercises || []),
        ...(workout.exercises || [])
      ];

      allExercises.forEach(exercise => {
        if (!exercise.name || !exercise.sets || exercise.sets.length === 0) return;
        
        // Filter sets that have any relevant data for calculations (weight, reps, or duration)
        const validSets = exercise.sets.filter(s => s && (s.weight != null || s.repetitions != null || s.duration_seconds != null));
        if (validSets.length === 0) return;

        // Calculate new metrics for the current workout session
        const maxWeight = Math.max(0, ...validSets.map(s => s.weight || 0));
        const maxReps = Math.max(0, ...validSets.map(s => s.repetitions || 0));
        const maxDuration = Math.max(0, ...validSets.map(s => s.duration_seconds || 0));
        const volume = validSets.reduce((sum, s) => sum + (s.repetitions || 0) * (s.weight || 0), 0);

        if (!progress.has(exercise.name)) {
          progress.set(exercise.name, {
            history: [],
            prWeight: 0,   // Personal record for max weight
            prReps: 0,     // Personal record for max repetitions
            prVolume: 0,   // Personal record for total volume
            prDuration: 0, // Personal record for max duration
            videoUrl: exercise.video_url || null,
          });
        }

        const data = progress.get(exercise.name);
        // Push all calculated metrics for this session into the history
        data.history.push({ date: workout.date, maxWeight, maxReps, volume, maxDuration });
        
        // Update personal records
        data.prWeight = Math.max(data.prWeight, maxWeight);
        data.prReps = Math.max(data.prReps, maxReps);
        data.prVolume = Math.max(data.prVolume, volume);
        data.prDuration = Math.max(data.prDuration, maxDuration);
      });
    });

    return Array.from(progress.entries()).map(([name, data]) => {
      const sortedHistory = data.history.sort((a, b) => new Date(a.date) - new Date(b.date));
      const lastSession = sortedHistory[sortedHistory.length - 1];
      
      let trend = 'stable';
      if(sortedHistory.length > 1) {
          const secondLast = sortedHistory[sortedHistory.length - 2];
          if(lastSession.maxWeight > secondLast.maxWeight) trend = 'up';
          if(lastSession.maxWeight < secondLast.maxWeight) trend = 'down';
      }

      return {
        name,
        prWeight: data.prWeight,
        prReps: data.prReps,
        prVolume: data.prVolume,
        prDuration: data.prDuration,
        lastPerformed: lastSession.date,
        history: sortedHistory,
        trend,
        videoUrl: data.videoUrl
      };
    }).sort((a, b) => new Date(b.lastPerformed) - new Date(a.lastPerformed));

  }, [workouts]);

  const filteredExercises = useMemo(() => {
    return exerciseProgressData.filter(ex => 
      ex.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [exerciseProgressData, searchTerm]);

  if (!workouts || workouts.length === 0) {
    return null;
  }

  return (
    <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedExercise(null)}>
      <Card className="muscle-glass border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            ניתוח התקדמות בתרגילים
          </CardTitle>
          <CardDescription>צפה בהתקדמות המשקלים שלך בכל תרגיל לאורך זמן.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="חפש תרגיל..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ps-10"
            />
          </div>
          <ScrollArea className="h-72">
            <div className="space-y-2 pe-2">
              {filteredExercises.length > 0 ? (
                filteredExercises.map(exercise => (
                  <DialogTrigger key={exercise.name} asChild>
                    <button
                      onClick={() => setSelectedExercise(exercise)}
                      className="w-full text-right p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{exercise.name}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                          <div className="flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-yellow-500" />
                            שיא: {exercise.prWeight} ק"ג {/* Display prWeight in the list */}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            בוצע לאחרונה: {format(parseISO(exercise.lastPerformed), 'd/M/yy')}
                          </div>
                        </div>
                      </div>
                      {exercise.trend === 'up' && <TrendingUp className="w-5 h-5 text-green-500" />}
                      {exercise.trend === 'down' && <TrendingDown className="w-5 h-5 text-red-500" />}
                    </button>
                  </DialogTrigger>
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">לא נמצאו תרגילים.</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {selectedExercise && (
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
                <span>התקדמות ב{selectedExercise.name}</span>
                {selectedExercise.videoUrl && (
                    <a href={selectedExercise.videoUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4 ms-2" />
                            צפה בסרטון
                        </Button>
                    </a>
                )}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4"> {/* Updated to a 3-column layout */}
            <div className="p-4 bg-yellow-50 rounded-lg text-center">
                <Trophy className="w-6 h-6 mx-auto text-yellow-500 mb-1" />
                <p className="text-xs text-yellow-700">שיא משקל (PR)</p>
                <p className="font-bold text-lg text-yellow-800">{selectedExercise.prWeight} ק"ג</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg text-center">
                <Repeat className="w-6 h-6 mx-auto text-blue-500 mb-1" /> {/* Changed icon */}
                <p className="text-xs text-blue-700">שיא חזרות</p>
                <p className="font-bold text-lg text-blue-800">{selectedExercise.prReps}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg text-center">
                <Dumbbell className="w-6 h-6 mx-auto text-green-500 mb-1" /> {/* Changed icon to Dumbbell */}
                <p className="text-xs text-green-700">שיא נפח אימון</p>
                <p className="font-bold text-lg text-green-800">{selectedExercise.prVolume} ק"ג</p>
            </div>
            {/* The outline does not specify prDuration in the summary, keeping it as 3 stats */}
          </div>
          {/* Tabs component for switching between different metric charts */}
          <Tabs defaultValue="maxWeight" className="w-full" dir="rtl" onValueChange={setSelectedMetric}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="maxWeight">משקל</TabsTrigger>
              <TabsTrigger value="maxReps">חזרות</TabsTrigger>
              <TabsTrigger value="volume">נפח</TabsTrigger>
              <TabsTrigger value="maxDuration">זמן</TabsTrigger>
            </TabsList>
            <div className="h-64 mt-4" dir="ltr"> {/* Chart container, set dir to ltr for numbers on axis */}
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={selectedExercise.history.map(h => ({...h, date: format(parseISO(h.date), "yyyy-MM-dd")}))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(tick) => format(parseISO(tick), "d/M/yy")}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                        domain={['dataMin - 2', 'auto']} // Adjusted YAxis domain for better visualization
                        tickFormatter={(tick) => `${tick}`}
                        tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip metric={selectedMetric} />} /> {/* Pass selectedMetric to tooltip */}
                    <Line 
                      type="monotone" 
                      dataKey={selectedMetric} // Dynamic dataKey based on selectedMetric state
                      name={metricLabels[selectedMetric]} // Dynamic name based on selectedMetric
                      stroke="#8884d8" 
                      strokeWidth={2} 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
            </div>
          </Tabs>
        </DialogContent>
      )}
    </Dialog>
  );
}
