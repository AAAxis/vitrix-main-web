
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, UserGroup, WeightEntry, WeeklyTask, MonthlyGoal, ProgressPicture, CalorieTracking, WaterTracking, LectureView, CoachMenu, CoachMessage, CoachNotification, Workout, WorkoutLog, ExerciseDefault, Reminder, WeightReminder, GeneratedReport, WeeklyCheckin, NotificationResponse, EventParticipation, Recipe, FavoriteRecipe } from '@/api/entities';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';
import { groupsForStaff } from '@/lib/groupUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Edit, Save, X, User as UserIcon, FileText, Calendar, Trash2, RefreshCw, AlertTriangle, Loader2, UserCog, Check, ChevronsUpDown, UserPlus, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Separator } from '@/components/ui/separator';
import {
    Popover,
    PopoverContent,
} from "@/components/ui/popover"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils";

const getStatusBadge = (status) => {
  // Normalize status value to handle both Hebrew and English
  const normalizedStatus = status?.toLowerCase();

  // Handle active status (various possible values)
  if (normalizedStatus === 'פעיל' || normalizedStatus === 'active' || !status || status === 'null' || normalizedStatus === 'undefined') {
    return (
      <Badge className="bg-green-100 text-green-800 border border-green-200">
        <span className="w-2 h-2 rounded-full bg-green-500 me-2 animate-pulse"></span>
        פעיל
      </Badge>
    );
  }

  // Handle frozen status
  if (normalizedStatus === 'מוקפא' || normalizedStatus === 'frozen' || normalizedStatus === 'on_hold') {
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
        <span className="w-2 h-2 rounded-full bg-yellow-500 me-2"></span>
        מוקפא
      </Badge>
    );
  }

  // Handle inactive status and ended status
  if (normalizedStatus === 'לא פעיל' || normalizedStatus === 'inactive' || normalizedStatus === 'הסתיים' || normalizedStatus === 'ended') {
    return (
      <Badge className="bg-red-100 text-red-800 border border-red-200">
        <span className="w-2 h-2 rounded-full bg-red-500 me-2"></span>
        לא פעיל
      </Badge>
    );
  }

  // Default fallback - show as active if status is unknown
  return (
    <Badge className="bg-green-100 text-green-800 border border-green-200">
      <span className="w-2 h-2 rounded-full bg-green-500 me-2 animate-pulse"></span>
      פעיל
    </Badge>
  );
};

export default function UserSettingsManager({ 
  initialUserEmail, 
  startInEditMode = false, 
}) {
  const { user: currentUser, isSystemAdmin } = useAdminDashboard();
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  // Renamed from selectedGroup to groupFilter for consistency with outline
  const [groupFilter, setGroupFilter] = useState('all'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [editingUser, setEditingUser] = useState(null); // This state also controls the edit dialog's open/close
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Contract viewing state
  const [viewingContract, setViewingContract] = useState(null);
  const [isContractDialogOpen, setIsContractDialogOpen] = useState(false);

  // Dangerous actions state
  const [isDangerousActionDialogOpen, setIsDangerousActionDialogOpen] = useState(false);
  const [dangerousAction, setDangerousAction] = useState(null); // { type: 'reset' or 'delete' or 'finish_subscription', user: User }
  const [confirmationText, setConfirmationText] = useState('');
  const [isPerformingDangerousAction, setIsPerformingDangerousAction] = useState(false);

  // Ref to track the user for whom the initial action was already performed.
  const processedUserEmailRef = useRef(null);

  const [newWeight, setNewWeight] = useState('');

  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [allUsersData, userGroups] = await Promise.all([
        User.listForStaff(currentUser, '-created_date'),
        UserGroup.list()
      ]);
      setUsers(allUsersData);
      setGroups(groupsForStaff(userGroups || [], currentUser, isSystemAdmin));
    } catch (err) {
      console.error("Failed to load users or groups:", err);
      setError("שגיאה בטעינת המשתמשים או הקבוצות.");
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    loadUsers();
  }, [currentUser]);

  // Effect to filter users based on search term and selected group
  // Refactored to use useMemo for better performance for derived state
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchMatch = (user.name || user.full_name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.coach_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      let groupMatch = false;
      if (groupFilter === 'all') {
        groupMatch = true;
      } else if (groupFilter === '__UNASSIGNED__') {
        // A user is 'unassigned' if group_names is null, undefined, or an empty array
        groupMatch = !user.group_names || user.group_names.length === 0;
      } else {
        groupMatch = (Array.isArray(user.group_names) && user.group_names.includes(groupFilter));
      }
      
      return searchMatch && groupMatch;
    });
  }, [users, searchTerm, groupFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, groupFilter]);

  useEffect(() => {
    // Check if we have an instruction to start in edit mode,
    // if the users are loaded,
    // and if we haven't already processed this specific user email.
    if (startInEditMode && initialUserEmail && users.length > 0 && processedUserEmailRef.current !== initialUserEmail) {
      const userToSelect = users.find(u => u.email === initialUserEmail);
      if (userToSelect) {
        handleEditUser(userToSelect);
        // Mark this user as processed to prevent the dialog from re-opening.
        processedUserEmailRef.current = initialUserEmail;
      }
    }
  }, [startInEditMode, initialUserEmail, users]);

  const handleEditUser = (user) => {
    const userToEdit = { ...user };
    // Sync role to is_admin so the checkbox reflects actual admin status (app uses role for access)
    userToEdit.is_admin = userToEdit.role === 'admin' || !!userToEdit.is_admin;
    if (!userToEdit.name && userToEdit.full_name) {
      userToEdit.name = userToEdit.full_name;
    }
    setEditingUser(userToEdit);
    setError('');
    setMessage('');
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setError('');
    setMessage('');
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      const { id, created_date, updated_date, created_by, ...updateData } = editingUser;

      // Ensure status has a default value if not set
      if (!updateData.status) {
        updateData.status = 'פעיל';
      }

      // Ensure group_names is an array, even if it's empty
      if (updateData.group_names && !Array.isArray(updateData.group_names)) {
        updateData.group_names = [updateData.group_names]; // Convert single string to array
      } else if (!updateData.group_names) {
        updateData.group_names = [];
      }

      // Sync role: only system admin can set role; trainer cannot change role or set admin
      if (isSystemAdmin) {
        const chosenRole = updateData.role || editingUser.role;
        if (chosenRole === 'admin' || updateData.is_admin) {
          updateData.role = 'admin';
          updateData.is_admin = true;
        } else if (chosenRole === 'trainer') {
          updateData.role = 'trainer';
          updateData.is_admin = false;
        } else {
          updateData.role = 'trainee';
          updateData.is_admin = false;
        }
      }
      // If not system admin, do not change role or is_admin
      if (!isSystemAdmin) {
        delete updateData.role;
        delete updateData.is_admin;
      }

      const userIdToUpdate = editingUser.uid || editingUser.id;
      if (!userIdToUpdate) {
        setError('לא נמצא מזהה משתמש לעדכון');
        return;
      }
      await User.update(userIdToUpdate, updateData);

      setMessage(updateData.role === 'admin'
        ? 'פרטי המשתמש עודכנו בהצלחה. המשתמש הוגדר כאדמין — יש לבקש ממנו לרענן את הדף (או להתחבר מחדש) כדי לראות את ממשק המנהלים.'
        : 'פרטי המשתמש עודכנו בהצלחה');
      setEditingUser(null); // Close edit mode on success
      loadUsers(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating user:', error);
      setError('שגיאה בעדכון פרטי המשתמש');
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewContract = (user) => {
    setViewingContract(user);
    setIsContractDialogOpen(true);
  };

  const handleDangerousAction = (action, user) => {
    setDangerousAction({ type: action, user });
    setConfirmationText('');
    setError(''); // Clear any previous errors from the dialog
    setIsDangerousActionDialogOpen(true);
  };

  const performResetUser = async (user) => {
    try {
      // Delete all user-related data entities
      const deletePromises = [
        // Weight and measurements history
        WeightEntry.filter({ user_email: user.email }).then(entries =>
          Promise.all(entries.map(entry => WeightEntry.delete(entry.id)))
        ),

        // Weekly tasks and goals
        WeeklyTask.filter({ user_email: user.email }).then(tasks =>
          Promise.all(tasks.map(task => WeeklyTask.delete(task.id)))
        ),

        MonthlyGoal.filter({ user_email: user.email }).then(goals =>
          Promise.all(goals.map(goal => MonthlyGoal.delete(goal.id)))
        ),

        // Progress pictures and visual tracking
        ProgressPicture.filter({ user_email: user.email }).then(pictures =>
          Promise.all(pictures.map(picture => ProgressPicture.delete(picture.id)))
        ),

        // Nutrition tracking
        CalorieTracking.filter({ user_email: user.email }).then(tracking =>
          Promise.all(tracking.map(entry => CalorieTracking.delete(entry.id)))
        ),

        WaterTracking.filter({ user_email: user.email }).then(tracking =>
          Promise.all(tracking.map(entry => WaterTracking.delete(entry.id)))
        ),

        // Coach communication and menus
        CoachMenu.filter({ user_email: user.email }).then(menus =>
          Promise.all(menus.map(menu => CoachMenu.delete(menu.id)))
        ),

        CoachMessage.filter({ user_email: user.email }).then(messages =>
          Promise.all(messages.map(message => CoachMessage.delete(message.id)))
        ),

        CoachNotification.filter({ user_email: user.email }).then(notifications =>
          Promise.all(notifications.map(notification => CoachNotification.delete(notification.id)))
        ),

        // Workout history and logs
        Workout.filter({ created_by: user.email }).then(workouts =>
          Promise.all(workouts.map(workout => Workout.delete(workout.id)))
        ),

        WorkoutLog.filter({ user_email: user.email }).then(logs =>
          Promise.all(logs.map(log => WorkoutLog.delete(log.id)))
        ),

        // Exercise defaults and customizations
        ExerciseDefault.filter({ user_email: user.email }).then(defaults =>
          Promise.all(defaults.map(def => ExerciseDefault.delete(def.id)))
        ),

        // Learning and engagement tracking
        LectureView.filter({ user_email: user.email }).then(views =>
          Promise.all(views.map(view => LectureView.delete(view.id)))
        ),

        // Reminders and notifications
        Reminder.filter({ user_email: user.email }).then(reminders =>
          Promise.all(reminders.map(reminder => Reminder.delete(reminder.id)))
        ),

        WeightReminder.filter({ user_email: user.email }).then(reminders =>
          Promise.all(reminders.map(reminder => WeightReminder.delete(reminder.id)))
        ),

        // Reports and communication responses
        GeneratedReport.filter({ user_email: user.email }).then(reports =>
          Promise.all(reports.map(report => GeneratedReport.delete(report.id)))
        ),

        WeeklyCheckin.filter({ user_email: user.email }).then(checkins =>
          Promise.all(checkins.map(checkin => WeeklyCheckin.delete(checkin.id)))
        ),

        NotificationResponse.filter({ user_email: user.email }).then(responses =>
          Promise.all(responses.map(response => NotificationResponse.delete(response.id)))
        ),

        // Event participation
        EventParticipation.filter({ user_email: user.email }).then(participations =>
          Promise.all(participations.map(participation => EventParticipation.delete(participation.id)))
        ),

        // User-created recipes and favorites
        Recipe.filter({ creator_email: user.email }).then(recipes =>
          Promise.all(recipes.map(recipe => Recipe.delete(recipe.id)))
        ),

        FavoriteRecipe.filter({ user_email: user.email }).then(favorites =>
          Promise.all(favorites.map(favorite => FavoriteRecipe.delete(favorite.id)))
        )
      ];

      // Wait for all deletions to complete
      await Promise.all(deletePromises);

      // Reset user data while preserving personal profile and contract
      const resetUserData = {
        // Reset weight tracking
        current_weight: user.initial_weight, // Reset to initial weight

        // Reset program status
        booster_unlocked: false,
        booster_start_date: null,
        booster_enabled: false,
        booster_status: "not_started",

        // Reset communication tracking
        last_report_sent_date: null,
        last_seen_date: null,

        // Reset tags if any
        tags: [],

        // Keep all personal profile data intact:
        // name, gender, birth_date, height, initial_weight, coach_name, coach_email, coach_phone, start_date
        // contract_signed, contract_signed_date, contract_signature, contract_full_name
        // group_names, nutrition_access, status, language, timezone
        // These will NOT be reset
      };

      // Update user with reset data
      await User.update(user.id, resetUserData);

      return { success: true };
    } catch (error) {
      console.error('Error during user reset:', error);
      throw new Error(`שגיאה באיפוס נתוני המשתמש: ${error.message}`);
    }
  };

  const performDeleteUser = async (user) => {
    try {
      // First perform complete data cleanup (same as reset)
      await performResetUser(user);

      // Then delete the user account itself
      await User.delete(user.id);

      return { success: true };
    } catch (error) {
      console.error('Error during user deletion:', error);
      throw new Error(`שגיאה במחיקת המשתמש: ${error.message}`);
    }
  };

  // NEW: Function to finish user subscription
  const performFinishSubscription = async (user) => {
    try {
      const updateData = {
        group_names: [], // Remove user from all groups
        status: 'הסתיים', // Set status to 'הסתיים' (Ended)
        booster_enabled: false, // Disable booster
        booster_unlocked: false, // Lock booster on subscription termination
        booster_start_date: null,
        booster_status: "not_started",
        nutrition_access: false, // Remove nutrition access
      };
      await User.update(user.id, updateData);
      return { success: true };
    } catch (error) {
      console.error('Error during user subscription termination:', error);
      throw new Error(`שגיאה בסיום המנוי של המשתמש: ${error.message}`);
    }
  };

  const executeDangerousAction = async () => {
    if (!dangerousAction) return;

    const requiredConfirmation = dangerousAction.user.email;
    if (confirmationText !== requiredConfirmation) {
      setError('טקסט האישור שגוי. אנא הקלד את כתובת המייל של המשתמש בדיוק.');
      return;
    }

    setIsPerformingDangerousAction(true);
    setError(''); // Clear previous error messages

    try {
      if (dangerousAction.type === 'reset') {
        await performResetUser(dangerousAction.user);
        setMessage(`המשתמש ${dangerousAction.user.name || dangerousAction.user.full_name} אופס בהצלחה. כל ההיסטוריה והנתונים נמחקו, הפרופיל האישי והחוזה נשמרו.`);
      } else if (dangerousAction.type === 'delete') {
        await performDeleteUser(dangerousAction.user);
        setMessage(`המשתמש ${dangerousAction.user.name || dangerousAction.user.full_name} נמחק לצמיתות מהמערכת.`);
      } else if (dangerousAction.type === 'finish_subscription') { // NEW
        await performFinishSubscription(dangerousAction.user);
        setMessage(`המנוי של ${dangerousAction.user.name || dangerousAction.user.full_name} הסתיים בהצלחה. המשתמש הוסר מקבוצות וסטטוס השתנה ל'הסתיים'.`);
      }

      setIsDangerousActionDialogOpen(false);
      setDangerousAction(null);
      setConfirmationText('');
      loadUsers(); // Reload users list

    } catch (err) {
      setError(err.message);
    } finally {
      setIsPerformingDangerousAction(false);
    }
  };

  const generateContractText = (user) => {
    const gender = user.gender === 'female' ? 'female' : 'male';
    const introText = gender === 'female' ? 'חותמת' : 'חותם';
    const commitmentHeader = gender === 'female' ? 'במהלך הדרך אני מתחייבת:' : 'במהלך הדרך אני מתחייב:';
    const partnerText = gender === 'female' ? 'שותפה' : 'שותף';

    const commitments = [
      'לעשות את המיטב שלי בכל שלב – גם כשזה מאתגר, גם אם לא מושלם.',
      'לשמור על תקשורת פתוחה, מכבדת ואחראית מול המלווה שלי.',
      gender === 'female'
        ? 'להיות כנה בכל אינטראקציה, לשתף כשקשה, ולבקש עזרה כשצריך.'
        : 'להיות כן בכל אינטראקציה, לשתף כשקשה, ולבקש עזרה כשצריך.',
      'לגשת למשימות וליעדים ברצינות, מתוך הבנה שהן חלק בלתי נפרד מההצלחה.',
      'לזכור שהמסע הזה נבנה באהבה ולא בשיפוטיות – כלפי עצמי וכלפי המלווה.',
      'לקבל את עצמי בדרך, עם עליות וירידות, ולהתמיד מתוך חמלה, סבלנות ואמונה.'
    ];

    return {
      introText,
      commitmentHeader,
      partnerText,
      commitments
    };
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            הגדרות משתמשים ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            נהל את פרטי המשתמשים, סטטוסים, הרשאות ופעולות מתקדמות.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute end-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חפש לפי שם, מייל או מאמן..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pe-10"
              />
            </div>
            
            <Select value={groupFilter} onValueChange={setGroupFilter}>
              <SelectTrigger className="w-full md:w-[220px]">
                <SelectValue placeholder="סינון לפי קבוצה" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הקבוצות</SelectItem>
                <SelectItem value="__UNASSIGNED__">לא משויך</SelectItem> {/* Added 'Unassigned' filter option */}
                {groups.map(group => (
                  <SelectItem key={group.id} value={group.name}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md">
              {message}
            </div>
          )}

          <div className="grid gap-4">
            <AnimatePresence>
              {paginatedUsers.map((user) => (
                <motion.div
                  key={user.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="hover:shadow-md transition-shadow muscle-glass border-0">
                    <CardContent className="p-4 flex flex-col md:flex-row justify-between items-start gap-4">
                      {/* User Info and Badges - Improved Layout */}
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                          {/* User Details */}
                          <div className="space-y-1">
                            <p className="font-bold text-lg text-slate-800">{user.name || user.full_name || 'חסר שם'}</p>
                            <p className="text-sm text-slate-600">{user.email}</p>
                            {user.start_date && (
                              <p className="text-xs text-slate-500">
                                <Calendar className="w-3 h-3 inline-block ms-1" />
                                הצטרף ב-{format(new Date(user.start_date), 'dd/MM/yyyy')}
                              </p>
                            )}
                          </div>

                          {/* Coach & Group Details */}
                          <div className="space-y-1">
                            <p className="text-sm">
                              <strong>מאמן:</strong> {user.coach_name || 'לא שויך'}
                            </p>
                            <p className="text-sm text-slate-600">{user.coach_email}</p>
                             <p className="text-sm">
                              <strong>קבוצה:</strong> {user.group_names?.[0] || 'לא משויך'}
                            </p>
                          </div>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80">
                          {getStatusBadge(user.status)}
                          {(user.is_admin || user.role === 'admin' || user.role === 'trainer') && (
                              <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
                                <UserCog className="w-3 h-3 me-1" />
                                {user.role === 'trainer' ? 'מאמן' : 'אדמין'}
                              </Badge>
                          )}
                          <Badge variant={user.contract_signed ? "default" : "outline"} className={user.contract_signed ? "bg-green-100 text-green-800" : ""}>
                            {user.contract_signed ? 'חוזה חתום' : 'חוזה לא חתום'}
                          </Badge>
                          {user.booster_enabled && (
                            <Badge className="bg-purple-100 text-purple-800">
                              בוסטר פעיל
                            </Badge>
                          )}
                          {user.nutrition_access && (
                            <Badge className="bg-orange-100 text-orange-800">
                              גישה לתזונה
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto pt-4 md:pt-0 border-t md:border-0 border-slate-200/80">
                          <Button variant="outline" size="sm" onClick={() => handleEditUser(user)}>
                              <Edit className="w-4 h-4 ms-2" />
                              ערוך
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleViewContract(user)}>
                              <FileText className="w-4 h-4 ms-2" />
                              חוזה
                          </Button>
                          <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-300 hover:bg-yellow-50" onClick={() => handleDangerousAction('reset', user)}>
                              <RefreshCw className="w-4 h-4 ms-2" />
                              איפוס
                          </Button>
                          {/* NEW: Finish Subscription Button */}
                          <Button variant="outline" size="sm" className="text-orange-600 border-orange-300 hover:bg-orange-50" onClick={() => handleDangerousAction('finish_subscription', user)}>
                              <UserX className="w-4 h-4 ms-2" />
                              סיים מנוי
                          </Button>
                          <Button variant="destructive-outline" size="sm" onClick={() => handleDangerousAction('delete', user)}>
                              <Trash2 className="w-4 h-4 ms-2" />
                              מחק
                          </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {filteredUsers.length === 0 && !isLoading && (
            <div className="text-center py-12 text-slate-500">
                <UserIcon className="w-12 h-12 mx-auto mb-4 opacity-30"/>
                <h3 className="text-lg font-semibold">לא נמצאו משתמשים</h3>
                <p>נסה לשנות את החיפוש או הסינון או הוסף משתמשים חדשים.</p>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <Label htmlFor="itemsPerPage" className="text-sm text-slate-600">משתמשים לעמוד:</Label>
                <Select 
                  value={itemsPerPage.toString()} 
                  onValueChange={(value) => {
                    setItemsPerPage(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-600">
                  עמוד {currentPage} מתוך {totalPages} ({filteredUsers.length} משתמשים)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronRight className="w-4 h-4" />
                  קודם
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  הבא
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle>עריכת פרטי משתמש: {editingUser?.name || editingUser?.full_name}</DialogTitle>
          </DialogHeader>
          {editingUser && (
            <ScrollArea className="max-h-[70vh] px-1">
              <div className="space-y-4 p-4">
                <h4 className="font-semibold text-slate-700 mb-2">פרטים אישיים</h4>
                <div>
                  <Label>שם</Label>
                  <Input
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>מין</Label>
                  <Select value={editingUser.gender || ''} onValueChange={(value) => setEditingUser({ ...editingUser, gender: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר מין" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">זכר</SelectItem>
                      <SelectItem value="female">נקבה</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>תאריך לידה</Label>
                  <Input
                    type="date"
                    value={editingUser.birth_date || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, birth_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>גובה (ס״מ)</Label>
                  <Input
                    type="number"
                    value={editingUser.height ? Math.round(editingUser.height * 100) : ''}
                    onChange={(e) => setEditingUser({ ...editingUser, height: parseFloat(e.target.value) / 100 })}
                    placeholder="170"
                  />
                </div>
                <div>
                  <Label>משקל התחלתי (ק״ג)</Label>
                  <Input
                    type="number"
                    value={editingUser.initial_weight || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, initial_weight: parseFloat(e.target.value) })}
                    placeholder="70"
                  />
                </div>

                <Separator className="my-4"/>
                <h4 className="font-semibold text-slate-700 mb-2">הגדרות חשבון וקבוצה</h4>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>סטטוס משתמש</Label>
                      <Select
                        value={editingUser.status || 'פעיל'}
                        onValueChange={(value) => setEditingUser({ ...editingUser, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="בחר סטטוס" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="פעיל">פעיל</SelectItem>
                          <SelectItem value="לא פעיל">לא פעיל</SelectItem>
                          <SelectItem value="מוקפא">מוקפא</SelectItem>
                          <SelectItem value="הסתיים">הסתיים</SelectItem> {/* Added 'הסתיים' status */}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                        <Label>שיוך לקבוצה</Label>
                        <Select
                          value={editingUser.group_names?.[0] || ''}
                          onValueChange={(value) => setEditingUser({ ...editingUser, group_names: value ? [value] : [] })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="בחר קבוצה" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={null}>ללא קבוצה</SelectItem> {/* Changed value to empty string for 'no group' */}
                            {groups.map(group => (
                                <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                </div>

                <Separator className="my-4"/>
                <h4 className="font-semibold text-slate-700 mb-2">פרטי המאמן</h4>
                <div>
                  <Label>שם המאמן</Label>
                  <Input
                    value={editingUser.coach_name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, coach_name: e.target.value })}
                    placeholder="שם הממאמן המלווה"
                  />
                </div>
                <div>
                  <Label>מייל המאמן</Label>
                  <Input
                    type="email"
                    value={editingUser.coach_email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, coach_email: e.target.value })}
                    placeholder="coach@example.com"
                  />
                </div>
                <div>
                  <Label>טלפון המאמן</Label>
                  <Input
                    value={editingUser.coach_phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, coach_phone: e.target.value })}
                    placeholder="050-1234567"
                  />
                </div>

                <Separator className="my-4"/>
                <h4 className="font-semibold text-slate-700 mb-2">הרשאות מיוחדות</h4>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      id="booster_enabled"
                      checked={editingUser.booster_enabled || false}
                      onChange={(e) => setEditingUser({ ...editingUser, booster_enabled: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="booster_enabled">הפעל תוכנית בוסטר</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      id="nutrition_access"
                      checked={editingUser.nutrition_access || false}
                      onChange={(e) => setEditingUser({ ...editingUser, nutrition_access: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="nutrition_access">גישה לתפריט תזונה</Label>
                  </div>
                  {isSystemAdmin && (
                  <div className="flex flex-col gap-2">
                    <Label>תפקיד</Label>
                    <Select
                      value={editingUser.role === 'admin' ? 'admin' : (editingUser.role || 'trainee')}
                      onValueChange={(v) => {
                        setEditingUser({ ...editingUser, role: v, is_admin: v === 'admin' });
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="בחר תפקיד" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="trainee">מתאמן</SelectItem>
                        <SelectItem value="trainer">מאמן</SelectItem>
                        <SelectItem value="admin">אדמין</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  )}
                  {isSystemAdmin && (
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      id="is_admin"
                      checked={editingUser.is_admin || false}
                      onChange={(e) => setEditingUser({ ...editingUser, is_admin: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <Label htmlFor="is_admin">הגדר כאדמין</Label>
                  </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelEdit}>
              ביטול
            </Button>
            <Button onClick={handleSaveUser} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Save className="w-4 h-4 ms-2" />}
              שמור שינויים
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dangerous Actions Confirmation Dialog */}
      <Dialog open={isDangerousActionDialogOpen} onOpenChange={setIsDangerousActionDialogOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {dangerousAction?.type === 'reset' ? 'איפוס מלא של המשתמש' :
               dangerousAction?.type === 'delete' ? 'מחיקת משתמש לצמיתות' :
               'סיום מנוי למשתמש'} {/* Updated Title */}
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              {dangerousAction?.type === 'reset' ? (
                <>
                  <strong>פעולה זו תמחק את כל ההיסטוריה של המשתמש:</strong>
                  <ul className="mt-2 text-xs space-y-1 list-disc list-inside">
                    <li>כל מדידות המשקל וההיקפים</li>
                    <li>כל האימונים והתרגילים שבוצעו</li>
                    <li>מעקב קלוריות ושתיית מים</li>
                    <li>תמונות התקדמות</li>
                    <li>משימות שבועיות ויעדים</li>
                    <li>דוחות ובדיקות</li>
                    <li>תגובות לאירועים והתראות</li>
                    <li>איפוס תוכנית הבוסטר</li>
                  </ul>
                  <p className="mt-2 font-semibold text-green-700">
                    ✅ יישמרו: פרטים אישיים וחוזה
                  </p>
                </>
              ) : dangerousAction?.type === 'delete' ? (
                <>
                  <strong className="text-red-600">פעולה זו תמחק את המשתמש לצמיתות!</strong>
                  <p className="mt-2">כל הנתונים של המשתמש יימחקו ולא ניתן יהיה לשחזר אותם.</p>
                </>
              ) : ( // NEW: finish_subscription description
                <>
                  <strong className="text-orange-600">פעולה זו תסיים את מנוי המשתמש!</strong>
                  <p className="mt-2">המשתמש יוסר מכל הקבוצות, גישה לתוכנית בוסטר ולתזונה תופסק, וסטטוס המנוי שלו ישתנה ל'הסתיים'.</p>
                  <p className="mt-2 text-sm text-slate-500">
                    <AlertTriangle className="w-4 h-4 inline-block ms-1 text-orange-500" />
                    פעולה זו אינה מוחקת נתוני אימון או מעקב קודמים. לאיפוס מלא של כל הנתונים, השתמשו באפשרות 'איפוס'.
                  </p>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {dangerousAction && (
            <div className="space-y-4 py-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="font-semibold text-red-800">
                  {dangerousAction.user.name || dangerousAction.user.full_name || 'חסר שם'}
                </p>
                <p className="text-sm text-red-600">{dangerousAction.user.email}</p>
              </div>

              <div>
                <Label className="text-sm">
                  להמשך, הקלד את כתובת המייל של המשתמש:
                </Label>
                <Input
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder={dangerousAction.user.email}
                  className="mt-2"
                />
              </div>

              {error && (
                <div className="p-2 bg-red-100 border border-red-200 text-red-700 text-sm rounded">
                  {error}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDangerousActionDialogOpen(false);
                setDangerousAction(null);
                setConfirmationText('');
                setError(''); // Clear error on close
              }}
              disabled={isPerformingDangerousAction}
            >
              ביטול
            </Button>
            <Button
              variant={dangerousAction?.type === 'finish_subscription' ? 'warning' : 'destructive'} // Specific variant for 'finish_subscription'
              onClick={executeDangerousAction}
              disabled={isPerformingDangerousAction || confirmationText !== dangerousAction?.user.email}
            >
              {isPerformingDangerousAction ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ms-2" />
                  {dangerousAction?.type === 'reset' ? 'מבצע איפוס...' :
                   dangerousAction?.type === 'delete' ? 'מוחק...' :
                   'מסיים מנוי...'} {/* Updated Button text */}
                </>
              ) : (
                <>
                  {dangerousAction?.type === 'reset' && <RefreshCw className="w-4 h-4 ms-2" />}
                  {dangerousAction?.type === 'delete' && <Trash2 className="w-4 h-4 ms-2" />}
                  {dangerousAction?.type === 'finish_subscription' && <UserX className="w-4 h-4 ms-2" />} {/* Icon for 'finish_subscription' */}
                  {dangerousAction?.type === 'reset' ? 'בצע איפוס מלא' :
                   dangerousAction?.type === 'delete' ? 'מחק לצמיתות' :
                   'סיים מנוי'} {/* Updated Button text */}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contract Viewing Dialog */}
      <Dialog open={isContractDialogOpen} onOpenChange={setIsContractDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              חוזה אישי - {viewingContract?.name || viewingContract?.full_name}
            </DialogTitle>
            {viewingContract && (
              <div className="flex flex-wrap gap-2 mt-2">
                {viewingContract.contract_signed ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Calendar className="w-3 h-3 me-1" />
                    נחתם ב-{viewingContract.contract_signed_date ? format(new Date(viewingContract.contract_signed_date), 'dd/MM/yyyy HH:mm', { locale: he }) : 'תאריך לא ידוע'}
                  </Badge>
                ) : (
                  <Badge variant="destructive">חוזה לא נחתם</Badge>
                )}
              </div>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-4">
            {viewingContract && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-[#7F9253] mb-4">
                    תזונה בראש - התחייבות אישית להשגת המטרות
                  </h2>
                </div>

                <div className="bg-slate-50 p-6 rounded-lg border">
                  {(() => {
                    const contractData = generateContractText(viewingContract);
                    return (
                      <>
                        <p className="text-lg mb-6 font-medium text-center">
                          <strong>{contractData.introText}</strong> בזאת על מחויבות עמוקה לתהליך הליווי<br/>
                          עבור עצמי, בריאותי, וצמיחתי האישית.
                        </p>

                        <div className="mb-6">
                          <p className="text-lg font-semibold mb-4">{contractData.commitmentHeader}</p>
                          <div className="space-y-3 text-base">
                            {contractData.commitments.map((commitment, index) => (
                              <p key={index} className="flex items-start gap-2">
                                <span className="text-green-600 font-bold">✅</span>
                                <span>{commitment}</span>
                              </p>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4 text-base">
                          <p className="flex items-start gap-2">
                            <span className="text-yellow-500 font-bold">🔸</span>
                            <span><strong>אני מבין/ה שההצלחה האמיתית אינה בתוצאה בלבד.</strong><br/>
                            אלא בהתמדה, כנות ונכונות להשתנות.</span>
                          </p>
                          <p className="flex items-start gap-2">
                            <span className="text-orange-500 font-bold">🤝</span>
                            <span><strong>המלווה שלי כאן כדי להדריך, לכוון, וללוות</strong><br/>
                            ואני כאאן כדי להיות <strong>{contractData.partnerText}</strong> אמיתי/ת לתהליך.</span>
                          </p>
                        </div>

                        {viewingContract.contract_signed && (
                          <div className="mt-8 p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                            <h3 className="font-semibold text-green-800 mb-2">פרטי החתימה:</h3>
                            <div className="space-y-2 text-sm text-green-700">
                              <p><strong>שם מלא:</strong> {viewingContract.contract_full_name}</p>
                              <p><strong>תאריך חתימה:</strong> {viewingContract.contract_signed_date ? format(new Date(viewingContract.contract_signed_date), 'dd/MM/yyyy HH:mm', { locale: he }) : 'לא זמין'}</p>
                            </div>
                            {(viewingContract.contract_signature || viewingContract.contract_signature_url) && (
                              <div className="mt-4">
                                <p className="text-sm font-semibold text-green-800 mb-2">חתימה דיגיטלית:</p>
                                <div className="bg-white p-4 border border-green-300 rounded inline-block">
                                  <img
                                    src={viewingContract.contract_signature_url || viewingContract.contract_signature}
                                    alt="חתימה דיגיטלית"
                                    className="max-h-32 border border-slate-200 rounded object-contain"
                                    onError={(e) => {
                                      console.error('Error loading signature image:', e);
                                      e.target.style.display = 'none';
                                      const errorDiv = document.createElement('div');
                                      errorDiv.className = 'text-red-500 text-sm p-2';
                                      errorDiv.textContent = 'שגיאה בטעינת החתימה';
                                      e.target.parentElement?.appendChild(errorDiv);
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsContractDialogOpen(false)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
