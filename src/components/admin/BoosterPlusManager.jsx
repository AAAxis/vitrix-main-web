
import React, { useState, useEffect, useMemo } from 'react';
import { User, BoosterPlusTask, BoosterPlusTaskTemplate } from '@/api/entities';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from "@/components/ui/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import BoosterPlusTemplateManager from './BoosterPlusTemplateManager';
import { Loader2, Rocket, Send, Search, XCircle, Trash2, CheckSquare, Square } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO, startOfWeek, endOfWeek, addWeeks } from 'date-fns';

export default function BoosterPlusManager() {
    const { user: currentUser } = useAdminDashboard();
    const { toast } = useToast();
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isActivating, setIsActivating] = useState(false);
    const [isDeactivating, setIsDeactivating] = useState(false);
    const [isAssigningTasks, setIsAssigningTasks] = useState(false);
    const [isDeletingTasks, setIsDeletingTasks] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [availableWeeks, setAvailableWeeks] = useState([]);
    const [selectedWeeks, setSelectedWeeks] = useState([]);
    const [isLoadingWeeks, setIsLoadingWeeks] = useState(false);

    useEffect(() => {
        const loadUsers = async () => {
            setIsLoadingUsers(true);
            try {
                // Load all users (not just active ones) to include trainers/admins
                const allUsers = await User.listForStaff(currentUser);
                // Filter out admins/coaches/trainers from the list (only show trainees)
                const trainees = allUsers.filter(u => u.role !== 'admin' && u.role !== 'coach' && u.role !== 'trainer');
                setUsers(trainees);
            } catch (error) {
                console.error("Error loading users:", error);
                toast({
                    title: "שגיאה",
                    description: "טעינת המשתמשים נכשלה.",
                    variant: "destructive",
                });
            } finally {
                setIsLoadingUsers(false);
            }
        };
        loadUsers();
    }, [toast]);

    useEffect(() => {
        const loadAvailableWeeks = async () => {
            setIsLoadingWeeks(true);
            try {
                const templates = await BoosterPlusTaskTemplate.list('week');
                const weeks = templates.map(t => t.week).sort((a, b) => a - b);
                setAvailableWeeks(weeks);
                // Select all weeks by default
                setSelectedWeeks(weeks);
            } catch (error) {
                console.error("Error loading weeks:", error);
                toast({
                    title: "שגיאה",
                    description: "טעינת השבועות הזמינים נכשלה.",
                    variant: "destructive",
                });
            } finally {
                setIsLoadingWeeks(false);
            }
        };
        loadAvailableWeeks();
    }, [toast]);

    const handleActivateBoosterPlus = async () => {
        if (!selectedUser) {
            toast({ title: "שגיאה", description: "יש לבחור מתאמן.", variant: "destructive" });
            return;
        }
        setIsActivating(true);
        try {
            const userToUpdate = users.find(u => u.email === selectedUser);
            if (!userToUpdate) throw new Error("User not found");

            await User.update(userToUpdate.id, {
                booster_plus_enabled: true,
                booster_plus_start_date: new Date().toISOString(),
            });

            toast({
                title: "הצלחה",
                description: `בוסטר פלוס הופעל עבור ${userToUpdate.name}.`,
            });

            const updatedUsers = users.map(u => u.id === userToUpdate.id ? { ...u, booster_plus_enabled: true } : u);
            setUsers(updatedUsers);

        } catch (error) {
            console.error("Error activating booster plus:", error);
            toast({
                title: "שגיאה",
                description: "הפעלת בוסטר פלוס נכשלה.",
                variant: "destructive",
            });
        } finally {
            setIsActivating(false);
        }
    };

    const handleDeactivateBoosterPlus = async () => {
        if (!selectedUser) {
            toast({ title: "שגיאה", description: "יש לבחור מתאמן.", variant: "destructive" });
            return;
        }
        setIsDeactivating(true);
        try {
            const userToUpdate = users.find(u => u.email === selectedUser);
            if (!userToUpdate) throw new Error("User not found");

            await User.update(userToUpdate.id, {
                booster_plus_enabled: false,
            });

            toast({
                title: "הצלחה",
                description: `תוכנית בוסטר פלוס הסתיימה עבור ${userToUpdate.name}.`,
            });

            const updatedUsers = users.map(u => u.id === userToUpdate.id ? { ...u, booster_plus_enabled: false } : u);
            setUsers(updatedUsers);

        } catch (error) {
            console.error("Error deactivating booster plus:", error);
            toast({
                title: "שגיאה",
                description: "סיום תוכנית בוסטר פלוס נכשל.",
                variant: "destructive",
            });
        } finally {
            setIsDeactivating(false);
        }
    };

    const handleAssignTasks = async () => {
        if (!selectedUser) {
            toast({ title: "שגיאה", description: "יש לבחור מתאמן.", variant: "destructive" });
            return;
        }
        setIsAssigningTasks(true);
        try {
            const userToUpdate = users.find(u => u.email === selectedUser);
            if (!userToUpdate) throw new Error("User not found");

            const existingTasks = await BoosterPlusTask.filter({ user_email: userToUpdate.email });
            if (existingTasks.length > 0) {
                toast({
                    title: "פעולה נכשלה",
                    description: "למתאמן זה כבר הוקצו משימות בוסטר פלוס. יש למחוק אותן תחילה לפני הקצאה חדשה.",
                    variant: "destructive",
                });
                setIsAssigningTasks(false);
                return;
            }

            if (selectedWeeks.length === 0) {
                toast({
                    title: "שגיאה",
                    description: "יש לבחור לפחות שבוע אחד להקצאה.",
                    variant: "destructive",
                });
                setIsAssigningTasks(false);
                return;
            }

            const templates = await BoosterPlusTaskTemplate.list('week');
            if(templates.length === 0) {
                 throw new Error("לא נמצאו תבניות משימה עבור בוסטר פלוס.");
            }

            // Filter templates to only include selected weeks
            const selectedTemplates = templates.filter(t => selectedWeeks.includes(t.week));
            if (selectedTemplates.length === 0) {
                throw new Error("לא נמצאו תבניות עבור השבועות שנבחרו.");
            }

            const assignmentStartDate = startOfWeek(new Date(startDate), { weekStartsOn: 0 }); // Sunday as start of week
            const tasksToCreate = selectedTemplates.map(template => {
                const weekStartDate = addWeeks(assignmentStartDate, template.week - 1);
                const weekEndDate = endOfWeek(weekStartDate, { weekStartsOn: 0 });
                return {
                    user_email: userToUpdate.email,
                    week: template.week,
                    title: template.title,
                    details: template.details,
                    insight: template.insight,
                    week_start_date: format(weekStartDate, 'yyyy-MM-dd'),
                    week_end_date: format(weekEndDate, 'yyyy-MM-dd'),
                    status: 'לא בוצע',
                };
            });

            await BoosterPlusTask.bulkCreate(tasksToCreate);

            toast({
                title: "הצלחה",
                description: `${tasksToCreate.length} משימות בוסטר פלוס הוקצו עבור ${userToUpdate.name}.`,
            });

        } catch (error) {
            console.error("Error assigning tasks:", error);
            toast({
                title: "שגיאה",
                description: `הקצאת המשימות נכשלה: ${error.message}`,
                variant: "destructive",
            });
        } finally {
            setIsAssigningTasks(false);
        }
    };

    const handleDeleteTasks = async () => {
        if (!selectedUser) {
            toast({ title: "שגיאה", description: "יש לבחור מתאמן.", variant: "destructive" });
            return;
        }
        setIsDeletingTasks(true);
        try {
            const tasksToDelete = await BoosterPlusTask.filter({ user_email: selectedUser });
            
            if (tasksToDelete.length === 0) {
                toast({
                    title: "מידע",
                    description: "למתאמן זה אין משימות בוסטר פלוס למחיקה.",
                });
                setIsDeletingTasks(false);
                return;
            }

            for (const task of tasksToDelete) {
                await BoosterPlusTask.delete(task.id);
            }

            toast({
                title: "הצלחה",
                description: `נמחקו ${tasksToDelete.length} משימות עבור המתאמן.`,
            });

        } catch (error) {
            console.error("Error deleting tasks:", error);
            toast({
                title: "שגיאה",
                description: "מחיקת המשימות נכשלה.",
                variant: "destructive",
            });
        } finally {
            setIsDeletingTasks(false);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) {
            // If no search query, show all users
            return users;
        }
        const query = searchQuery.toLowerCase().trim();
        return users.filter(user => {
            const name = (user.name || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            return name.includes(query) || email.includes(query);
        });
    }, [users, searchQuery]);

    return (
        <div className="space-y-6" dir="rtl">
            <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                <h3 className="font-semibold text-slate-800">הפעלת תוכנית בוסטר פלוס</h3>
                <div className="space-y-2">
                    <Label htmlFor="user-search">חיפוש מתאמן</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <Input
                            id="user-search"
                            placeholder="חפש לפי שם או אימייל..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="user-select">בחירת מתאמן</Label>
                    <Select value={selectedUser} onValueChange={setSelectedUser} disabled={isLoadingUsers}>
                        <SelectTrigger id="user-select">
                            <SelectValue placeholder={isLoadingUsers ? "טוען מתאמנים..." : "בחר מתאמן..."} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]">
                            {isLoadingUsers ? (
                                <SelectItem value="loading" disabled>טוען מתאמנים...</SelectItem>
                            ) : filteredUsers.length > 0 ? (
                                filteredUsers.map(u => (
                                    <SelectItem key={u.id} value={u.email}>
                                        {u.name || 'ללא שם'} ({u.email}) {u.booster_plus_enabled ? '🚀' : ''}
                                    </SelectItem>
                                ))
                            ) : searchQuery.trim() ? (
                                <SelectItem value="no-results" disabled>לא נמצאו מתאמנים התואמים לחיפוש "{searchQuery}"</SelectItem>
                            ) : (
                                <SelectItem value="no-results" disabled>לא נמצאו מתאמנים</SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleActivateBoosterPlus} disabled={isActivating || isDeactivating || !selectedUser || isDeletingTasks}>
                        {isActivating ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Rocket className="w-4 h-4 ml-2" />}
                        הפעל בוסטר פלוס
                    </Button>
                    <Button onClick={handleDeactivateBoosterPlus} disabled={isActivating || isDeactivating || !selectedUser || isDeletingTasks} variant="destructive">
                        {isDeactivating ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <XCircle className="w-4 h-4 ml-2" />}
                        סיום התוכנית
                    </Button>
                </div>
            </div>
            
            <div className="p-4 border rounded-lg bg-slate-50 space-y-4">
                <h3 className="font-semibold text-slate-800">הקצאת משימות בוסטר פלוס</h3>
                <div className="space-y-2">
                    <Label htmlFor="start-date">תאריך התחלת משימות</Label>
                    <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label>שבועות להקצאה</Label>
                    {isLoadingWeeks ? (
                        <div className="text-sm text-slate-500">טוען שבועות...</div>
                    ) : availableWeeks.length > 0 ? (
                        <div className="border rounded-lg p-4 bg-white max-h-64 overflow-y-auto">
                            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (selectedWeeks.length === availableWeeks.length) {
                                            setSelectedWeeks([]);
                                        } else {
                                            setSelectedWeeks([...availableWeeks]);
                                        }
                                    }}
                                    className="h-8 text-xs"
                                >
                                    {selectedWeeks.length === availableWeeks.length ? (
                                        <>
                                            <Square className="w-4 h-4 ml-1" />
                                            בטל בחירת הכל
                                        </>
                                    ) : (
                                        <>
                                            <CheckSquare className="w-4 h-4 ml-1" />
                                            בחר הכל
                                        </>
                                    )}
                                </Button>
                                <span className="text-sm text-slate-600">
                                    נבחרו {selectedWeeks.length} מתוך {availableWeeks.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {availableWeeks.map(week => {
                                    const isChecked = selectedWeeks.includes(week);
                                    return (
                                        <label
                                            key={week}
                                            htmlFor={`week-${week}`}
                                            className={`flex items-center gap-2 p-2 border-2 cursor-pointer transition-all`}
                                            style={{
                                                borderRadius: '8px',
                                                ...(isChecked 
                                                    ? { backgroundColor: '#eff6ff', borderColor: '#3b82f6', color: '#1e40af' }
                                                    : { backgroundColor: '#ffffff', borderColor: '#e2e8f0' }
                                                )
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isChecked) {
                                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                                    e.currentTarget.style.backgroundColor = '#f8fafc';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isChecked) {
                                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                                }
                                            }}
                                        >
                                            <Checkbox
                                                id={`week-${week}`}
                                                checked={isChecked}
                                                onCheckedChange={(checked) => {
                                                    if (checked === true) {
                                                        setSelectedWeeks(prev => {
                                                            if (!prev.includes(week)) {
                                                                return [...prev, week].sort((a, b) => a - b);
                                                            }
                                                            return prev;
                                                        });
                                                    } else {
                                                        setSelectedWeeks(prev => prev.filter(w => w !== week));
                                                    }
                                                }}
                                                className="cursor-pointer"
                                            />
                                            <span className="text-sm font-medium select-none">
                                                שבוע {week}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-500">לא נמצאו שבועות זמינים. יש ליצור תבניות משימות תחילה.</div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button 
                        onClick={handleAssignTasks} 
                        disabled={isAssigningTasks || !selectedUser || isDeletingTasks || selectedWeeks.length === 0}
                    >
                        {isAssigningTasks ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
                        הקצה {selectedWeeks.length} משימות
                    </Button>
                    <Button onClick={() => setIsDeleteDialogOpen(true)} disabled={isDeletingTasks || !selectedUser || isAssigningTasks} variant="destructive">
                        {isDeletingTasks ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Trash2 className="w-4 h-4 ml-2" />}
                        מחק משימות
                    </Button>
                </div>
            </div>

            <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                    <AccordionTrigger>
                        <h3 className="text-lg font-semibold text-slate-700">ניהול תבניות - בוסטר פלוס</h3>
                    </AccordionTrigger>
                    <AccordionContent>
                       <BoosterPlusTemplateManager />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent dir="rtl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>אישור מחיקת משימות</AlertDialogTitle>
                        <AlertDialogDescription>
                            האם אתה בטוח שברצונך למחוק את כל משימות "בוסטר פלוס" עבור המתאמן הנבחר? לא ניתן לשחזר פעולה זו.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                handleDeleteTasks();
                                setIsDeleteDialogOpen(false);
                            }}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            אישור ומחיקה
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
