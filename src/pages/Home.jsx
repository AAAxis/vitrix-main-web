
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { User, WeightEntry, Workout, PreMadeWorkout, CoachMessage, WeightReminder } from '@/api/entities';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UploadFile } from '@/api/integrations';
import { Separator } from '@/components/ui/separator';
import {
  User as UserIcon,
  Calendar,
  Weight,
  TrendingUp,
  Clock,
  Mail,
  Phone,
  X,
  Bell,
  Dumbbell,
  Target,
  Edit,
  Ruler,
  Camera,
  Save,
  Loader2,
  MessageSquare,
  PersonStanding,
  LogOut
} from 'lucide-react';
import { formatDate, formatDetailedDateTime, getRelativeTime, formatCurrentTime, formatFullDateDisplay } from '@/components/utils/timeUtils';
import { format, parseISO, isWithinInterval, startOfToday, subDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { useLocation } from 'react-router-dom';
import NetworkErrorDisplay from '@/components/errors/NetworkErrorDisplay';

// Import home components
import UpdatesCenter from '@/components/home/UpdatesCenter'; // Changed from NotificationsCenter
import CoachWorkouts from '@/components/home/CoachWorkouts';
import QuickActions from '@/components/home/QuickActions';
import UserStats from '@/components/home/UserStats';
import RecentActivity from '@/components/home/RecentActivity';

const motivationMessages = {
  male: [
    "אתה מראה מחויבות אמיתית!",
    "תותח – עוד שלב לעבר היעד שלך!",
    "המשמעת שלך מרשימה, תמשיך כך!",
    "הגוף שלך מודה לך על ההשקעה!",
  ],
  female: [
    "את מדהימה – ההתמדה משתלמת!",
    "איזה כוח רצון! כל הכבוד!",
    "את מוכיחה לעצמך כל יום מחדש!",
    "המאמץ שלך שווה זהב!",
  ],
};

function getRandomMotivationMessage(gender = "male") {
  const genderKey = gender?.toLowerCase() === 'female' ? 'female' : 'male';
  const list = motivationMessages[genderKey];
  const index = Math.floor(Math.random() * list.length);
  return list[index];
}

// --- Helper Components defined at file scope for stability ---

const DetailItem = React.memo(({ icon: Icon, label, value, additionalInfo }) => (
    <div className="flex justify-between items-center py-2 border-b border-slate-200 last:border-b-0">
        <span className="text-slate-600 font-medium flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {label}:
        </span>
        <div className="text-right">
            <span className="font-semibold text-slate-800">{value || 'לא מוגדר'}</span>
            {additionalInfo && (
                <span className="text-blue-600 text-sm ml-2">({additionalInfo})</span>
            )}
        </div>
    </div>
));

const ReadOnlyProfileView = React.memo(({ user, calculateAge, safeFormatDate }) => (
    <>
        <DetailItem icon={UserIcon} label="שם מלא" value={user?.name} />
        <DetailItem icon={Mail} label="אימייל" value={user?.email} />
        <DetailItem icon={PersonStanding} label="מין" value={user?.gender === 'male' ? 'גבר' : user?.gender === 'female' ? 'אישה' : 'לא הוגדר'} />
        <DetailItem
            icon={Calendar}
            label="תאריך לידה"
            value={user?.birth_date ? safeFormatDate(user.birth_date, 'dd/MM/yyyy') : 'לא מוגדר'}
            additionalInfo={user?.birth_date ? calculateAge(user.birth_date) : null}
        />
        <DetailItem icon={Ruler} label="גובה" value={user?.height ? `${(user.height * 100).toFixed(0)} ס״מ` : 'לא מוגדר'} />
        <DetailItem icon={Weight} label="משקל התחלתי" value={user?.initial_weight ? `${user.initial_weight} ק״ג` : 'לא מוגדר'} />
    </>
));

const EditableProfileForm = React.memo(({ editForm, onInputChange, onGenderChange, isSaving }) => (
    <>
        <div className="space-y-2">
            <Label htmlFor="name">שם מלא <span className="text-red-500">*</span></Label>
            <Input id="name" value={editForm.name} onChange={onInputChange} disabled={isSaving} autoComplete="off" />
        </div>
        <div className="space-y-2">
            <Label htmlFor="gender">מין <span className="text-red-500">*</span></Label>
            <Select value={editForm.gender} onValueChange={onGenderChange} disabled={isSaving}>
                <SelectTrigger><SelectValue placeholder="בחר מין" /></SelectTrigger>
                <SelectContent>
                    <SelectItem value="male">גבר</SelectItem>
                    <SelectItem value="female">אישה</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="email">אימייל</Label>
            <Input id="email" type="email" value={editForm.email} onChange={onInputChange} disabled={isSaving} autoComplete="off" />
        </div>
        <div className="space-y-2">
            <Label htmlFor="birth_date">תאריך לידה</Label>
            <Input id="birth_date" type="date" value={editForm.birth_date} onChange={onInputChange} disabled={isSaving} />
        </div>
        <div className="space-y-2">
            <Label htmlFor="height">גובה (ס"מ)</Label>
            <Input id="height" type="number" inputMode="numeric" pattern="[0-9]*" value={editForm.height} onChange={onInputChange} disabled={isSaving} autoComplete="off" />
        </div>
        <div className="space-y-2">
            <Label htmlFor="initial_weight">משקל התחלתי (ק"ג)</Label>
            <Input id="initial_weight" type="number" inputMode="numeric" pattern="[0-9]*" value={editForm.initial_weight} onChange={onInputChange} disabled={isSaving} autoComplete="off" />
        </div>
    </>
));

export default function HomePage() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [networkError, setNetworkError] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [latestWeight, setLatestWeight] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [currentTime, setCurrentTime] = useState('00:00');
    const [currentDate, setCurrentDate] = useState('');

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [profileError, setProfileError] = useState('');
    const [profileSuccess, setProfileSuccess] = useState('');
    const [editForm, setEditForm] = useState({ name: '', gender: '', birth_date: '', initial_weight: '', height: '', email: '' });
    const [profileImageFile, setProfileImageFile] = useState(null); // New state for profile image preview

    const location = useLocation();
    const [showCompletionMessage, setShowCompletionMessage] = useState(false);
    const [workoutSummary, setWorkoutSummary] = useState(null);
    const [motivationalQuote, setMotivationalQuote] = useState('');

    const safeFormatDate = useCallback((dateValue, formatStr = 'dd/MM/yyyy') => {
        if (!dateValue) return 'תאריך לא זמין';
        try {
            // Use the enhanced formatDate function which has better error handling
            return formatDate(dateValue, formatStr) || 'תאריך לא תקין';
        } catch (error) {
            console.warn('Error formatting date in HomePage:', dateValue, error);
            return 'תאריך לא תקין';
        }
    }, []);

    const safeFormatDateTime = useCallback((dateValue) => {
        if (!dateValue) return 'תאריך לא זמין';
        try {
            // Use the enhanced formatDetailedDateTime function
            return formatDetailedDateTime(dateValue) || 'תאריך לא תקין';
        } catch (error) {
            console.warn('Error formatting datetime in HomePage:', dateValue, error);
            return 'תאריך לא תקין';
        }
    }, []);

    const initializeEditForm = useCallback((currentUser) => {
        if (currentUser) {
            setEditForm({
                name: currentUser.name || '',
                gender: currentUser.gender || '',
                birth_date: currentUser.birth_date ? format(parseISO(currentUser.birth_date), 'yyyy-MM-dd') : '',
                initial_weight: currentUser.initial_weight?.toString() || '',
                height: currentUser.height ? (currentUser.height * 100).toFixed(0) : '',
                email: currentUser.email || ''
            });
        }
    }, []);

    const loadUserData = useCallback(async () => {
        setIsLoading(true);
        setNetworkError(false);
        try {
            const currentUser = await User.me();
            setUser(currentUser);
            if (currentUser) {
                initializeEditForm(currentUser);
                const [weightEntries, messages, reminders] = await Promise.all([
                    WeightEntry.filter({ user_email: currentUser.email }, '-date', 1),
                    CoachMessage.filter({ user_email: currentUser.email, is_read: false }),
                    WeightReminder.filter({ user_email: currentUser.email, is_dismissed: false })
                ]);
                setLatestWeight(weightEntries[0] || null);
                setNotifications([...messages.map(msg => ({ type: 'message', ...msg })), ...reminders.map(rem => ({ type: 'reminder', ...rem }))]);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            if (error.message.includes('Network Error') || !navigator.onLine) {
                setNetworkError(true);
            } else {
                setProfileError('שגיאה בטעינת נתוני משתמש.');
            }
        } finally {
            setIsLoading(false);
        }
    }, [initializeEditForm]);

    useEffect(() => {
        loadUserData();
        const clockInterval = setInterval(() => setCurrentTime(formatCurrentTime() || '00:00'), 1000);
        setCurrentTime(formatCurrentTime() || '00:00');
        setCurrentDate(formatFullDateDisplay());

        if (location.state?.workoutCompleted) {
            setShowCompletionMessage(true);
            setWorkoutSummary(location.state.workoutSummary);
            setMotivationalQuote(getRandomMotivationMessage(location.state.userGender));
            window.history.replaceState({}, document.title);
        } else if (location.state?.registrationCompleted) {
            setShowCompletionMessage(true);
            setWorkoutSummary({ type: 'registration', welcomeMessage: location.state.welcomeMessage });
            window.history.replaceState({}, document.title);
        }
        return () => clearInterval(clockInterval);
    }, [location, loadUserData]);

    const handleProfileInputChange = useCallback((e) => {
        const { id, value } = e.target;
        setEditForm(prev => ({ ...prev, [id]: value }));
        if (profileError) setProfileError('');
        if (profileSuccess) setProfileSuccess('');
    }, [profileError, profileSuccess]);

    const handleGenderChange = useCallback((value) => {
        setEditForm(prev => ({ ...prev, gender: value }));
        if (profileError) setProfileError('');
        if (profileSuccess) setProfileSuccess('');
    }, [profileError, profileSuccess]);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            setProfileImageFile(null); // Clear preview if no file selected (e.g., user cancels)
            return;
        }
        
        setProfileImageFile(file); // Set file for immediate preview

        setIsUploadingImage(true);
        setProfileError('');
        setProfileSuccess('');
        try {
            const { file_url } = await UploadFile({ file });
            const updatedUser = await User.updateMyUserData({ profile_image_url: file_url });
            setUser(updatedUser);
            setProfileSuccess('תמונת הפרופיל עודכנה בהצלחה!');
            setTimeout(() => setProfileSuccess(''), 3000);
            setProfileImageFile(null); // Clear preview after successful upload, relying on user.profile_image_url
        } catch (error) {
            console.error('Error uploading image:', error);
            setProfileError('שגיאה בהעלאת התמונה.');
            setProfileImageFile(null); // Clear preview on error
        } finally {
            setIsUploadingImage(false);
            e.target.value = ''; // Clear file input value to allow re-uploading the same file
        }
    };

    const handleSaveProfile = async () => {
        if (isSavingProfile) return;
        setIsSavingProfile(true);
        setProfileError('');
        setProfileSuccess('');
        if (!editForm.gender || !editForm.name.trim()) {
            setProfileError(!editForm.gender ? 'יש לבחור מין.' : 'יש להזין שם מלא.');
            setIsSavingProfile(false);
            return;
        }
        try {
            const updateData = {
                name: editForm.name.trim(),
                gender: editForm.gender,
                birth_date: editForm.birth_date || null,
                initial_weight: editForm.initial_weight ? parseFloat(editForm.initial_weight) : null,
                height: editForm.height ? parseFloat(editForm.height) / 100 : null,
                email: editForm.email.trim()
            };
            const updatedUser = await User.updateMyUserData(updateData);
            setUser(updatedUser);
            setProfileSuccess('הפרופיל עודכן בהצלחה!');
            setIsEditingProfile(false);
            setTimeout(() => setProfileSuccess(''), 3000);
        } catch (error) {
            console.error('Error saving profile:', error);
            setProfileError('שגיאה בשמירת הפרופיל. אנא נסה שוב.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleModalClose = useCallback((isOpen) => {
        if (!isOpen) {
            setIsProfileModalOpen(false);
            setIsEditingProfile(false);
            setProfileError('');
            setProfileSuccess('');
            setProfileImageFile(null); // Clear image preview when modal closes
            if (user) {
                initializeEditForm(user);
            }
        }
    }, [user, initializeEditForm]);

    const calculateAge = useCallback((birthDate) => {
        if (!birthDate) return null;
        const today = new Date();
        const birth = new Date(birthDate);
        let years = today.getFullYear() - birth.getFullYear();
        let months = today.getMonth() - birth.getMonth();
        if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
            years--;
            months = (months + 12) % 12;
        }
        return `${years}.${months}`;
    }, []);

    const handleLogout = async () => {
        try {
            await User.logout();
            // The logout method should automatically redirect to login
        } catch (error) {
            console.error('Logout error:', error);
            alert('שגיאה בהתנתקות. אנא נסה שוב.');
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-emerald-25 to-teal-25">
                <div className="relative">
                    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d04615afd_.png" alt="טוען..." className="w-20 h-20 rounded-2xl object-contain animate-pulse" />
                    <div className="absolute -inset-1 w-22 h-22 rounded-full border-4 border-emerald-300 border-t-transparent animate-spin"></div>
                </div>
            </div>
        );
    }
    
    if (networkError) {
        return <NetworkErrorDisplay onRetry={loadUserData} />;
    }

    const latestCoachMessage = notifications.find(n => n.type === 'message');
    const [hours, minutes] = (currentTime || '00:00').split(':');

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50 to-lime-50 relative">
            <AnimatePresence>
                {showCompletionMessage && workoutSummary && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <Card className={`text-white shadow-2xl border-0 max-w-md w-full ${workoutSummary.type === 'registration' ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>
                            <CardContent className="p-8 text-center">
                                <div className="text-6xl mb-4">{workoutSummary.type === 'registration' ? '🎉' : '🥳'}</div>
                                {workoutSummary.type === 'registration' ? (
                                    <>
                                        <h3 className="text-2xl font-bold mb-4">ברוך הבא למשפחה!</h3>
                                        <p className="text-lg mb-4">{workoutSummary.welcomeMessage}</p>
                                    </>
                                ) : (
                                    <>
                                        <h2 className="text-3xl font-bold mb-3">🎉 כל הכבוד!</h2>
                                        <h3 className="text-2xl font-semibold mb-4">סיימת את האימון בהצלחה</h3>
                                        <p className="text-lg italic text-yellow-200 bg-black/20 rounded-lg p-3 my-4">💬 "{motivationalQuote}"</p>
                                        <div className="space-y-2 text-base mt-6 text-left bg-black/10 p-4 rounded-lg">
                                            <p>⏱️ <strong>משך זמן:</strong> {workoutSummary.duration} דקות</p>
                                            <p>📊 <strong>השלמה:</strong> {workoutSummary.completionRate}%</p>
                                            <p>💪 <strong>תרגילים:</strong> {workoutSummary.exercisesCompleted}/{workoutSummary.totalExercises}</p>
                                            <p>🏋️ <strong>משקל הורם:</strong> {workoutSummary.weightLifted} ק"ג</p>
                                        </div>
                                    </>
                                )}
                                <div className="mt-6">
                                    <Button onClick={() => { setShowCompletionMessage(false); setWorkoutSummary(null); setMotivationalQuote(''); }} className="bg-white text-emerald-600 hover:bg-gray-100 font-semibold px-6 py-2">סגור</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }} 
                onClick={() => setIsProfileModalOpen(true)} 
                className="fixed top-4 left-4 z-50 w-12 h-12 rounded-full bg-white shadow-lg border-2 border-green-200 flex items-center justify-center hover:shadow-xl transition-all duration-300"
            >
                {user?.profile_image_url ? 
                    <img src={user.profile_image_url} alt="Profile" className="w-full h-full rounded-full object-cover" /> : 
                    <UserIcon className="w-6 h-6 text-green-600" />
                }
            </motion.button>

            <div className="max-w-4xl mx-auto p-4 space-y-6" dir="rtl">
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6" dir="rtl">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent">שלום, {user?.name || 'מתאמן'} 👋</h1>
                    <p className="text-slate-600 mt-3 text-lg">ברוך הבא לפלטפורמת האימונים המתקדמת שלך</p>
                </motion.div>

                {/* Clock - Full Width at Top */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-center mb-6">
                    <div className="inline-block bg-gradient-to-br from-white to-slate-100 rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-xl backdrop-blur-lg">
                        <div className="flex items-center justify-center gap-2 font-mono" dir="ltr">
                            <span className="text-6xl md:text-8xl font-bold tracking-tight bg-gradient-to-br from-green-700 via-green-600 to-blue-600 bg-clip-text text-transparent">{hours}</span>
                            <span className="text-6xl md:text-8xl font-bold text-emerald-500/80 animate-pulse">:</span>
                            <span className="text-6xl md:text-8xl font-bold tracking-tight bg-gradient-to-br from-green-700 via-green-600 to-blue-600 bg-clip-text text-transparent">{minutes}</span>
                        </div>
                        <div className="mt-4 px-4 py-2 rounded-full bg-gradient-to-r from-green-100/50 to-blue-100/50 backdrop-blur-sm border border-green-200/20">
                            <p className="text-slate-700 text-lg md:text-xl font-medium tracking-wide">{currentDate}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Updates Center - Full Width */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <UpdatesCenter />
                </motion.div>

                {/* Coach Workouts - Full Width with Weight Icon */}
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <CoachWorkouts user={user} />
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                        {/* Quick Actions */}
                        <QuickActions />
                        
                        {/* User Stats */}
                        <UserStats user={user} latestWeight={latestWeight} />
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* Recent Activity */}
                        <RecentActivity user={user} />
                    </div>
                </div>
            </div>

            {/* Profile Modal */}
            <Dialog open={isProfileModalOpen} onOpenChange={handleModalClose}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-hidden" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <div className="flex items-center gap-2"><UserIcon className="w-5 h-5" />פרופיל אישי</div>
                            {!isEditingProfile ? (
                                <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)} disabled={isSavingProfile || isUploadingImage}><Edit className="w-4 h-4 ml-2" />ערוך</Button>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => { setIsEditingProfile(false); initializeEditForm(user); setProfileError(''); setProfileSuccess(''); setProfileImageFile(null); }} disabled={isSavingProfile || isUploadingImage}><X className="w-4 h-4 ml-2" />בטל</Button>
                            )}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="overflow-y-auto max-h-[calc(90vh-100px)] px-1 space-y-6 pt-4">
                        {user && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative w-32 h-32">
                                    <img
                                        src={profileImageFile ? URL.createObjectURL(profileImageFile) : user.profile_image_url || `https://ui-avatars.com/api/?name=${user.name || 'Unknown'}&background=random&size=128`}
                                        alt="Profile"
                                        className="w-full h-full rounded-full object-cover border-4 border-white shadow-lg"
                                    />
                                    <label htmlFor="profile-upload" className="absolute -bottom-1 -right-1 w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-emerald-600 transition-colors shadow-md">
                                        {isUploadingImage ? <Loader2 className="w-5 h-5 text-white animate-spin"/> : <Camera className="w-5 h-5 text-white" />}
                                        <input id="profile-upload" type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploadingImage || isSavingProfile} />
                                    </label>
                                </div>
                                {!user.profile_image_url && !profileImageFile && (
                                    <p className="text-sm text-slate-500 -mt-2">הוסף תמונה</p>
                                )}
                                <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
                                <p className="text-slate-500">{user.email}</p>
                            </div>
                        )}

                        {profileError && <div className="text-sm text-red-500 text-center bg-red-50 p-2 rounded">{profileError}</div>}
                        {profileSuccess && <div className="text-sm text-emerald-500 text-center bg-emerald-50 p-2 rounded">{profileSuccess}</div>}
                        <div className="space-y-4">
                            <div className="space-y-3 text-sm bg-slate-50 rounded-lg p-4">
                                {isEditingProfile ? (
                                    <EditableProfileForm editForm={editForm} onInputChange={handleProfileInputChange} onGenderChange={handleGenderChange} isSaving={isSavingProfile} />
                                ) : (
                                    <ReadOnlyProfileView user={user} calculateAge={calculateAge} safeFormatDate={safeFormatDate} />
                                )}
                            </div>
                        </div>
                        {isEditingProfile && (
                            <Button onClick={handleSaveProfile} disabled={isSavingProfile || isUploadingImage || !editForm.gender || !editForm.name.trim()} className="w-full">
                                {isSavingProfile ? <><Loader2 className="w-4 h-4 ml-2 animate-spin"/>שומר...</> : <><Save className="w-4 h-4 ml-2"/>שמור שינויים</>}
                            </Button>
                        )}
                        <Separator />
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2"><Dumbbell className="w-5 h-5" />פרטי המאמן</h3>
                            <div className="space-y-3 text-sm bg-emerald-50 rounded-lg p-4">
                                <DetailItem icon={UserIcon} label="שם המאמן" value={user?.coach_name} />
                                <DetailItem icon={Mail} label="אימייל מאמן" value={user?.coach_email} />
                                {user?.coach_phone && <DetailItem icon={Phone} label="טלפון מאמן" value={user.coach_phone} />}
                            </div>
                        </div>
                        
                        <Separator />
                        
                        {/* Logout Section */}
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-3">הגדרות חשבון</h3>
                            <Button 
                                onClick={handleLogout}
                                variant="outline" 
                                className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                            >
                                <LogOut className="w-4 h-4 ml-2" />
                                התנתק מהמערכת
                            </Button>
                        </div>
                        
                        <Button onClick={() => handleModalClose(false)} className="w-full muscle-primary-gradient text-white" disabled={isSavingProfile || isUploadingImage}>סגור</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
