
import React, { useState, useEffect } from 'react';
import { User, BoosterPlusTask, BoosterPlusTaskTemplate } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useToast } from "@/components/ui/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import BoosterPlusTemplateManager from './BoosterPlusTemplateManager';
import { Loader2, Rocket, Send, Search, XCircle, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format, parseISO, startOfWeek, endOfWeek, addWeeks } from 'date-fns';

export default function BoosterPlusManager() {
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

    useEffect(() => {
        const loadUsers = async () => {
            setIsLoadingUsers(true);
            try {
                const allUsers = await User.filter({ status: "פעיל" });
                setUsers(allUsers);
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

            const templates = await BoosterPlusTaskTemplate.list('week');
            if(templates.length === 0) {
                 throw new Error("לא נמצאו תבניות משימה עבור בוסטר פלוס.");
            }

            const assignmentStartDate = startOfWeek(new Date(startDate), { weekStartsOn: 0 }); // Sunday as start of week
            const tasksToCreate = templates.map(template => {
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

    const filteredUsers = users.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                        <SelectContent>
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map(u => (
                                    <SelectItem key={u.id} value={u.email}>
                                        {u.name} ({u.email}) {u.booster_plus_enabled ? '🚀' : ''}
                                    </SelectItem>
                                ))
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
                <div className="flex flex-wrap gap-2">
                    <Button onClick={handleAssignTasks} disabled={isAssigningTasks || !selectedUser || isDeletingTasks}>
                        {isAssigningTasks ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Send className="w-4 h-4 ml-2" />}
                        הקצה 36 משימות
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
