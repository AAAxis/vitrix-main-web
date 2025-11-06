
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { User, Workout, WeightEntry, CalorieTracking, ProgressPicture, WeeklyTask, BoosterPlusTask, GroupEvent, WaterTracking } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Scale, Utensils, Droplets, CheckSquare, Camera, Activity, ArrowRight, LayoutDashboard, CalendarDays, BookOpen, FileDown, Target, Trophy, Calendar, Video, HeartPulse, Dumbbell, Percent, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isWithinInterval, parseISO, startOfDay, endOfDay, isSameDay, isBefore, format } from "date-fns";
import { he } from "date-fns/locale";
import WeightTracker from "../components/progress/WeightTracker";
import PhotoProgress from "../components/progress/PhotoProgress";
import CalorieTracker from "../components/progress/CalorieTracker";
import WeeklyTasksTracker from "../components/progress/WeeklyTasksTracker";
import BoosterMeasurements from "../components/progress/BoosterMeasurements";
import WaterTracker from "../components/progress/WaterTracker";
import LockedContent from "../components/progress/LockedContent";
import NetworkErrorDisplay from "../components/errors/NetworkErrorDisplay";
import { Button } from "@/components/ui/button";
import BoosterOverview from "../components/progress/BoosterOverview";
import LecturesViewer from "../components/progress/LecturesViewer";
import ExportReports from "../components/progress/ExportReports";
import MonthlyGoals from '../components/progress/MonthlyGoals';
import EventsTimeline from '../components/progress/EventsTimeline';
import { useLocation } from "react-router-dom";
import BoosterFeedbackModal from "../components/progress/BoosterFeedbackModal";

const cardDefinitions = [
    { moduleKey: 'overview', title: 'סקירה כללית', icon: LayoutDashboard },
    { moduleKey: 'measurements', title: 'מדדי גוף', icon: Activity },
    { moduleKey: 'calories', title: 'צריכת קלוריות', icon: Utensils },
    { moduleKey: 'water', title: 'מעקב מים', icon: Droplets },
    { moduleKey: 'weight', title: 'משקל', icon: Scale },
    { moduleKey: 'weeklyTasks', title: 'משימות שבועיות', icon: CheckSquare, hideIfNoData: false },
    { moduleKey: 'monthlyGoals', title: 'מטרות חודשיות', icon: Trophy },
    { moduleKey: 'events', title: 'לוח אירועים', icon: Calendar },
    { moduleKey: 'lectures', title: 'הרצאות', icon: BookOpen },
    { moduleKey: 'photos', title: 'תמונות התקדמות', icon: Camera },
    { moduleKey: 'export', title: 'ייצוא דוחות', icon: FileDown },
];

const BoosterCard = ({ card, onSelect }) => (
    <motion.button
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onClick={() => onSelect(card.moduleKey)}
        aria-label={`פתח ${card.title}`}
        className="w-full text-right p-4 rounded-xl transition-all duration-200 flex flex-col justify-between muscle-glass hover:bg-slate-50 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        style={{ minHeight: '120px' }}
    >
        <div>
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-full">
                        <card.icon className="w-5 h-5 text-green-600" />
                    </div>
                    <strong className="text-slate-800 font-semibold">{card.title}</strong>
                </div>
                {card.requiresAttention && (
                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold animate-pulse">
                        לטיפול
                    </span>
                )}
            </div>
            {Array.isArray(card.kpiText) ? (
                 <div className="mt-3 space-y-2">
                    {card.kpiText.map((metric, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-slate-600">
                                <metric.icon className="w-4 h-4 text-slate-500" />
                                <span>{metric.label}</span>
                            </div>
                            <span className="font-semibold text-slate-800">{metric.value}</span>
                        </div>
                    ))}
                </div>
            ) : (
                // Check if kpiText is a React element (JSX) or a plain string
                typeof card.kpiText === 'object' && card.kpiText !== null && !React.isValidElement(card.kpiText) ? // This condition for object & not a React element is tricky. Simpler: if it's already a React node, render it.
                // A React element itself can be an object. Let's assume if it's not an array, and it's an object, it's a React node.
                <div className="mt-3">{card.kpiText}</div> : // Render JSX directly
                <p className="mt-3 text-sm text-slate-600">{card.kpiText}</p> // Render string in <p>
            )}
        </div>
    </motion.button>
);

const SkeletonGrid = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="p-4 rounded-xl muscle-glass animate-pulse" style={{ minHeight: '120px' }}>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-200" />
                    <div className="h-4 w-2/3 rounded bg-slate-200" />
                </div>
                <div className="h-3 w-1/2 rounded bg-slate-200 mt-4" />
            </div>
        ))}
    </div>
);

const EmptyState = () => (
    <Card className="text-center py-16 px-6">
        <CardContent className="flex flex-col items-center justify-center">
            <Inbox className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">אין נתונים להצגה</h3>
            <p className="text-slate-500 mt-2 max-w-md mx-auto">
                נראה שעדיין לא נאספו נתונים עבור תוכנית הבוסטר. התחל/י להשתמש באפליקציה והנתונים יופיעו כאן באופן אוטומטי.
            </p>
        </CardContent>
    </Card>
);

const ModuleDetailView = ({ moduleKey, user, onBack, calorieEntries, onUpdateCalorieEntries, weightEntries, onUpdateWeightEntries, onBoosterReportGenerated, onFinalTaskCompleted, workouts }) => {
    const renderModule = () => {
        switch (moduleKey) {
            case 'calories':
                return <CalorieTracker user={user} calorieEntries={calorieEntries} onUpdateEntries={onUpdateCalorieEntries} />;
            case 'weight':
                return <WeightTracker user={user} weightEntries={weightEntries} onUpdateEntries={onUpdateWeightEntries} />;
            case 'water':
                return <WaterTracker user={user} />;
            case 'weeklyTasks':
                return <WeeklyTasksTracker user={user} onFinalTaskCompleted={onFinalTaskCompleted} />;
            case 'monthlyGoals':
                return <MonthlyGoals user={user} />;
            case 'events':
                return <EventsTimeline user={user} />;
            case 'photos':
                return <PhotoProgress user={user} />;
            case 'measurements':
                return <BoosterMeasurements user={user} />;
            case 'overview':
                return <BoosterOverview user={user} workouts={workouts} weightEntries={weightEntries} />;
            case 'lectures':
                return <LecturesViewer />;
            case 'export':
                return <ExportReports user={user} onBoosterReportGenerated={onBoosterReportGenerated} />;
            default:
                return <p>מודול לא נמצא</p>;
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
            <Button variant="outline" onClick={onBack} className="mb-4 flex items-center gap-2">
                <ArrowRight className="w-4 h-4" />
                חזור לסקירה הכללית
            </Button>
            <div className="space-y-6 muscle-glass p-6 rounded-xl">
                {renderModule()}
            </div>
        </motion.div>
    );
};

export default function Progress() {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [networkError, setNetworkError] = useState(false);
    const [cardsData, setCardsData] = useState([]);
    const [workouts, setWorkouts] = useState([]); // New state for workouts

    const [selectedModule, setSelectedModule] = useState(null);

    // States for detailed data needed by components
    const [weightEntries, setWeightEntries] = useState([]);
    const [calorieEntries, setCalorieEntries] = useState([]);
    const location = useLocation();
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

    const fetchKPIs = useCallback(async (currentUser) => {
        if (!currentUser) return [];
        const userGroups = currentUser.group_names || [];

        const todayStr = new Date().toISOString().split('T')[0];

        // Fetch all lightweight data in parallel
        const [
            caloriesToday,
            recentMeasurements, // Renamed from lastTwoWeights to better reflect its use for multiple measurements
            waterToday,
            allTasks,
            allBoosterPlusTasks,
            lastPicture,
            groupEvents
        ] = await Promise.all([
            CalorieTracking.filter({ user_email: currentUser.email, date: todayStr }),
            WeightEntry.filter({ user_email: currentUser.email }, "-date", 10), // Fetch last 10 for better metric finding
            WaterTracking.filter({ user_email: currentUser.email, date: todayStr }),
            WeeklyTask.filter({ user_email: currentUser.email }),
            currentUser.booster_plus_enabled ? BoosterPlusTask.filter({ user_email: currentUser.email }) : Promise.resolve([]),
            ProgressPicture.filter({ user_email: currentUser.email }, "-photo_date", 1),
            userGroups.length > 0 ? GroupEvent.filter({ group_name: { '$in': userGroups } }) : Promise.resolve([])
        ]);

        const kpiCalculators = {
            overview: () => {
                // מגמת משקל (עלייה/ירידה)
                const validWeights = recentMeasurements.filter(e => e.weight != null);
                if (validWeights.length < 2) return { text: "אין מספיק נתונים למגמה", hasData: false };
                const change = validWeights[0].weight - validWeights[1].weight;
                if (Math.abs(change) < 0.1) return { text: 'משקל יציב', hasData: true };
                const trend = change > 0 ? 'עלייה' : 'ירידה';
                return { text: `${Math.abs(change).toFixed(1)} ק"ג ${trend}`, hasData: true };
            },
            measurements: () => {
                if (recentMeasurements.length === 0) return { text: "אין נתוני מדידות", hasData: false };

                const findLatestValue = (field) => {
                    const entry = recentMeasurements.find(e => e[field] != null && e[field] !== '');
                    return entry ? entry[field] : null;
                };

                const latestBmi = findLatestValue('bmi');
                const latestMuscleMass = findLatestValue('muscle_mass');
                const latestFatPercentage = findLatestValue('fat_percentage');

                const hasData = latestBmi || latestMuscleMass || latestFatPercentage;
                if (!hasData) {
                    return { text: "אין נתוני מדידות", hasData: false };
                }

                const kpiData = [
                    {
                        label: 'BMI',
                        value: latestBmi ? latestBmi.toFixed(1) : '—',
                        icon: HeartPulse
                    },
                    {
                        label: 'מסת שריר',
                        value: latestMuscleMass ? `${latestMuscleMass} ק"ג` : '—',
                        icon: Dumbbell
                    },
                    {
                        label: 'אחוזי שומן',
                        value: latestFatPercentage ? `${latestFatPercentage}%` : '—',
                        icon: Percent
                    }
                ];

                return { text: kpiData, hasData: true };
            },
            calories: () => {
                // Use coach-set target if available
                const calorieGoal = currentUser.calorie_target || 2000;
                const total = caloriesToday.reduce((sum, entry) => sum + (entry.estimated_calories || 0), 0);
                if (total === 0) return { text: "לא נרשמו קלוריות היום", hasData: false };
                const percentage = Math.round((total / calorieGoal) * 100);
                return {
                    text: `${total.toLocaleString()} קק"ל (${percentage}% מהיעד)`,
                    hasData: true,
                    progress: Math.min(percentage, 100)
                };
            },
            water: () => {
                // סך ההתקדמות היומית שנצרכה עד עכשיו
                const totalWater = waterToday.reduce((sum, entry) => sum + (entry.amount_ml || 0), 0);
                if (totalWater === 0) return { text: "לא נרשמה שתיית מים היום", hasData: false };
                return { text: `${(totalWater/1000).toFixed(1)} ליטר נשתו היום`, hasData: true };
            },
             weight: () => {
                // משקל נוכחי
                const latestWeightEntry = recentMeasurements.find(e => e.weight != null);
                if (!latestWeightEntry) return { text: "אין נתוני משקל", hasData: false };
                return { text: `משקל נוכחי: ${latestWeightEntry.weight.toFixed(1)} ק"ג`, hasData: true };
            },
            weeklyTasks: () => {
                const todayStart = startOfDay(new Date());
                const allCombinedTasks = [...allTasks, ...allBoosterPlusTasks];

                const activeTask = allCombinedTasks.find(task => {
                    try {
                        const startDate = parseISO(task.week_start_date);
                        const endDate = parseISO(task.week_end_date);
                        const periodStart = startOfDay(startDate);
                        const periodEnd = endOfDay(endDate);
                        return isWithinInterval(todayStart, { start: periodStart, end: periodEnd });
                    } catch {
                        return false;
                    }
                });
                
                if (activeTask) {
                    const requiresAttention = activeTask.status !== 'הושלם';
                    const title = (activeTask.title || '').length > 40 ? `${activeTask.title.substring(0, 40)}...` : activeTask.title;
                    
                    const displayText = (
                        <div className="text-right">
                            <p className="font-bold text-slate-800 text-base">שבוע {activeTask.week}</p>
                            <p className="text-slate-600 text-sm">{title}</p>
                        </div>
                    );

                    return { text: displayText, hasData: true, requiresAttention };
                }
                return { text: "אין משימה פעילה השבוע", hasData: false };
            },
            monthlyGoals: () => {
                // KPI for Monthly Goals
                return { text: "הגדר את המטרות החודשיות שלך", hasData: true };
            },
            events: () => {
                const today = new Date();
                const startOfToday = startOfDay(today);

                const upcomingEvents = groupEvents
                    .filter(event => !isBefore(parseISO(event.end_datetime), startOfToday))
                    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));

                if (upcomingEvents.length === 0) {
                    return { text: "אין אירועים קרובים", hasData: false };
                }

                const todayEvents = upcomingEvents.filter(event => isSameDay(parseISO(event.start_datetime), today));

                if (todayEvents.length > 0) {
                    const eventTitles = todayEvents.map(event => event.event_title).join(', ');
                    return { text: `היום: ${eventTitles}`, hasData: true, requiresAttention: true };
                }

                const nextEvent = upcomingEvents[0];
                const nextEventDateFormatted = format(parseISO(nextEvent.start_datetime), 'd MMMM', { locale: he });
                return { text: `אירוע הבא: ${nextEvent.event_title} (${nextEventDateFormatted})`, hasData: true };
            },
            photos: () => {
                if (lastPicture.length === 0) return { text: "אין תמונות התקדמות", hasData: false };
                return { text: `תמונה אחרונה: ${new Date(lastPicture[0].photo_date).toLocaleDateString('he-IL')}`, hasData: true };
            },
            lectures: () => ({
                text: "ספריית הרצאות מקצועיות",
                hasData: true
            }),
            export: () => ({
                text: "הפקת דוחות התקדמות",
                hasData: true
            })
        };

        return cardDefinitions
            .map(cardDef => {
                const kpi = kpiCalculators[cardDef.moduleKey](currentUser); // Pass currentUser to calculators
                const visible = !cardDef.hideIfNoData || kpi.hasData;
                return visible ? {
                    ...cardDef,
                    kpiText: kpi.text,
                    hasData: kpi.hasData,
                    requiresAttention: kpi.requiresAttention
                } : null;
            })
            .filter(Boolean);
    }, []);

    const loadInitialData = useCallback(async () => {
        setIsLoading(true);
        setNetworkError(false);
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            if (currentUser?.booster_unlocked) {
                // Analytics
                console.log("Analytics Event: booster_tab_open");

                const kpiData = await fetchKPIs(currentUser);
                setCardsData(kpiData);

                // Load full data for detail views in the background
                const [userWeightEntries, userCalorieEntries, userWorkouts] = await Promise.all([
                    WeightEntry.filter({ user_email: currentUser.email }, "-date"),
                    CalorieTracking.filter({ user_email: currentUser.email }, "-date"),
                    Workout.filter({ created_by: currentUser.email, status: 'הושלם' }) // Fetch user workouts
                ]);
                setWeightEntries(userWeightEntries || []);
                setCalorieEntries(userCalorieEntries || []);
                setWorkouts(userWorkouts || []); // Set workouts state

            }
        } catch (error) {
            console.error("Error loading booster data:", error);
            setNetworkError(true);
        } finally {
            setIsLoading(false);
        }
    }, [fetchKPIs]);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    useEffect(() => {
        if (location.state?.openModule) {
            setSelectedModule(location.state.openModule);
            // Clear the state to prevent re-opening on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    const handleSelectModule = (moduleKey) => {
        // Analytics
        console.log(`Analytics Event: booster_detail_open, moduleKey: ${moduleKey}`);
        setSelectedModule(moduleKey);
    };

    const handleFeedbackFinish = () => {
        setIsFeedbackModalOpen(false);
        // Reload data to potentially update the user's needs_final_feedback status
        loadInitialData();
    };

    if (isLoading) {
        return <SkeletonGrid />;
    }

    if (networkError) {
        return <NetworkErrorDisplay onRetry={loadInitialData} />;
    }

    if (!user?.booster_unlocked) {
        return <LockedContent />;
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <AnimatePresence mode="wait">
                {selectedModule ? (
                    <ModuleDetailView
                        key="detail"
                        moduleKey={selectedModule}
                        user={user}
                        onBack={() => setSelectedModule(null)}
                        calorieEntries={calorieEntries}
                        onUpdateCalorieEntries={() => CalorieTracking.filter({ user_email: user.email }, "-date").then(setCalorieEntries)}
                        weightEntries={weightEntries}
                        onUpdateWeightEntries={() => WeightEntry.filter({ user_email: user.email }, "-date").then(setWeightEntries)}
                        onBoosterReportGenerated={() => setIsFeedbackModalOpen(true)}
                        onFinalTaskCompleted={() => setIsFeedbackModalOpen(true)}
                        workouts={workouts} // Pass workouts to ModuleDetailView
                    />
                ) : (
                    <motion.div
                        key="grid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <div className="text-center mb-6">
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 via-yellow-500 to-blue-500 bg-clip-text text-transparent">🚀 תוכנית בוסטר</h1>
                            <p className="text-slate-600 mt-2">סקירת ההתקדמות והמשימות שלך</p>
                        </div>

                        {user?.needs_final_feedback && (
                             <Card className="mb-6 bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200">
                                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <Trophy className="w-8 h-8 text-amber-500" />
                                        <div>
                                            <h3 className="font-bold text-lg text-amber-800">כל הכבוד על סיום הבוסטר!</h3>
                                            <p className="text-sm text-amber-700">נשמח לשמוע איך הייתה החוויה שלך. המשוב שלך חשוב לנו מאוד.</p>
                                        </div>
                                    </div>
                                    <Button onClick={() => setIsFeedbackModalOpen(true)} className="bg-amber-500 hover:bg-amber-600 shrink-0">
                                        למילוי משוב סיום
                                    </Button>
                                </CardContent>
                            </Card>
                        )}

                        {cardsData.length > 0 ? (
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {cardsData.map(card => (
                                    <BoosterCard key={card.moduleKey} card={card} onSelect={handleSelectModule} />
                                ))}
                            </div>
                        ) : (
                            <EmptyState />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {user && (
                <BoosterFeedbackModal
                    user={user}
                    isOpen={isFeedbackModalOpen}
                    onFinish={handleFeedbackFinish}
                    onClose={() => setIsFeedbackModalOpen(false)}
                />
            )}
        </div>
    );
}
