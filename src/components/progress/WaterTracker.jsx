
import React, { useState, useEffect, useCallback } from 'react';
import { WaterTracking, User } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Droplets, Camera, Plus, Trophy, Calendar, Target, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { format, parseISO, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { he } from 'date-fns/locale';
import { getCurrentTime, getCurrentDateString, getCurrentTimeString, formatCurrentTime } from "@/components/utils/timeUtils";

const containerTypes = [
  { value: "כוס (250ml)", ml: 250 },
  { value: "בקבוק קטן (500ml)", ml: 500 },
  { value: "בקבוק גדול (750ml)", ml: 750 },
  { value: "ליטר", ml: 1000 },
  { value: "אחר", ml: 0 }
];

export default function WaterTracker({ user }) {
  const [waterEntries, setWaterEntries] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState("כוס (250ml)");
  const [customAmount, setCustomAmount] = useState('');
  const [dailyGoal, setDailyGoal] = useState(0);
  const [photoFile, setPhotoFile] = useState(null);
  const [coachNote, setCoachNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [error, setError] = useState('');

  const calculateDailyGoal = useCallback(() => {
    if (!user) return;
    const weight = user.current_weight || user.initial_weight || 70;
    const age = user.age || 30;
    const height = user.height ? user.height * 100 : 170;
    let baseAmount = weight * 35;
    if (age < 30) baseAmount *= 1.1;
    else if (age > 50) baseAmount *= 0.95;
    if (height > 180) baseAmount *= 1.05;
    else if (height < 160) baseAmount *= 0.95;
    const goal = Math.round(baseAmount / 250) * 250;
    setDailyGoal(Math.min(Math.max(goal, 2000), 4000));
  }, [user]);

  const loadWaterEntries = useCallback(async () => {
    try {
      // Changed sorting parameter from "-date" to "-created_date"
      const entries = await WaterTracking.filter({ user_email: user.email }, "-created_date", 100);
      setWaterEntries(entries);
    } catch (error) {
      console.error('Error loading water entries:', error);
      setError('שגיאה בטעינת נתוני מים');
    }
  }, [user.email]); // user.email is a dependency

  useEffect(() => {
    if (user?.email) {
      loadWaterEntries();
      calculateDailyGoal();
    }
  }, [user, loadWaterEntries, calculateDailyGoal]); // Added loadWaterEntries and calculateDailyGoal to dependencies

  const getTodayTotal = () => {
    const today = new Date();
    // Changed date comparison to use string representation for consistency with how entry.date is stored
    const todayStr = today.toISOString().split('T')[0]; 
    return waterEntries
      .filter(entry => entry.date === todayStr)
      .reduce((total, entry) => total + entry.amount_ml, 0);
  };

  const getWeeklyStats = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    return weekDays.map(day => {
      const dayEntries = waterEntries.filter(entry => isSameDay(parseISO(entry.date), day));
      const total = dayEntries.reduce((sum, entry) => sum + entry.amount_ml, 0);
      const percentage = dailyGoal > 0 ? Math.round((total / dailyGoal) * 100) : 0;
      
      return {
        date: day,
        total,
        percentage,
        dayName: format(day, 'EEEE', { locale: he }).substring(0, 3)
      };
    });
  };

  const logWater = async () => {
    if (!user?.email) {
        setError('משתמש לא מחובר.');
        return;
    }

    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const container = containerTypes.find(c => c.value === selectedContainer);
      const amount = container?.value === "אחר" ? parseInt(customAmount) : container?.ml;

      if (!amount || isNaN(amount) || amount <= 0) {
        setError('יש להזין כמות תקינה וחיובית.');
        setIsLoading(false);
        return;
      }

      let photoUrl = '';
      
      if (photoFile) {
        setIsUploading(true);
        try {
          const { file_url } = await UploadFile({ file: photoFile });
          photoUrl = file_url;
        } catch (uploadError) {
          console.error('Error uploading photo:', uploadError);
          setError('שגיאה בהעלאת התמונה. אנא נסה שוב.');
          setIsLoading(false);
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const currentTime = getCurrentTime();
      const entryData = {
        user_email: user.email,
        date: getCurrentDateString(), // Consistent date (YYYY-MM-DD)
        amount_ml: amount,
        time_logged: getCurrentTimeString(), // Consistent time
        container_type: selectedContainer,
        daily_goal_ml: dailyGoal,
        photo_url: photoUrl,
        shared_with_coach: !!photoUrl,
        coach_note: coachNote || '',
        viewed_by_coach: false,
      };

      await WaterTracking.create(entryData);
      
      setSuccessMessage(`נרשמו ${amount} מ"ל מים בהצלחה!`);
      
      // Reset fields after successful logging
      setPhotoFile(null);
      setCoachNote('');
      setCustomAmount('');
      const photoInput = document.getElementById('photo');
      if (photoInput) photoInput.value = '';
      
      // Reload entries to show the new one
      await loadWaterEntries();

    } catch (error) {
      console.error('Error logging water:', error);
      setError('אירעה שגיאה ברישום המים. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  };

  const todayTotal = getTodayTotal();
  const todayPercentage = dailyGoal > 0 ? Math.round((todayTotal / dailyGoal) * 100) : 0;
  const weeklyStats = getWeeklyStats();

  return (
    <div className="space-y-6">
      {/* Today's Progress Summary at Top */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Droplets className="w-6 h-6" />
            מעקב שתיית מים - יום זה
          </CardTitle>
          <CardDescription className="text-blue-700">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-600">
                {(todayTotal / 1000).toFixed(1)}L / {(dailyGoal / 1000).toFixed(1)}L
              </span>
              <Badge className={`${todayPercentage >= 100 ? 'bg-green-100 text-green-800' : todayPercentage >= 75 ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                {todayPercentage}% מהיעד
              </Badge>
            </div>
            <Progress value={Math.min(todayPercentage, 100)} className="h-4 mt-2" />
            <p className="text-sm mt-2">
              {todayPercentage >= 100 ? '🎉 הגעת ליעד היומי!' : 
               todayPercentage >= 75 ? '💪 כמעט שם!' : 
               `נותרו ${Math.max(0, (dailyGoal - todayTotal) / 1000).toFixed(1)} ליטר ליעד`}
            </p>
          </CardDescription>
        </CardHeader>
      </Card>

      {/* General Water Tracking Info Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Droplets className="w-6 h-6" />
            מעקב שתיית מים
          </CardTitle>
          <CardDescription className="text-blue-700">
            שמירה על לחות הגוף חיונית לבריאות ולהצלחת התהליך
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-100 border-blue-300 text-blue-800 mb-4">
            <Target className="h-4 w-4" />
            <AlertDescription>
              <strong>היעד היומי שלך:</strong> {(dailyGoal / 1000).toFixed(1)} ליטר ({dailyGoal} מ"ל)
              <br />
              <small>חושב בהתאם לגיל, משקל וגובה שלך</small>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Tabs defaultValue="log" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="log">רישום מים</TabsTrigger>
          <TabsTrigger value="stats">סטטיסטיקות</TabsTrigger>
          <TabsTrigger value="history">היסטוריה</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" />
                רישום שתיית מים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="container">סוג כלי</Label>
                  <Select value={selectedContainer} onValueChange={setSelectedContainer}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {containerTypes.map(container => (
                        <SelectItem key={container.value} value={container.value}>
                          {container.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedContainer === "אחר" && (
                  <div>
                    <Label htmlFor="customAmount">כמות במ"ל</Label>
                    <Input
                      id="customAmount"
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="הזן כמות במ״ל"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="photo">תמונה (אופציונלי - תישלח למאמן)</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0])}
                  className="mb-2"
                />
                {photoFile && (
                  <div className="text-sm text-green-600 flex items-center gap-1">
                    <Camera className="w-4 h-4" />
                    תמונה נבחרה - תישלח למאמן
                  </div>
                )}
              </div>

              {photoFile && (
                <div>
                  <Label htmlFor="coachNote">הערה למאמן (אופציונלי)</Label>
                  <Input
                    id="coachNote"
                    value={coachNote}
                    onChange={(e) => setCoachNote(e.target.value)}
                    placeholder="הערה עבור המאמן..."
                  />
                </div>
              )}

              <Button 
                onClick={logWater} 
                disabled={isLoading || isUploading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading || isUploading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {isUploading ? 'מעלה תמונה...' : 'רושם...'}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4" />
                    רשום מים
                  </div>
                )}
              </Button>

              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert className="bg-green-50 border-green-200 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                סטטיסטיקות שבועיות
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {weeklyStats.map((day, index) => (
                  <div key={index} className="text-center">
                    <div className="text-xs text-slate-600 mb-1">{day.dayName}</div>
                    <div 
                      className={`rounded-lg flex flex-col justify-end p-2 text-white font-bold ${
                        day.percentage >= 100 ? 'bg-green-500' :
                        day.percentage >= 75 ? 'bg-blue-500' :
                        day.percentage >= 50 ? 'bg-yellow-500' :
                        day.percentage > 0 ? 'bg-orange-500' : 'bg-gray-200'
                      }`} 
                      style={{ height: `${Math.max(40, 40 + (day.percentage * 0.6))}px` }}
                    >
                      <div className="text-xs">
                        {day.percentage}%
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 mt-1">
                      {(day.total / 1000).toFixed(1)}L
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                היסטוריית רישומים
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {waterEntries.length > 0 ? waterEntries
                  .sort((a, b) => new Date(b.date + ' ' + (b.time_logged || '00:00')) - new Date(a.date + ' ' + (a.time_logged || '00:00')))
                  .slice(0, 20)
                  .map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Droplets className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="font-medium">
                            {entry.amount_ml} מ"ל - {entry.container_type}
                          </div>
                          <div className="text-sm text-slate-600">
                            {format(parseISO(entry.date), 'dd/MM/yyyy', { locale: he })} | {entry.time_logged || '00:00'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {entry.photo_url && (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            📷 עם תמונה
                          </Badge>
                        )}
                        {entry.shared_with_coach && (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            <Send className="w-3 h-3 me-1" />
                            נשלח למאמן
                          </Badge>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-slate-500">
                      <Droplets className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>עדיין לא נרשמו מים היום</p>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
