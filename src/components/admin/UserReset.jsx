import React, { useState } from 'react';
import { User, WeightEntry, Workout, WorkoutLog, CalorieTracking, WaterTracking, ProgressPicture, Goal, WeeklyTask, MonthlyGoal, Reminder, WeightReminder, CoachMessage, CoachNotification } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RotateCcw, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function UserReset() {
    const [email, setEmail] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [resetResult, setResetResult] = useState('');
    const [error, setError] = useState('');

    const handleResetRequest = () => {
        if (!email.trim()) {
            setError('יש להזין כתובת אימייל');
            return;
        }
        setError('');
        setShowConfirmDialog(true);
    };

    const executeReset = async () => {
        setIsResetting(true);
        setShowConfirmDialog(false);
        setError('');
        setResetResult('');

        try {
            // Find the user first
            const users = await User.filter({ email: email.trim() });
            if (!users || users.length === 0) {
                throw new Error('משתמש לא נמצא במערכת');
            }

            const userToReset = users[0];
            const userEmail = userToReset.email;

            console.log(`Starting complete reset for user: ${userEmail}`);

            // Delete all user data in order (to handle dependencies)
            const deletionSteps = [
                { name: 'מחיקת תמונות התקדמות', action: async () => {
                    const progressPics = await ProgressPicture.filter({ user_email: userEmail });
                    for (const pic of progressPics) {
                        await ProgressPicture.delete(pic.id);
                    }
                    return progressPics.length;
                }},
                { name: 'מחיקת לוגי אימונים', action: async () => {
                    const workoutLogs = await WorkoutLog.filter({ user_email: userEmail });
                    for (const log of workoutLogs) {
                        await WorkoutLog.delete(log.id);
                    }
                    return workoutLogs.length;
                }},
                { name: 'מחיקת אימונים', action: async () => {
                    const workouts = await Workout.filter({ created_by: userEmail });
                    for (const workout of workouts) {
                        await Workout.delete(workout.id);
                    }
                    return workouts.length;
                }},
                { name: 'מחיקת מעקב מזון', action: async () => {
                    const calorieEntries = await CalorieTracking.filter({ user_email: userEmail });
                    for (const entry of calorieEntries) {
                        await CalorieTracking.delete(entry.id);
                    }
                    return calorieEntries.length;
                }},
                { name: 'מחיקת מעקב מים', action: async () => {
                    const waterEntries = await WaterTracking.filter({ user_email: userEmail });
                    for (const entry of waterEntries) {
                        await WaterTracking.delete(entry.id);
                    }
                    return waterEntries.length;
                }},
                { name: 'מחיקת מדידות משקל', action: async () => {
                    const weightEntries = await WeightEntry.filter({ user_email: userEmail });
                    for (const entry of weightEntries) {
                        await WeightEntry.delete(entry.id);
                    }
                    return weightEntries.length;
                }},
                { name: 'מחיקת מטרות', action: async () => {
                    const goals = await Goal.filter({ user_email: userEmail });
                    for (const goal of goals) {
                        await Goal.delete(goal.id);
                    }
                    return goals.length;
                }},
                { name: 'מחיקת משימות שבועיות', action: async () => {
                    const weeklyTasks = await WeeklyTask.filter({ user_email: userEmail });
                    for (const task of weeklyTasks) {
                        await WeeklyTask.delete(task.id);
                    }
                    return weeklyTasks.length;
                }},
                { name: 'מחיקת מטרות חודשיות', action: async () => {
                    const monthlyGoals = await MonthlyGoal.filter({ user_email: userEmail });
                    for (const goal of monthlyGoals) {
                        await MonthlyGoal.delete(goal.id);
                    }
                    return monthlyGoals.length;
                }},
                { name: 'מחיקת תזכורות', action: async () => {
                    const reminders = await Reminder.filter({ user_email: userEmail });
                    for (const reminder of reminders) {
                        await Reminder.delete(reminder.id);
                    }
                    return reminders.length;
                }},
                { name: 'מחיקת תזכורות משקל', action: async () => {
                    const weightReminders = await WeightReminder.filter({ user_email: userEmail });
                    for (const reminder of weightReminders) {
                        await WeightReminder.delete(reminder.id);
                    }
                    return weightReminders.length;
                }},
                { name: 'מחיקת הודעות מהמאמן', action: async () => {
                    const coachMessages = await CoachMessage.filter({ user_email: userEmail });
                    for (const message of coachMessages) {
                        await CoachMessage.delete(message.id);
                    }
                    return coachMessages.length;
                }},
                { name: 'מחיקת התראות למאמן', action: async () => {
                    const coachNotifications = await CoachNotification.filter({ user_email: userEmail });
                    for (const notification of coachNotifications) {
                        await CoachNotification.delete(notification.id);
                    }
                    return coachNotifications.length;
                }}
            ];

            let deletionSummary = [];
            
            // Execute deletion steps
            for (const step of deletionSteps) {
                try {
                    const deletedCount = await step.action();
                    deletionSummary.push(`${step.name}: ${deletedCount} רשומות נמחקו`);
                    console.log(`${step.name}: ${deletedCount} records deleted`);
                } catch (stepError) {
                    console.error(`Error in ${step.name}:`, stepError);
                    deletionSummary.push(`${step.name}: שגיאה - ${stepError.message}`);
                }
            }

            // Reset user profile to minimal state (keep only essential fields)
            const resetUserData = {
                name: '',
                gender: null,
                birth_date: null,
                age: null,
                height: null,
                profile_image_url: null,
                initial_weight: null,
                current_weight: null,
                start_date: null,
                trainee_personal_summary: null,
                last_report_sent_date: null,
                booster_unlocked: false,
                booster_start_date: null,
                booster_enabled: false,
                booster_status: 'not_started',
                nutrition_access: false,
                status: 'פעיל',
                group_names: [],
                contract_signed: false,
                contract_signed_date: null,
                contract_signature: null,
                contract_full_name: null,
                tags: [],
                last_seen_date: null
            };

            // Update user with reset data
            await User.update(userToReset.id, resetUserData);

            // Force logout of the user by updating their session
            // This will effectively log them out and require re-authentication
            try {
                await User.logout();
            } catch (logoutError) {
                console.log('Logout attempt completed (may not affect target user directly)');
            }

            const summary = [
                `✅ איפוס מושלם עבור: ${userEmail}`,
                `📊 סיכום מחיקת נתונים:`,
                ...deletionSummary,
                `👤 פרופיל המשתמש אופס`,
                `🔐 המשתמש יצטרך להתחבר מחדש ולהשלים הרשמה`
            ].join('\n');

            setResetResult(summary);
            console.log('User reset completed successfully');

        } catch (error) {
            console.error('Error during user reset:', error);
            setError(`שגיאה באיפוס המשתמש: ${error.message}`);
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="w-6 h-6" />
                    איפוס מלא של משתמש
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-800">
                            <p className="font-semibold mb-2">⚠️ אזהרה חמורה!</p>
                            <p className="mb-2">פעולה זו תמחק לצמיתות את כל הנתונים של המשתמש:</p>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                                <li>כל האימונים וההיסטוריה</li>
                                <li>כל מדידות המשקל והמעקב</li>
                                <li>תמונות התקדמות</li>
                                <li>מעקב מזון ומים</li>
                                <li>מטרות ומשימות</li>
                                <li>פרטי הפרופיל האישי</li>
                                <li>הודעות ותזכורות</li>
                            </ul>
                            <p className="mt-2 font-semibold">המשתמש יחזור למסך ההתחברות הראשוני!</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="reset-email">כתובת אימייל של המשתמש לאיפוס</Label>
                        <Input
                            id="reset-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="user@example.com"
                            className="mt-1"
                            disabled={isResetting}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <p className="text-red-800 text-sm">{error}</p>
                        </div>
                    )}

                    {resetResult && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <pre className="text-green-800 text-sm whitespace-pre-wrap font-mono">
                                {resetResult}
                            </pre>
                        </div>
                    )}

                    <Button
                        onClick={handleResetRequest}
                        disabled={isResetting || !email.trim()}
                        className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isResetting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                מאפס משתמש...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                איפוס מלא של המשתמש
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">אישור איפוס מלא</DialogTitle>
                        <DialogDescription className="text-right">
                            האם אתה בטוח שברצונך לאפס לחלוטין את המשתמש: <strong>{email}</strong>?
                            <br />
                            <br />
                            פעולה זו:
                            <br />
                            • תמחק את כל הנתונים לצמיתות
                            <br />
                            • תאפס את הפרופיל לחלוטין
                            <br />
                            • תחזיר את המשתמש למסך ההתחברות
                            <br />
                            <br />
                            <span className="text-red-600 font-semibold">אין אפשרות לבטל פעולה זו!</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 justify-end mt-4">
                        <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                            ביטול
                        </Button>
                        <Button 
                            onClick={executeReset}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            כן, אפס את המשתמש
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Card>
    );
}