
import React, { useState, useEffect } from 'react';
import { User, WeeklyTask, MonthlyGoal, ProgressPicture, CalorieTracking, UserGroup, WaterTracking, LectureView, WeeklyTaskTemplate } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ShieldCheck, UserMinus, AlertTriangle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from "@/components/ui/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import WeeklyTaskTemplateManager from './WeeklyTaskTemplateManager';

const BOOSTER_ACTIVATION_CODE = "2206";
const BOOSTER_RESET_CODE = "1010";

export default function BoosterProgramManager() {
    const { toast } = useToast();
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [targetType, setTargetType] = useState('user'); // 'user' or 'group'
    const [selectedUser, setSelectedUser] = useState(''); // For the old activation/reset
    const [selectedGroup, setSelectedGroup] = useState(''); // For the old activation/reset
    const [activationCode, setActivationCode] = useState(''); // For the old activation/reset
    const [resetCode, setResetCode] = useState(''); // For the old activation/reset
    const [feedback, setFeedback] = useState({ type: '', message: '' });
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setIsLoadingUsers(true);
            try {
                const [allUsers, allGroups] = await Promise.all([User.filter({}), UserGroup.list()]);
                setUsers(allUsers);
                setGroups(allGroups);
            } catch (error) {
                console.error('Error loading data:', error);
                showFeedback('error', 'שגיאה בטעינת הנתונים');
                toast({ title: "שגיאה", description: "אירעה שגיאה בטעינת המשתמשים והקבוצות.", variant: "destructive" });
            } finally {
                setIsLoadingUsers(false);
            }
        };
        loadData();
    }, [toast]);

    const showFeedback = (type, message) => {
        setFeedback({ type, message });
        setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
    };

    const getTargetUsers = () => {
        if (targetType === 'user' && selectedUser) {
            return users.filter(u => u.email === selectedUser);
        }
        if (targetType === 'group' && selectedGroup) {
            return users.filter(u => u.group_names?.includes(selectedGroup));
        }
        return [];
    };

    // Existing Booster Activation/Deactivation with codes
    const handleBoosterActivation = async (enable) => {
        if (activationCode !== BOOSTER_ACTIVATION_CODE) {
            showFeedback('error', 'קוד הפעלה שגוי.');
            return;
        }
        
        const targetUsers = getTargetUsers();
        if (targetUsers.length === 0) {
            showFeedback('error', 'יש לבחור מתאמן או קבוצה.');
            return;
        }
        
        try {
            for (const user of targetUsers) {
                await User.update(user.id, { booster_unlocked: enable });
            }
            showFeedback('success', `תוכנית הבוסטר ${enable ? 'הופעלה' : 'כובתה'} בהצלחה עבור ${targetUsers.length} מתאמנים.`);
            setActivationCode('');
        } catch (error) {
            showFeedback('error', 'שגיאה בעדכון סטטוס הבוסטר.');
            console.error(error);
        }
    };
    
    const handleResetBoosterData = async () => {
        if (resetCode !== BOOSTER_RESET_CODE) {
            showFeedback('error', 'קוד איפוס שגוי.');
            return;
        }

        const targetUsers = getTargetUsers();
        if (targetUsers.length === 0) {
            showFeedback('error', 'יש לבחור מתאמן או קבוצה.');
            return;
        }
        
        if (!window.confirm(`האם אתה בטוח שברצונך לאפס את כל נתוני הבוסטר עבור ${targetUsers.length} מתאמנים? פעולה זו תמחק את כל הנתונים הקשורים לתוכנית הבוסטר ואינה הפיכה.`)) {
            return;
        }
        
        try {
            for (const user of targetUsers) {
                // Reset all booster-related entities
                const entitiesToDelete = [
                    WeeklyTask, 
                    MonthlyGoal, 
                    ProgressPicture, 
                    CalorieTracking, 
                    WaterTracking
                ];
                
                for (const entity of entitiesToDelete) {
                    const records = await entity.filter({ user_email: user.email });
                    for (const record of records) {
                        await entity.delete(record.id);
                    }
                }

                // Also clear lecture views related to booster content
                const lectureViews = await LectureView.filter({ user_email: user.email });
                for (const view of lectureViews) {
                    await LectureView.delete(view.id);
                }

                // Reset booster-related user fields
                await User.update(user.id, {
                    booster_status: 'not_started',
                    booster_start_date: null,
                    booster_unlocked: false // Changed booster_enabled to booster_unlocked for consistency
                });
            }
            showFeedback('success', 'כל נתוני הבוסטר אופסו בהצלחה.');
            setResetCode('');
            // Reload users to update UI after changes
            const allUsers = await User.filter({});
            setUsers(allUsers);
        } catch (error) {
            showFeedback('error', 'שגיאה באיפוס נתוני הבוסטר.');
            console.error(error);
        }
    };

    const handleRemoveTrainee = async () => {
        const targetUsers = getTargetUsers();
        if (targetUsers.length === 0) {
            showFeedback('error', 'יש לבחור מתאמן להסרה.');
            return;
        }

        const userNames = targetUsers.map(u => u.name).join(', ');
        if (!window.confirm(`האם אתה בטוח שברצונך להסיר את המתאמנים הבאים מהמערכת לחלוטין?\n\n${userNames}\n\nפעולה זו תמחק את כל הנתונים שלהם ואינה הפיכה!`)) {
            return;
        }

        try {
            for (const user of targetUsers) {
                // Delete all user-related data first
                const entitiesToDelete = [
                    WeeklyTask, 
                    MonthlyGoal, 
                    ProgressPicture, 
                    CalorieTracking, 
                    WaterTracking,
                    LectureView // Also delete lecture views associated with the user
                ];
                for (const entity of entitiesToDelete) {
                    const records = await entity.filter({ user_email: user.email });
                    for (const record of records) {
                        await entity.delete(record.id);
                    }
                }
                
                // Finally delete the user
                await User.delete(user.id);
            }
            
            showFeedback('success', `${targetUsers.length} מתאמנים הוסרו מהמערכת בהצלחה.`);
            
            // Reload users list
            const allUsers = await User.filter({});
            setUsers(allUsers);
            setSelectedUser('');
            setSelectedGroup('');
        } catch (error) {
            showFeedback('error', 'שגיאה בהסרת המתאמנים.');
            console.error(error);
        }
    };

    const handleAssignTasks = async () => {
        // This function is designed to assign tasks to a *single selected user*
        // based on the `selectedUser` state and the check in the provided outline.
        if (!selectedUser) {
            showFeedback('error', 'יש לבחור מתאמן תחילה.');
            return;
        }

        try {
            const userToUpdate = users.find(u => u.email === selectedUser);
            if (!userToUpdate) {
                showFeedback('error', "המתאמן לא נמצא.");
                return;
            }

            const existingTasks = await WeeklyTask.filter({ user_email: userToUpdate.email });
            if (existingTasks.length > 0) {
                showFeedback('error', "למתאמן זה כבר הוקצו משימות בוסטר. יש למחוק אותן תחילה לפני הקצאה חדשה.");
                return;
            }

            // The outline provided stops here. To make it functional, we need to actually assign tasks.
            // We'll fetch templates and assign the first one found, if any.
            const templates = await WeeklyTaskTemplate.list('week'); // Assuming 'week' is a valid scope or parameter for list.
            if (templates.length === 0) {
                showFeedback('error', "לא נמצאו תבניות משימות שבועיות זמינות להקצאה.");
                return;
            }

            // For simplicity, assign tasks from the first template found.
            // In a real application, you might have a UI to select a specific template.
            const templateToAssign = templates[0];

            if (!templateToAssign.tasks || templateToAssign.tasks.length === 0) {
                showFeedback('error', `התבנית "${templateToAssign.name}" ריקה ממשימות.`);
                return;
            }

            // Create new WeeklyTask entries for the selected user
            // This is a basic calculation for the current week number. Adjust as per booster program's logic.
            const boosterStartDate = userToUpdate.booster_start_date ? new Date(userToUpdate.booster_start_date) : new Date();
            const oneWeek = 7 * 24 * 60 * 60 * 1000; // milliseconds in a week
            const currentWeekNumber = Math.floor((new Date().getTime() - boosterStartDate.getTime()) / oneWeek) + 1;


            for (const taskItem of templateToAssign.tasks) {
                await WeeklyTask.create({
                    user_email: userToUpdate.email,
                    week_number: currentWeekNumber, // Assign to calculated current week
                    title: taskItem.title,
                    description: taskItem.description || '',
                    is_completed: false,
                    day_of_week: taskItem.day_of_week, // Assuming template tasks include this
                    // Add any other relevant fields that need to be populated from the template
                    // e.g., booster_level: templateToAssign.booster_level
                });
            }

            showFeedback('success', `משימות בוסטר שבועיות הוקצו בהצלחה למתאמן ${userToUpdate.name}.`);
        } catch (error) {
            showFeedback('error', 'שגיאה בהקצאת משימות בוסטר שבועיות.');
            console.error('Error assigning weekly tasks:', error);
        }
    };


    return (
        <div className="space-y-6">
            {feedback.message && (
                <div className={`p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {feedback.message}
                </div>
            )}

            <Accordion type="multiple" collapsible className="w-full space-y-4">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <h3 className="text-lg font-semibold text-slate-700">ניהול תבניות משימות בוסטר</h3>
                    </AccordionTrigger>
                    <AccordionContent>
                       <WeeklyTaskTemplateManager />
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                     <AccordionTrigger>
                        <h3 className="text-lg font-semibold text-slate-700">ניהול מתקדם ובקרת נתונים</h3>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="space-y-6 pt-4">
                             {/* Target Selection */}
                            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                                <h4 className="font-semibold text-slate-700">בחירת יעד</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label>סוג יעד</Label>
                                        <Select value={targetType} onValueChange={setTargetType}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="user">מתאמן ספציפי</SelectItem>
                                                <SelectItem value="group">קבוצה שלמה</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <Label>בחר {targetType === 'user' ? 'מתאמן' : 'קבוצה'}</Label>
                                        {targetType === 'user' ? (
                                            <Select value={selectedUser} onValueChange={setSelectedUser} disabled={isLoadingUsers}>
                                                <SelectTrigger><SelectValue placeholder={isLoadingUsers ? "טוען..." : "בחר מתאמן..."} /></SelectTrigger>
                                                <SelectContent>
                                                    {users.map(u => <SelectItem key={u.id} value={u.email}>{u.name} ({u.email})</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Select value={selectedGroup} onValueChange={setSelectedGroup} disabled={isLoadingUsers}>
                                                <SelectTrigger><SelectValue placeholder={isLoadingUsers ? "טוען..." : "בחר קבוצה..."} /></SelectTrigger>
                                                <SelectContent>
                                                    {groups.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Booster Activation (with code) */}
                            <div className="space-y-4 p-4 border rounded-lg">
                                <h4 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-green-600"/>הפעלה / כיבוי תוכנית הבוסטר (קוד)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="activation-code">קוד הפעלה נדרש</Label>
                                        <Input id="activation-code" type="password" placeholder="הכנס קוד הפעלה" value={activationCode} onChange={e => setActivationCode(e.target.value)} />
                                    </div>
                                    <div className="flex items-end gap-2">
                                        <Button onClick={() => handleBoosterActivation(true)} className="bg-green-600 hover:bg-green-700">הפעל תוכנית</Button>
                                        <Button variant="outline" onClick={() => handleBoosterActivation(false)} className="border-red-300 text-red-700 hover:bg-red-50">כבה תוכנית</Button>
                                    </div>
                                </div>
                            </div>

                            <Separator />
                            
                            {/* New section for assigning weekly tasks */}
                            <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
                                <h4 className="font-semibold flex items-center gap-2 text-blue-700"><ShieldCheck className="w-5 h-5"/>הקצאת משימות בוסטר שבועיות</h4>
                                <p className="text-blue-600 text-sm">
                                    הקצה סט של משימות בוסטר שבועיות למתאמן הנבחר. המערכת תבצע בדיקה למניעת כפילויות.
                                </p>
                                <Button onClick={handleAssignTasks} className="bg-blue-600 hover:bg-blue-700" disabled={targetType !== 'user' || !selectedUser}>
                                    הקצה משימות שבועיות למתאמן
                                </Button>
                            </div>

                            <Separator />

                            {/* Complete Data Reset */}
                            <div className="space-y-4 p-4 border border-orange-300 bg-orange-50 rounded-lg">
                                <h4 className="font-semibold flex items-center gap-2 text-orange-700"><Trash2 className="w-5 h-5"/>איפוס מלא של נתוני בוסטר</h4>
                                <p className="text-orange-600 text-sm">
                                    זהירות: פעולה זו תמחק את כל נתוני הבוסטר (משימות שבועיות, מטרות חודשיות, תמונות התקדמות, מעקב קלוריות, מעקב מים, צפיות בהרצאות) עבור היעד הנבחר.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="reset-code">קוד איפוס מלא</Label>
                                        <Input id="reset-code" type="password" placeholder="הכנס קוד איפוס" value={resetCode} onChange={e => setResetCode(e.target.value)} />
                                    </div>
                                    <div className="flex items-end">
                                        <Button variant="destructive" onClick={handleResetBoosterData} className="flex items-center gap-2">
                                            <Trash2 className="w-4 h-4" />
                                            מחק את כל הנתונים
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Remove Trainee */}
                            <div className="space-y-4 p-4 border border-red-300 bg-red-50 rounded-lg">
                                <h4 className="font-semibold flex items-center gap-2 text-red-700"><UserMinus className="w-5 h-5"/>הסרת מתאמן מהמערכת</h4>
                                <div className="flex items-center gap-2 text-red-600">
                                    <AlertTriangle className="w-5 h-5" />
                                    <p className="text-sm">פעולה זו תמחק את המתאמן וכל הנתונים שלו מהמערכת לצמיתות!</p>
                                </div>
                                <Button variant="destructive" onClick={handleRemoveTrainee} className="flex items-center gap-2">
                                    <UserMinus className="w-4 h-4" />
                                    הסר מתאמן מהמערכת
                                </Button>
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}
