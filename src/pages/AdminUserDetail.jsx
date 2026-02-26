import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { User, WeightEntry, WeeklyTask, Workout, WaterTracking, CalorieTracking, ProgressPicture } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, ArrowRight, Scale, Activity, ClipboardList, MessageSquare, Share2, Cake, HeartPulse, Weight, Recycle, Ruler, Droplets, Zap, Target, PieChart, AlertTriangle, Dumbbell
} from 'lucide-react';
import { parseISO, subDays, isBefore, isWithinInterval, startOfToday } from 'date-fns';
import { formatDate, getRelativeTime } from '@/components/utils/timeUtils';
import UserTrackingTab from '@/components/admin/UserTrackingTab';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-50 border text-center">
    <Icon className={`w-6 h-6 mb-1 ${color || 'text-slate-600'}`} />
    <span className="text-lg font-bold text-slate-800">{value || 'N/A'}</span>
    <span className="text-xs text-slate-500">{label}</span>
  </div>
);

const BMICard = ({ bmi }) => {
  const getBMIInfo = (bmiValue) => {
    if (!bmiValue) return { category: 'לא זמין', color: 'text-gray-500', bgColor: 'bg-gray-100' };
    if (bmiValue < 18.5) return { category: 'תת משקל', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (bmiValue >= 18.5 && bmiValue < 25) return { category: 'משקל תקין', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (bmiValue >= 25 && bmiValue < 30) return { category: 'עודף משקל', color: 'text-orange-600', bgColor: 'bg-orange-100' };
    return { category: 'השמנה', color: 'text-red-600', bgColor: 'bg-red-100' };
  };
  const bmiInfo = getBMIInfo(bmi);
  return (
    <div className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center ${bmiInfo.bgColor}`}>
      <HeartPulse className={`w-6 h-6 mb-1 ${bmiInfo.color}`} />
      <span className={`text-lg font-bold ${bmi || 'N/A'}`}>{bmiInfo.category === 'משקל תקין' ? `${bmi} ✅` : bmi}</span>
      <span className="text-xs text-slate-500">BMI</span>
      <span className={`text-xs font-medium mt-1 ${bmiInfo.color}`}>{bmiInfo.category}</span>
    </div>
  );
};

function findLatestAvailableValue(measurements, fieldName) {
  if (!measurements?.length) return null;
  for (const m of measurements) {
    const v = m[fieldName];
    if (v != null && v !== '') return { value: v, date: m.date || m.created_date, measurementId: m.id };
  }
  return null;
}

function syncUserWithLatestMeasurements(user, userWeights) {
  if (!userWeights?.length) {
    const u = { ...user, measurementSync: {} };
    if (user.initial_weight && user.height && !user.bmi) {
      const h = typeof user.height === 'string' ? parseFloat(user.height) : user.height;
      const w = typeof user.initial_weight === 'string' ? parseFloat(user.initial_weight) : user.initial_weight;
      if (!isNaN(h) && !isNaN(w) && h > 0 && w > 0) {
        u.bmi = Math.round((w / (h * h)) * 10) / 10;
        u.weight = u.current_weight = w;
      }
    }
    return u;
  }
  const sorted = [...userWeights].sort((a, b) => new Date(b.date || b.created_date) - new Date(a.date || a.created_date));
  const synced = { ...user, measurementSync: {} };
  const fields = ['weight', 'height', 'bmi', 'metabolic_age', 'visceral_fat', 'muscle_mass', 'fat_percentage', 'body_water_percentage', 'physique_rating', 'bmr', 'chest_circumference', 'waist_circumference', 'hip_circumference', 'glutes_circumference', 'neck_circumference', 'bicep_circumference_right', 'bicep_circumference_left', 'thigh_circumference_right', 'thigh_circumference_left', 'calf_circumference_right', 'calf_circumference_left'];
  fields.forEach((fieldName) => {
    const latest = findLatestAvailableValue(sorted, fieldName);
    if (latest) {
      if (fieldName === 'weight') {
        synced.current_weight = synced.weight = latest.value;
      } else {
        synced[fieldName] = latest.value;
      }
      synced.measurementSync[fieldName] = { value: latest.value, syncedFromDate: latest.date, syncedFromMeasurementId: latest.measurementId, syncedAt: new Date().toISOString() };
    }
  });
  if (!synced.bmi && (synced.weight || synced.current_weight || synced.initial_weight) && synced.height) {
    let w = synced.weight || synced.current_weight || synced.initial_weight;
    let h = synced.height;
    if (typeof w === 'string') w = parseFloat(w);
    if (typeof h === 'string') h = parseFloat(h);
    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) synced.bmi = Math.round((w / (h * h)) * 10) / 10;
  }
  if (!synced.age && synced.birth_date) {
    const b = new Date(synced.birth_date);
    const t = new Date();
    synced.age = t.getFullYear() - b.getFullYear() - (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate()) ? 1 : 0);
  }
  synced.latestMeasurement = sorted[0] || null;
  return synced;
}

const displayValue = (value, unit = '') => {
  if (value == null || value === '' || (typeof value === 'number' && isNaN(value))) return 'N/A';
  return unit ? `${value} ${unit}` : value;
};

export default function AdminUserDetail({ userEmailFromPath }) {
  const { userEmail: encodedEmail } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const basePath = pathname.startsWith('/trainer') ? '/trainer' : '/admin';
  const listPath = `${basePath}/user-management/user-list`;

  const [user, setUser] = useState(null);
  const [details, setDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCopied, setIsCopied] = useState(false);

  const userEmail = (userEmailFromPath != null && userEmailFromPath !== '')
    ? userEmailFromPath
    : (encodedEmail ? decodeURIComponent(encodedEmail) : '');

  const loadData = useCallback(async () => {
    if (!userEmail) {
      setError('חסר אימייל משתמש');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const users = await User.filter({ email: userEmail });
      const u = users?.[0];
      if (!u) {
        setError('משתמש לא נמצא');
        setUser(null);
        setDetails(null);
        setIsLoading(false);
        return;
      }
      setUser(u);
      const [userWeights, userWorkouts, userTasks, waterLogs, calorieEntries, progressPictures] = await Promise.all([
        WeightEntry.filter({ user_email: u.email }, '-created_date').catch(() => []),
        Workout.filter({ created_by: u.email }, '-date').catch(() => []),
        WeeklyTask.filter({ user_email: u.email }, 'week').catch(() => []),
        WaterTracking.filter({ user_email: u.email }, '-date').catch(() => []),
        CalorieTracking.filter({ user_email: u.email }, '-date').catch(() => []),
        ProgressPicture.filter({ user_email: u.email }, '-photo_date').catch(() => []),
      ]);
      const synced = syncUserWithLatestMeasurements(u, userWeights);
      setDetails({
        ...synced,
        allWeights: userWeights,
        allWorkouts: userWorkouts,
        allTasks: userTasks,
        waterLogs,
        calorieEntries,
        progressPictures,
      });
    } catch (err) {
      console.error('Error loading user detail:', err);
      setError('שגיאה בטעינת פרטי המשתמש');
      setUser(null);
      setDetails(null);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleShare = useCallback(() => {
    if (!details) return;
    const getBMICategory = (bmi) => {
      if (!bmi) return 'לא זמין';
      if (bmi < 18.5) return 'תת משקל';
      if (bmi >= 18.5 && bmi < 25) return 'משקל תקין ✅';
      if (bmi >= 25 && bmi < 30) return 'עודף משקל ⚠️';
      return 'השמנה 🔴';
    };
    const glutes = details.glutes_circumference || details.hip_circumference;
    const text = `
📊 סקירת התקדמות עבור ${details.name} 📊
🎂 גיל: ${displayValue(details.age)}
⚡ גיל מטבולי: ${displayValue(details.metabolic_age)}
📏 גובה: ${details.height ? `${(details.height * 100).toFixed(0)} ס"מ` : 'לא צוין'}
📈 משקל התחלתי: ${displayValue(details.initial_weight, 'ק"ג')}
⚖️ משקל נוכחי: ${displayValue(details.weight, 'ק"ג')}
🔥 אחוז שומן: ${displayValue(details.fat_percentage, '%')}
💪 מסת שריר: ${displayValue(details.muscle_mass, 'ק"ג')}
💖 BMI: ${displayValue(details.bmi)} (${getBMICategory(details.bmi)})
🌊 אחוז מים: ${displayValue(details.body_water_percentage, '%')}
⚠️ שומן ויסצרלי: ${displayValue(details.visceral_fat)}
⭐ דירוג מבנה גוף: ${details.physique_rating ? `${details.physique_rating}/9` : 'לא צוין'}
⚡ BMR: ${details.bmr ? `${details.bmr} קל'` : 'לא צוין'}
📐 מדידות: חזה ${displayValue(details.chest_circumference, 'ס"מ')} מותן ${displayValue(details.waist_circumference, 'ס"מ')} ישבן ${displayValue(glutes, 'ס"מ')}
#Vitrix #Progress #FitnessJourney
`.trim();
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [details]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4" dir="rtl">
        <Loader2 className="w-10 h-10 animate-spin text-slate-600" />
        <p className="text-slate-600">טוען פרטי מתאמן...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-4 max-w-md mx-auto" dir="rtl">
        <Button variant="outline" onClick={() => navigate(listPath)} className="mb-4 gap-2">
          <ArrowRight className="w-4 h-4" />
          חזרה לרשימה
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-red-600">{error || 'משתמש לא נמצא'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4" dir="rtl" style={{ textAlign: 'right' }}>
      <div className="max-w-4xl mx-auto space-y-4">
        <Button variant="outline" onClick={() => navigate(listPath)} className="gap-2">
          <ArrowRight className="w-4 h-4" />
          חזרה לרשימת מתאמנים
        </Button>
        <h1 className="text-2xl font-bold text-slate-800">פרטי מתאמן: {details?.name || user.name}</h1>

        <ScrollArea className="h-[calc(100vh-180px)]">
          <div className="space-y-6 pb-8">
            {/* Activity: weight, weekly task, booster notes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Scale className="text-green-600 w-4 h-4" /> מעקב משקל
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 text-center">
                {(() => {
                  const currentWeightEntry = details?.allWeights?.[0];
                  const sevenDaysAgo = subDays(new Date(), 7);
                  const lastWeekEntry = details?.allWeights?.find((e) => isBefore(parseISO(e.date || e.created_date), sevenDaysAgo));
                  return (
                    <>
                      <div>
                        <p className="text-xs text-slate-500">משקל שבוע שעבר</p>
                        <p className="text-lg font-bold text-slate-800">{displayValue(lastWeekEntry?.weight)}</p>
                        {lastWeekEntry && <p className="text-xs text-slate-400">{formatDate(lastWeekEntry.date || lastWeekEntry.created_date)}</p>}
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">משקל נוכחי</p>
                        <p className="text-lg font-bold text-green-600">{displayValue(currentWeightEntry?.weight)}</p>
                        {currentWeightEntry && <p className="text-xs text-slate-400">{formatDate(currentWeightEntry.date || currentWeightEntry.created_date)}</p>}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="text-purple-600 w-4 h-4" /> סטטוס משימה שבועית
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const today = startOfToday();
                  const currentTask = details?.allTasks?.find((task) => {
                    try {
                      return isWithinInterval(today, { start: parseISO(task.week_start_date), end: parseISO(task.week_end_date) });
                    } catch {
                      return false;
                    }
                  });
                  return currentTask ? (
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{currentTask.title}</p>
                      <Badge variant={currentTask.status === 'הושלם' ? 'default' : currentTask.status === 'בעבודה' ? 'secondary' : 'outline'} className="text-xs">
                        {currentTask.status}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center text-sm">אין משימה פעילה לשבוע זה.</p>
                  );
                })()}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="text-amber-600 w-4 h-4" /> הערות מתוכנית הבוסטר
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32 p-2 bg-slate-50 rounded-md border">
                  {(() => {
                    const allNotes = details?.allTasks
                      ?.flatMap((task) => (task.notes_thread || []).map((n) => ({ ...n, week: task.week, title: task.title })))
                      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)) || [];
                    return allNotes.length > 0 ? (
                      <div className="space-y-3">
                        {allNotes.map((note, i) => (
                          <div key={i}>
                            <p className="text-slate-800 text-sm">"{note.text}"</p>
                            <p className="text-xs text-slate-500 mt-1">מתוך שבוע {note.week}: {note.title} • {getRelativeTime(note.timestamp)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-center pt-8 text-sm">לא נמצאו הערות.</p>
                    );
                  })()}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Stats overview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">סקירת נתונים פיזיים</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-slate-700">מידע בסיסי</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={Cake} label="גיל" value={displayValue(details?.age)} />
                    <StatCard icon={Recycle} label="גיל מטבולי" value={displayValue(details?.metabolic_age)} color="text-teal-500" />
                    <StatCard icon={Ruler} label="גובה" value={details?.height ? displayValue((details.height * 100).toFixed(0), 'ס"מ') : null} color="text-indigo-500" />
                    <StatCard icon={Target} label="דירוג מבנה גוף" value={details?.physique_rating ? `${details.physique_rating}/9` : null} color="text-purple-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-slate-700">משקל והרכב גוף</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard icon={Weight} label="משקל התחלתי" value={displayValue(details?.initial_weight, 'ק"ג')} color="text-blue-500" />
                    <StatCard icon={Weight} label="משקל נוכחי" value={displayValue(details?.weight, 'ק"ג')} color="text-green-500" />
                    <StatCard icon={PieChart} label="אחוז שומן" value={displayValue(details?.fat_percentage, '%')} color="text-orange-500" />
                    <StatCard icon={Dumbbell} label="מסת שריר" value={displayValue(details?.muscle_mass, 'ק"ג')} color="text-purple-500" />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-slate-700">מדדים בריאותיים</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <BMICard bmi={details?.bmi} />
                    <StatCard icon={Droplets} label="אחוז מים" value={displayValue(details?.body_water_percentage, '%')} color="text-cyan-500" />
                    <StatCard icon={AlertTriangle} label="שומן ויסצרלי" value={displayValue(details?.visceral_fat)} color="text-red-500" />
                    <StatCard icon={Zap} label="BMR" value={displayValue(details?.bmr, "קל'")} color="text-yellow-500" />
                  </div>
                </div>
                {(details?.chest_circumference || details?.waist_circumference || details?.glutes_circumference || details?.hip_circumference || details?.neck_circumference) && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 text-slate-700">מדידות גוף</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {details.chest_circumference && <StatCard icon={Activity} label="חזה" value={displayValue(details.chest_circumference, 'ס"מ')} color="text-blue-500" />}
                      {details.waist_circumference && <StatCard icon={Target} label="מותן" value={displayValue(details.waist_circumference, 'ס"מ')} color="text-orange-500" />}
                      {(details.glutes_circumference || details.hip_circumference) && <StatCard icon={Activity} label="ישבן" value={displayValue(details.glutes_circumference || details.hip_circumference, 'ס"מ')} color="text-purple-500" />}
                      {details.neck_circumference && <StatCard icon={Ruler} label="צוואר" value={displayValue(details.neck_circumference, 'ס"מ')} color="text-gray-500" />}
                    </div>
                  </div>
                )}
                <Button onClick={handleShare} className="w-full gap-2">
                  <Share2 className="w-4 h-4" />
                  {isCopied ? 'הועתק!' : 'העתק נתונים מפורטים לשיתוף'}
                </Button>
              </CardContent>
            </Card>

            {/* Full tracking */}
            <div>
              <h2 className="text-lg font-semibold text-slate-800 mb-3">מעקב מלא</h2>
              <UserTrackingTab user={user} />
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
