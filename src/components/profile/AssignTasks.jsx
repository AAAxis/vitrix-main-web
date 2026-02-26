import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeeklyTask, User, UserGroup } from '@/api/entities';
import { Loader2, Lock, User as UserIcon, Users, Calendar as CalendarIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { addDays, format } from "date-fns";
import { he } from 'date-fns/locale';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const tasksData = [
    {
        "week": 1,
        "title": "מיישרים קו עם הצלחת",
        "mission_text": "לצלם כל ארוחה לפי 3 החוקים: חוק החלבון, חוק הצלחת, חוק השאריות.",
        "tip_text": "צילום יומי של הארוחות מגביר מודעות ובחירה, בלי שיפוטיות מיותרת.",
        "booster_text": "כשרואים מה אוכלים – מבינים מה באמת צריך"
    },
    {
        "week": 2,
        "title": "הגוף דורש מים",
        "mission_text": "לשתות 2–3 ליטר מים ביום.",
        "tip_text": "להפעיל תזכורת כל שעתיים. מים תומכים בשובע, חילוף חומרים וניקוי הגוף – ומקדמים ירידה במשקל.",
        "booster_text": "מים הם הכלי הפשוט ביותר – והעוצמתי ביותר – לתנועה קדימה"
    },
    {
        "week": 3,
        "title": "לזהות את הפיתוי ולבחור אחרת",
        "mission_text": "כל יום לזהות פיתוי אחד ולרשום: מה עורר אותו? איך אפשר להתמודד איתו אחרת?",
        "tip_text": "פיתוי הוא לא בהכרח רעב – הוא הזדמנות לבחירה.",
        "booster_text": "הפיתוי לא שולט – הבחירה שלך היא זו שקובעת"
    },
    {
        "week": 4,
        "title": "לבחור בעצמך גם מחוץ לאוכל",
        "mission_text": "לתכנן השבוע לפחות 3 רגעים שמיועדים רק לך – בלי קשר לאוכל או ספורט. (למשל: מסאז׳, מקלחת שקטה, ציור, הליכה לבד, פסק זמן מהטלפון).",
        "tip_text": "זמן איכות אישי בונה ערך פנימי – ומקטין תלות בחיזוקים חיצוניים.",
        "booster_text": "ההקשבה הפנימית שלך שווה יותר מכל תגובה חיצונית"
    },
    {
        "week": 5,
        "title": "לפעול קודם, להרגיש אחר כך",
        "mission_text": "לרשום בכל בוקר 3 פעולות קטנות שיקדמו אותך – ולבצע לפחות שתיים מהן.",
        "tip_text": "מוטיבציה לא מובילה לתוצאות – תוצאות מביאות מוטיבציה.",
        "booster_text": "לא מחכים להרגיש מוכנים – בונים מוכנות דרך עשייה"
    },
    {
        "week": 6,
        "title": "ידע הוא כוח, תרתי משמע",
        "mission_text": "להוסיף עוד אימון כוח השבוע ולנסות לעלות עומס – אפילו בקילוגרם אחד.",
        "tip_text": "שריר שורף יותר שומן גם במנוחה. אימוני כוח תומכים בירידה שקטה ויציבה. שריר זה לא גודל – זה חוסן מטבולי.",
        "booster_text": "הגוף שלך לא רק משתנה – הוא נבנה מחדש, חזק מבפנים"
    },
    {
        "week": 7,
        "title": "להוריד סטרס, להעלות תוצאה",
        "mission_text": "כל יום – 5 דקות של נשימה מודעת או מדיטציה מודרכת.",
        "tip_text": "סטרס מעכב ירידה במשקל. רוגע הוא חלק בלתי נפרד מהתהליך.",
        "booster_text": "כשהנפש משתחררת – גם הגוף מאפשר"
    },
    {
        "week": 8,
        "title": "שינוי מתחיל בבחירה אחת",
        "mission_text": "לזהות דפוס אוטומטי אחד בכל יום – ולבחור תגובה חדשה.",
        "tip_text": "כל תגובה חדשה יוצרת חיווט מוחי שונה – זהו שינוי עמוק באמת.",
        "booster_text": "לא משחזרים את הישן – יוצרים מציאות חדשה"
    },
    {
        "week": 9,
        "title": "לפעול כמו מי שכבר הצליח/ה",
        "mission_text": "בכל יום, בחר/י פעולה אחת שמתאימה לגרסה של עצמך שכבר הצליחה. (למשל: לדחות פיתוי בלי אשמה, לבחור תנועה מתוך ערך, להופיע אחרת מול מראה).",
        "tip_text": "ההתנהגות שלך מקדימה את התחושה – היא זו שבונה את הזהות.",
        "booster_text": "כשאת/ה מתנהג/ת כמו מי שאת/ה רוצה להיות – הגוף והלב עוקבים אחריך"
    },
    {
        "week": 10,
        "title": "לשנות את הדיבור הפנימי",
        "mission_text": "לכתוב כל בוקר משפט מחזק אחד, ולהחליף את שומר המסך למשפט הזה.",
        "tip_text": "השפה הפנימית היא הדלק של התודעה – תבחר/י אותה בחכמה.",
        "booster_text": "תדבר/י לעצמך כמו שאתה/את רוצה להרגיש"
    },
    {
        "week": 11,
        "title": "החלקים מתחברים",
        "mission_text": "כל ערב לסכם: מה עבד היום? מה למדתי השבוע על עצמי?",
        "tip_text": "עצירה לרגע של הכרה = תחושת הישג אמיתית.",
        "booster_text": "תסתכל/י אחורה – רק כדי להבין כמה התקדם/ת"
    },
    {
        "week": 12,
        "title": "הזהות החדשה יוצאת לאור",
        "mission_text": "לכתוב מכתב לעצמך מהעתיד – איך את/ה חי/ה, מרגיש/ה ומתנהל/ת.",
        "tip_text": "הזהות החדשה שלך לא באה מבחוץ – היא נבנתה צעד־צעד, מתוך בחירה.",
        "booster_text": "זאת לא גרסה חדשה – זאת הגרסה האמיתית שלך, שנולדה מתוך עשייה"
    }
];

const COACH_PIN = "2206"; // Secret PIN for coach access

export default function AssignTasks() {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('info'); // info, success, error
    const [showPinInput, setShowPinInput] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [allGroups, setAllGroups] = useState([]); // New state for groups
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null); // New state for selected group
    const [assignMode, setAssignMode] = useState('individual'); // individual or group
    const [programStartDate, setProgramStartDate] = useState(new Date());

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch both users and groups
                const [users, groups] = await Promise.all([User.list(), UserGroup.list()]);
                setAllUsers(users);
                setAllGroups(groups);
            } catch (error) {
                console.error("Failed to fetch data:", error);
                setMessage('שגיאה בטעינת רשימות מתאמנים וקבוצות.');
                setMessageType('error');
            }
        };
        fetchData();
    }, []);

    const handleUserSelect = (userId) => {
        const user = allUsers.find(u => u.id === userId);
        setSelectedUser(user);
        setSelectedGroup(null); // Clear selected group when a user is selected
        setMessage(''); // Clear any previous messages when a new user is selected
        setPinError(''); // Clear pin error as well
        setShowPinInput(false); // Hide PIN input if a new user is selected
        setPin(''); // Clear PIN
    };

    const handleGroupSelect = (groupId) => {
        const group = allGroups.find(g => g.id === groupId);
        setSelectedGroup(group);
        setSelectedUser(null); // Clear selected user when a group is selected
        setMessage(''); // Clear any previous messages when a new group is selected
        setPinError(''); // Clear pin error as well
        setShowPinInput(false); // Hide PIN input if a new group is selected
        setPin(''); // Clear PIN
    };

    const calculateWeekDates = (startDate, weekNumber) => {
        // Week 1 starts on the program start date itself
        const weekStartDate = addDays(startDate, (weekNumber - 1) * 7);
        // Week ends 6 days after it starts
        const weekEndDate = addDays(weekStartDate, 6);

        return {
            start: format(weekStartDate, 'yyyy-MM-dd'),
            end: format(weekEndDate, 'yyyy-MM-dd')
        };
    };

    const activateForUser = async (user, startDate) => {
        // Data Integrity Fix: Validate user before proceeding
        if (!user || !user.email) {
            throw new Error('משתמש לא תקין - חסר כתובת אימייל');
        }

        const programStartDate = startDate;

        try {
            // Unlock the booster program and set the dynamic start date for the selected user
            await User.update(user.id, {
                booster_unlocked: true,
                booster_start_date: format(programStartDate, 'yyyy-MM-dd')
            });

            // Check if tasks already exist for the selected user
            const existingTasks = await WeeklyTask.filter({ user_email: user.email });
            if (existingTasks.length > 0) {
                return `תוכנית הבוסטר כבר הופעלה עבור ${user.name || user.email}. כל הלשוניות פתוחות.`;
            }

            // Create all 12 weekly tasks with calculated date ranges based on today's date
            const tasksToCreate = tasksData.map(task => {
                const weekDates = calculateWeekDates(programStartDate, task.week);

                // Data Integrity Fix: Always include user_email
                return {
                    user_email: user.email, // Critical: Always include user_email
                    week: task.week,
                    title: task.title,
                    mission_text: task.mission_text,
                    tip_text: task.tip_text,
                    booster_text: task.booster_text,
                    week_start_date: weekDates.start,
                    week_end_date: weekDates.end,
                    status: "לא בוצע"
                };
            });

            // Silent Error Fix: Handle bulk creation with proper error handling
            try {
                await WeeklyTask.bulkCreate(tasksToCreate);
            } catch (bulkError) {
                console.warn('bulkCreate failed, falling back to individual task creation:', bulkError);
                // If bulkCreate fails, create tasks one by one
                for (const taskData of tasksToCreate) {
                    // Data Integrity Fix: Validate each task has user_email before creating
                    if (!taskData.user_email) {
                        console.error('Skipping task creation - missing user_email:', taskData);
                        continue;
                    }
                    await WeeklyTask.create(taskData);
                }
            }
            
            return `תוכנית הבוסטר הופעלה בהצלחה עבור ${user.name || user.email}!`;
            
        } catch (error) {
            console.error(`Failed to activate booster for user ${user.email}:`, error);
            throw new Error(`שגיאה בהפעלת התוכנית עבור ${user.name || user.email}: ${error.message}`);
        }
    };

    const handleActivateProgram = async () => {
        // Data Integrity Fix: Validate inputs before proceeding
        if (assignMode === 'individual' && !selectedUser) {
            setMessage('יש לבחור מתאמן תחילה.');
            setMessageType('error');
            return;
        }
        if (assignMode === 'group' && !selectedGroup) {
            setMessage('יש לבחור קבוצה תחילה.');
            setMessageType('error');
            return;
        }

        if (pin !== COACH_PIN) {
            setPinError('קוד שגוי. אנא הזן את הקוד הנכון.');
            return;
        }

        setIsLoading(true);
        setMessage('');
        setPinError('');

        try {
            if (assignMode === 'individual') {
                // Data Integrity Fix: Validate user has email before processing
                if (!selectedUser.email) {
                    throw new Error('המתאמן הנבחר חסר כתובת אימייל');
                }
                
                const resultMessage = await activateForUser(selectedUser, programStartDate);
                setMessage(resultMessage);
                setMessageType(resultMessage.includes('בהצלחה') ? 'success' : resultMessage.includes('כבר הופעלה') ? 'info' : 'error');
                
            } else if (assignMode === 'group') {
                const usersInGroup = allUsers.filter(u => u.group_name === selectedGroup.name);
                if (usersInGroup.length === 0) {
                    setMessage(`אין מתאמנים בקבוצת "${selectedGroup.name}".`);
                    setMessageType('info');
                } else {
                    // Data Integrity Fix: Filter out users without email before processing
                    const validUsers = usersInGroup.filter(user => user.email);
                    const invalidUsers = usersInGroup.filter(user => !user.email);
                    
                    if (invalidUsers.length > 0) {
                        console.warn(`Found ${invalidUsers.length} users without email in group ${selectedGroup.name}:`, invalidUsers);
                    }
                    
                    if (validUsers.length === 0) {
                        setMessage(`לא נמצאו מתאמנים תקינים (עם אימייל) בקבוצת "${selectedGroup.name}".`);
                        setMessageType('error');
                        return;
                    }
                    
                    // Silent Error Fix: Handle individual user activation with proper error handling
                    const activationResults = await Promise.allSettled(
                        validUsers.map(user => activateForUser(user, programStartDate))
                    );
                    
                    const successfulActivations = activationResults.filter(result => 
                        result.status === 'fulfilled' && result.value.includes('בהצלחה')
                    ).length;
                    
                    const alreadyActivated = activationResults.filter(result => 
                        result.status === 'fulfilled' && result.value.includes('כבר הופעלה')
                    ).length;
                    
                    const failedActivations = activationResults.filter(result => 
                        result.status === 'rejected'
                    ).length;

                    if (successfulActivations === validUsers.length) {
                        setMessage(`תוכנית הבוסטר הופעלה בהצלחה עבור כל ${validUsers.length} חברי קבוצת "${selectedGroup.name}"!`);
                        setMessageType('success');
                    } else if (alreadyActivated === validUsers.length) {
                        setMessage(`תוכנית הבוסטר כבר הופעלה עבור כל ${validUsers.length} חברי קבוצת "${selectedGroup.name}".`);
                        setMessageType('info');
                    } else if (successfulActivations + alreadyActivated === validUsers.length) {
                        setMessage(`התוכנית הופעלה עבור ${successfulActivations} מתאמנים, ו ${alreadyActivated} מתאמנים כבר הופעלו בקבוצת "${selectedGroup.name}".`);
                        setMessageType('success');
                    } else {
                        setMessage(`הופעלה בהצלחה עבור ${successfulActivations} מתאמנים בקבוצת "${selectedGroup.name}". ${failedActivations > 0 ? `שגיאה ב- ${failedActivations} מתאמנים.` : ''}`);
                        setMessageType(failedActivations > 0 ? 'error' : 'success');
                    }
                }
            }
            setShowPinInput(false);
            setPin('');

        } catch (error) {
            console.error('Error activating booster program:', error);
            // Silent Error Fix: Clear error messages for users
            setMessage(`אירעה שגיאה בהפעלת התוכנית: ${error.message}`);
            setMessageType('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePinSubmit = (e) => {
        e.preventDefault();
        handleActivateProgram();
    };

    return (
        <div className="space-y-4">
            <RadioGroup
                value={assignMode}
                onValueChange={(value) => {
                    setAssignMode(value);
                    setSelectedUser(null); // Clear selected user/group when mode changes
                    setSelectedGroup(null);
                    setMessage('');
                    setPinError('');
                    setShowPinInput(false);
                    setPin('');
                }}
                className="flex gap-4"
            >
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="individual" id="assign-individual" disabled={isLoading} />
                    <Label htmlFor="assign-individual">למתאמן יחיד</Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="group" id="assign-group" disabled={isLoading} />
                    <Label htmlFor="assign-group">לקבוצה</Label>
                </div>
            </RadioGroup>

            {assignMode === 'individual' ? (
                <div className="space-y-2">
                    <Label htmlFor="user-select">בחר מתאמן להפעלה</Label>
                    <Select onValueChange={handleUserSelect} disabled={showPinInput || isLoading}>
                        <SelectTrigger id="user-select">
                            <SelectValue placeholder="בחר מתאמן..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allUsers.length === 0 && !isLoading ? (
                                <AlertDescription className="p-4 text-sm text-center text-gray-500">
                                    לא נמצאו מתאמנים.
                                </AlertDescription>
                            ) : (
                                allUsers.map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name || user.email}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
            ) : (
                <div className="space-y-2">
                    <Label htmlFor="group-select">בחר קבוצה להפעלה</Label>
                    <Select onValueChange={handleGroupSelect} disabled={showPinInput || isLoading}>
                        <SelectTrigger id="group-select">
                            <SelectValue placeholder="בחר קבוצה..." />
                        </SelectTrigger>
                        <SelectContent>
                            {allGroups.length === 0 && !isLoading ? (
                                <AlertDescription className="p-4 text-sm text-center text-gray-500">
                                    לא נמצאו קבוצות.
                                </AlertDescription>
                            ) : (
                                allGroups.map(group => (
                                    <SelectItem key={group.id} value={group.id}>
                                        {group.name}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {!showPinInput ? (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                        {assignMode === 'individual' ? (
                            <UserIcon className="w-6 h-6 text-purple-600" />
                        ) : (
                            <Users className="w-6 h-6 text-purple-600" />
                        )}
                        <div>
                            <h3 className="font-semibold text-slate-800">הפעלת תוכנית הבוסטר ל{assignMode === 'individual' ? 'מתאמן' : 'קבוצה'}</h3>
                            <p className="text-sm text-slate-600">
                                פותח את כלל אפשרויות המעקב באפליקציה עבור ה{assignMode === 'individual' ? 'מתאמן הנבחר' : 'קבוצה הנבחרת'}. דרוש קוד הפעלה.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="start-date">בחר תאריך התחלה לתוכנית</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="start-date"
                                    variant={"outline"}
                                    className={`w-full justify-start text-left font-normal ${!programStartDate && "text-muted-foreground"}`}
                                    disabled={isLoading}
                                >
                                    <CalendarIcon className="ms-2 h-4 w-4" />
                                    {programStartDate ? format(programStartDate, "PPP", { locale: he }) : <span>בחר תאריך</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={programStartDate}
                                    onSelect={(date) => setProgramStartDate(date || new Date())}
                                    disabled={isLoading}
                                    initialFocus
                                    locale={he}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        onClick={() => setShowPinInput(true)}
                        disabled={isLoading || (assignMode === 'individual' && !selectedUser) || (assignMode === 'group' && !selectedGroup)}
                        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Lock className="w-4 h-4" />
                        )}
                        הפעל תוכנית
                    </Button>
                </div>
            ) : (
                <Card className="border-purple-200 bg-purple-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-purple-800">
                            <Lock className="w-5 h-5" />
                            אישור הפעלה עבור: {assignMode === 'individual' ? (selectedUser?.name || selectedUser?.email || 'מתאמן לא נבחר') : (`קבוצת "${selectedGroup?.name || 'קבוצה לא נבחרה'}"`)}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePinSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="pin">קוד הפעלה (4 ספרות)</Label>
                                <Input
                                    id="pin"
                                    type="password"
                                    maxLength={4}
                                    value={pin}
                                    onChange={(e) => {
                                        setPin(e.target.value);
                                        setPinError('');
                                    }}
                                    placeholder="הזן קוד של 4 ספרות"
                                    className="text-center text-lg font-mono"
                                    disabled={isLoading}
                                />
                                {pinError && (
                                    <p className="text-sm text-red-600">{pinError}</p>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    type="submit"
                                    disabled={pin.length !== 4 || isLoading}
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin me-2" />
                                    ) : null}
                                    הפעל
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setShowPinInput(false);
                                        setPin('');
                                        setPinError('');
                                    }}
                                    disabled={isLoading}
                                >
                                    ביטול
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {message && (
                <Alert className={messageType === 'success' ? 'border-green-500 bg-green-50' :
                               messageType === 'error' ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-blue-50'}>
                    <AlertTitle className={messageType === 'success' ? 'text-green-800' :
                                         messageType === 'error' ? 'text-red-800' : 'text-blue-800'}>
                        {messageType === 'success' ? 'הצלחה!' :
                         messageType === 'error' ? 'שגיאה' : 'מידע'}
                    </AlertTitle>
                    <AlertDescription className={messageType === 'success' ? 'text-green-700' :
                                                messageType === 'error' ? 'text-red-700' : 'text-blue-700'}>
                        {message}
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}