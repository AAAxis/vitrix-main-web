
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, CoachMenu } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UploadFile } from '@/api/integrations';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast'; // Assuming useToast is available here
import {
    Upload,
    FileText,
    Trash2,
    Eye,
    User as UserIcon,
    Calendar,
    CheckCircle,
    AlertCircle,
    Loader2,
    Download,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    Plus,
    Edit3,
    Image as ImageIcon,
    ZoomIn,
    ZoomOut,
    RotateCcw,
    Target // Added for calorie target feature
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/components/utils/timeUtils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function MenuManagement() {
    const [users, setUsers] = useState([]); // This state will now hold only complete users
    const [menus, setMenus] = useState([]);
    const [usersWithMenus, setUsersWithMenus] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true); // NEW: Separate loading state for users
    const [isLoadingMenus, setIsLoadingMenus] = useState(true); // Renamed from original `isLoading` to represent menu loading
    const [isUploading, setIsUploading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [instructions, setInstructions] = useState('');
    const [feedbackMessage, setFeedbackMessage] = useState({ type: '', text: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [viewingMenu, setViewingMenu] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [expandedUsers, setExpandedUsers] = useState(new Set());
    const fileInputRef = useRef(null);
    const [zoomedImage, setZoomedImage] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(1);

    // Refs and state for panning
    const zoomContainerRef = useRef(null);
    const [isPanning, setIsPanning] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [startScroll, setStartScroll] = useState({ left: 0, top: 0 });

    // State for calorie target feature
    const [showCalorieDialog, setShowCalorieDialog] = useState(false);
    const [calorieTargetUser, setCalorieTargetUser] = useState(null);
    const [calorieTarget, setCalorieTarget] = useState('');

    const { toast } = useToast(); // NEW: Hook for toast notifications

    // NEW useEffect to load and filter complete users
    useEffect(() => {
        const fetchAndSetCompleteUsers = async () => {
            setIsLoadingUsers(true);
            try {
                // Fetch users with role 'user'
                const allUsers = await User.filter({ role: 'user' });
                // Filter out users who haven't completed their profile yet (e.g., missing name or gender)
                const completeUsers = allUsers.filter(u => u.name && u.gender);
                setUsers(completeUsers.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
            } catch (error) {
                console.error('Error loading users:', error);
                toast({ title: "שגיאה", description: "לא ניתן היה לטעון את רשימת המשתמשים.", variant: "destructive" });
            } finally {
                setIsLoadingUsers(false);
            }
        };
        fetchAndSetCompleteUsers();
    }, [toast]);

    // Modified loadData to only fetch menus and combine with the already loaded 'complete' users
    const loadData = useCallback(async () => {
        // Ensure users are loaded before attempting to load menus and combine
        if (isLoadingUsers) return;

        setIsLoadingMenus(true); // Indicate that menus are loading
        try {
            const allMenus = await CoachMenu.list('-upload_date');
            setMenus(allMenus);

            // Create user-menu mapping
            const userMenuMap = new Map();
            allMenus.forEach(menu => {
                userMenuMap.set(menu.user_email, menu);
            });

            // Combine menus with the *already filtered and sorted complete users*
            const usersWithMenuData = users.map(user => ({
                ...user,
                menu: userMenuMap.get(user.email) || null
            }));

            setUsersWithMenus(usersWithMenuData);
        } catch (error) {
            console.error("Error loading data:", error);
            showFeedback('error', 'שגיאה בטעינת הנתונים');
        } finally {
            setIsLoadingMenus(false);
        }
    }, [users, isLoadingUsers]); // Depend on 'users' and 'isLoadingUsers' to trigger when users are ready

    // This useEffect will now trigger `loadData` once users have finished loading
    useEffect(() => {
        if (!isLoadingUsers) {
            loadData();
        }
    }, [isLoadingUsers, loadData]); // Depend on isLoadingUsers and loadData

    const showFeedback = (type, text) => {
        setFeedbackMessage({ type, text });
        setTimeout(() => setFeedbackMessage({ type: '', text: '' }), 5000);
    };

    const toggleUserExpansion = (userId) => {
        const newExpanded = new Set(expandedUsers);
        if (newExpanded.has(userId)) {
            newExpanded.delete(userId);
        } else {
            newExpanded.add(userId);
        }
        setExpandedUsers(newExpanded);
    };

    const handleFileUpload = async (event, targetUser = null) => {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
        if (!allowedTypes.includes(file.type)) {
            showFeedback('error', 'סוג קובץ לא נתמך. אנא העלה תמונה (JPG, PNG) או PDF בלבד.');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showFeedback('error', 'קובץ גדול מדי. גודל מקסימלי: 10MB');
            return;
        }

        setIsUploading(true);
        try {
            const response = await UploadFile({ file });

            if (targetUser) {
                // Direct upload for specific user
                await saveMenu(targetUser.email, response.file_url, '');
            } else {
                // Upload for dialog
                setUploadedFile(response.file_url);
                showFeedback('success', 'קובץ הועלה בהצלחה');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            showFeedback('error', 'שגיאה בהעלאת הקובץ');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const saveMenu = async (userEmail, fileUrl, instructionsText) => {
        try {
            const existingMenu = menus.find(m => m.user_email === userEmail);

            if (existingMenu) {
                await CoachMenu.update(existingMenu.id, {
                    menu_file_url: fileUrl,
                    instructions: instructionsText,
                    upload_date: new Date().toISOString().split('T')[0],
                    viewed_by_trainee: false
                });
                showFeedback('success', 'התפריט עודכן בהצלחה');
            } else {
                await CoachMenu.create({
                    user_email: userEmail,
                    menu_file_url: fileUrl,
                    instructions: instructionsText,
                    upload_date: new Date().toISOString().split('T')[0],
                    viewed_by_trainee: false
                });
                showFeedback('success', 'התפריט נשמר בהצלחה');
            }

            await loadData();
        } catch (error) {
            console.error('Error saving menu:', error);
            showFeedback('error', 'שגיאה בשמירת התפריט');
        }
    };

    const handleSaveMenu = async () => {
        if (!selectedUser || !uploadedFile) {
            showFeedback('error', 'יש לבחור מתאמן ולהעלות קובץ');
            return;
        }

        await saveMenu(selectedUser, uploadedFile, instructions);

        // Reset form
        setSelectedUser('');
        setUploadedFile(null);
        setInstructions('');
        setIsDialogOpen(false);
    };

    const handleDeleteMenu = async (menuId, userName) => {
        if (window.confirm(`האם אתה בטוח שברצונך למחוק את התפריט של ${userName}? פעולה זו לא ניתנת לביטול.`)) {
            setDeletingId(menuId);
            try {
                await CoachMenu.delete(menuId);
                showFeedback('success', 'התפריט נמחק בהצלחה');
                await loadData();

                if (viewingMenu && viewingMenu.id === menuId) {
                    setViewingMenu(null); // Close view dialog if the deleted menu was being viewed
                }
            } catch (error) {
                console.error('Error deleting menu:', error);
                showFeedback('error', 'שגיאה במחיקת התפריט');
            } finally {
                setDeletingId(null);
            }
        }
    };

    const handleViewMenu = (menu) => {
        setViewingMenu(menu);
    };

    const getFileType = (url) => {
        if (!url) return 'unknown';
        if (url.toLowerCase().includes('.pdf')) return 'pdf';
        if (url.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)) return 'image';
        return 'unknown';
    };

    const handleZoom = useCallback((delta) => {
        setZoomLevel(prevZoom => {
            const newZoom = Math.min(Math.max(prevZoom + delta, 0.5), 5); // Min 0.5x, Max 5x
            return newZoom;
        });
    }, []);

    const handleWheel = useCallback((e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        handleZoom(delta);
    }, [handleZoom]);

    const resetZoom = useCallback(() => {
        setZoomLevel(1);
        if (zoomContainerRef.current) {
            zoomContainerRef.current.scrollLeft = (zoomContainerRef.current.scrollWidth - zoomContainerRef.current.clientWidth) / 2;
            zoomContainerRef.current.scrollTop = (zoomContainerRef.current.scrollHeight - zoomContainerRef.current.clientHeight) / 2;
        }
    }, []);

    const handleImageClick = useCallback((imageUrl) => {
        setZoomedImage(imageUrl);
        setZoomLevel(1); // Reset zoom when opening new image
        // Reset scroll position to center after image loads and zoom level is set
        setTimeout(() => {
            if (zoomContainerRef.current) {
                zoomContainerRef.current.scrollLeft = (zoomContainerRef.current.scrollWidth - zoomContainerRef.current.clientWidth) / 2;
                zoomContainerRef.current.scrollTop = (zoomContainerRef.current.scrollHeight - zoomContainerRef.current.clientHeight) / 2;
            }
        }, 0);
    }, []);

    const handleCloseZoom = useCallback(() => {
        setZoomedImage(null);
        setZoomLevel(1);
    }, []);

    // Drag-to-pan handlers
    const handleMouseDown = (e) => {
        if (!zoomContainerRef.current) return;
        e.preventDefault();
        setIsPanning(true);
        setStartPos({ x: e.pageX, y: e.pageY });
        setStartScroll({
            left: zoomContainerRef.current.scrollLeft,
            top: zoomContainerRef.current.scrollTop,
        });
        zoomContainerRef.current.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e) => {
        if (!isPanning || !zoomContainerRef.current) return;
        e.preventDefault();
        const dx = e.pageX - startPos.x;
        const dy = e.pageY - startPos.y;
        zoomContainerRef.current.scrollLeft = startScroll.left - dx;
        zoomContainerRef.current.scrollTop = startScroll.top - dy;
    };

    const handleMouseUpOrLeave = () => {
        if (!zoomContainerRef.current) return;
        setIsPanning(false);
        zoomContainerRef.current.style.cursor = 'grab';
    };

    useEffect(() => {
        const container = zoomContainerRef.current;
        if (container && zoomedImage) {
            container.addEventListener('wheel', handleWheel, { passive: false });
            return () => {
                container.removeEventListener('wheel', handleWheel);
            };
        }
    }, [zoomedImage, handleWheel]);

    // Calorie Target Functions
    const handleSetCalorieTarget = (user) => {
        setCalorieTargetUser(user);
        setCalorieTarget(user.calorie_target || '');
        setShowCalorieDialog(true);
    };

    const saveCalorieTarget = async () => {
        if (!calorieTargetUser || !calorieTarget) {
            showFeedback('error', 'יש להזין יעד קלוריות');
            return;
        }
        
        const parsedCalorieTarget = parseInt(calorieTarget);
        if (isNaN(parsedCalorieTarget) || parsedCalorieTarget < 800 || parsedCalorieTarget > 4000) {
            showFeedback('error', 'יעד קלוריות חייב להיות מספר בין 800 ל-4000');
            return;
        }

        try {
            await User.update(calorieTargetUser.id, {
                calorie_target: parsedCalorieTarget
            });
            
            showFeedback('success', `יעד קלוריות עודכן ל-${parsedCalorieTarget} קק"ל עבור ${calorieTargetUser.name}`);
            setShowCalorieDialog(false);
            setCalorieTargetUser(null);
            setCalorieTarget('');
            loadData(); // Re-fetch data to update UI
        } catch (error) {
            console.error('Error updating calorie target:', error);
            showFeedback('error', 'שגיאה בעדכון יעד הקלוריות');
        }
    };

    const filteredUsers = usersWithMenus.filter(user => {
        const searchMatch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const statusMatch = filterStatus === 'all' ||
                           (filterStatus === 'with-menu' && user.menu) ||
                           (filterStatus === 'without-menu' && !user.menu) ||
                           (filterStatus === 'viewed' && user.menu?.viewed_by_trainee) ||
                           (filterStatus === 'unviewed' && user.menu && !user.menu.viewed_by_trainee);
        return searchMatch && statusMatch;
    });

    const stats = {
        totalUsers: users.length, // Now reflects only complete users
        usersWithMenus: usersWithMenus.filter(u => u.menu).length,
        usersWithoutMenus: usersWithMenus.filter(u => !u.menu).length,
        viewedMenus: menus.filter(m => m.viewed_by_trainee).length,
        unviewedMenus: menus.filter(m => !m.viewed_by_trainee).length
    };

    // Combine both loading states for the main spinner
    if (isLoadingUsers || isLoadingMenus) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6" dir="rtl">
            <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e)}
                style={{ display: 'none' }}
                accept=".jpg,.jpeg,.png,.pdf"
            />

            {/* Feedback Message */}
            <AnimatePresence>
                {feedbackMessage.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`p-4 rounded-lg text-center font-medium ${
                            feedbackMessage.type === 'success'
                                ? 'bg-green-50 text-green-800 border border-green-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                        }`}
                    >
                        {feedbackMessage.text}
                    </motion.div>
                )}
            </AnimatePresence>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-6 h-6 text-blue-600" />
                                ניהול תפריטים אישיים
                            </CardTitle>
                            <p className="text-sm text-slate-600 mt-1">
                                העלה והתאם תפריטי תזונה ואימון אישיים למתאמנים
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={loadData}
                                className="bg-slate-100 hover:bg-slate-200"
                                size="sm"
                            >
                                <RefreshCw className="w-4 h-4 me-2" />
                                רענן
                            </Button>
                            <Button onClick={() => setIsDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                                <Upload className="w-4 h-4 me-2" />
                                העלה תפריט חדש
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                        <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-3 text-center">
                                <div className="text-xl font-bold text-blue-600">{stats.totalUsers}</div>
                                <div className="text-xs text-blue-800">סה״כ מתאמנים</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-green-50 border-green-200">
                            <CardContent className="p-3 text-center">
                                <div className="text-xl font-bold text-green-600">{stats.usersWithMenus}</div>
                                <div className="text-xs text-green-800">עם תפריט</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-orange-50 border-orange-200">
                            <CardContent className="p-3 text-center">
                                <div className="text-xl font-bold text-orange-600">{stats.usersWithoutMenus}</div>
                                <div className="text-xs text-orange-800">ללא תפריט</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-purple-50 border-purple-200">
                            <CardContent className="p-3 text-center">
                                <div className="text-xl font-bold text-purple-600">{stats.viewedMenus}</div>
                                <div className="text-xs text-purple-800">נצפו</div>
                            </CardContent>
                        </Card>
                        <Card className="bg-red-50 border-red-200">
                            <CardContent className="p-3 text-center">
                                <div className="text-xl font-bold text-red-600">{stats.unviewedMenus}</div>
                                <div className="text-xs text-red-800">לא נצפו</div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Search and Filter */}
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <Input
                            placeholder="חיפוש לפי שם מתאמן או אימייל..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1"
                        />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border rounded-md bg-white"
                        >
                            <option value="all">כל המתאמנים</option>
                            <option value="with-menu">עם תפריט</option>
                            <option value="without-menu">ללא תפריט</option>
                            <option value="viewed">תפריט נצפה</option>
                            <option value="unviewed">תפריט לא נצפה</option>
                        </select>
                    </div>

                    {/* Users List */}
                    <div className="space-y-4">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map((user) => (
                                <motion.div
                                    key={user.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <Collapsible
                                        open={expandedUsers.has(user.id)}
                                        onOpenChange={() => toggleUserExpansion(user.id)}
                                    >
                                        <CollapsibleTrigger className="w-full p-4 text-right hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <UserIcon className="w-5 h-5 text-slate-400" />
                                                    <div>
                                                        <div className="font-medium text-slate-800">{user.name}</div>
                                                        <div className="text-sm text-slate-500">{user.email}</div>
                                                        {user.calorie_target && (
                                                            <p className="text-xs text-green-600 mt-0.5">
                                                                יעד קלוריות: {user.calorie_target} קק"ל
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent collapsible from toggling
                                                            handleSetCalorieTarget(user);
                                                        }}
                                                        className="flex items-center gap-1 text-xs px-2 py-1 h-auto"
                                                    >
                                                        <Target className="w-3 h-3" />
                                                        קבע קלוריות
                                                    </Button>
                                                    {user.menu ? (
                                                        <div className="flex items-center gap-2">
                                                            <Badge
                                                                className={`${
                                                                    user.menu.viewed_by_trainee
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-orange-100 text-orange-800'
                                                                }`}
                                                            >
                                                                {user.menu.viewed_by_trainee ? (
                                                                    <><CheckCircle className="w-3 h-3 me-1" />נצפה</>
                                                                ) : (
                                                                    <><AlertCircle className="w-3 h-3 me-1" />לא נצפה</>
                                                                )}
                                                            </Badge>
                                                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                                                                יש תפריט
                                                            </Badge>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline" className="bg-gray-50 text-gray-700">
                                                            ללא תפריט
                                                        </Badge>
                                                    )}
                                                    {expandedUsers.has(user.id) ? (
                                                        <ChevronDown className="w-4 h-4 text-slate-400" />
                                                    ) : (
                                                        <ChevronRight className="w-4 h-4 text-slate-400" />
                                                    )}
                                                </div>
                                            </div>
                                        </CollapsibleTrigger>

                                        <CollapsibleContent>
                                            <div className="px-4 pb-4 border-t bg-slate-50">
                                                {user.menu ? (
                                                    <div className="pt-4">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <h4 className="font-medium text-slate-700">תפריט נוכחי</h4>
                                                            <div className="text-sm text-slate-500">
                                                                עודכן: {formatDate(user.menu.upload_date)}
                                                            </div>
                                                        </div>

                                                        <div className="bg-white rounded-lg p-4 border">
                                                            <div className="flex items-center gap-3 mb-3">
                                                                {getFileType(user.menu.menu_file_url) === 'pdf' ? (
                                                                    <FileText className="w-6 h-6 text-red-500" />
                                                                ) : (
                                                                    <ImageIcon className="w-6 h-6 text-blue-500" />
                                                                )}
                                                                <div>
                                                                    <div className="font-medium text-slate-800">
                                                                        {getFileType(user.menu.menu_file_url) === 'pdf' ? 'קובץ PDF' : 'תמונה'}
                                                                    </div>
                                                                    <div className="text-sm text-slate-500">
                                                                        הועלה ב-{formatDate(user.menu.upload_date)}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {user.menu.instructions && (
                                                                <div className="mb-3 p-2 bg-amber-50 rounded border border-amber-200">
                                                                    <div className="text-sm text-amber-800">
                                                                        <strong>הוראות:</strong> {user.menu.instructions}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleViewMenu(user.menu)}
                                                                    className="text-blue-600 hover:text-blue-800"
                                                                >
                                                                    <Eye className="w-4 h-4 me-1" />
                                                                    צפה
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedUser(user.email);
                                                                        setInstructions(user.menu.instructions || '');
                                                                        setIsDialogOpen(true);
                                                                    }}
                                                                    className="text-green-600 hover:text-green-800"
                                                                >
                                                                    <Edit3 className="w-4 h-4 me-1" />
                                                                    עדכן
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleDeleteMenu(user.menu.id, user.name)}
                                                                    disabled={deletingId === user.menu.id}
                                                                    className="text-red-600 hover:text-red-800"
                                                                >
                                                                    {deletingId === user.menu.id ? (
                                                                        <Loader2 className="w-4 h-4 animate-spin me-1" />
                                                                    ) : (
                                                                        <Trash2 className="w-4 h-4 me-1" />
                                                                    )}
                                                                    מחק
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="pt-4">
                                                        <div className="text-center py-6">
                                                            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                                            <p className="text-slate-500 mb-4">לא הועלה תפריט עבור מתאמן זה</p>
                                                            <Button
                                                                onClick={() => {
                                                                    setSelectedUser(user.email);
                                                                    setIsDialogOpen(true);
                                                                }}
                                                                className="bg-blue-600 hover:bg-blue-700"
                                                                size="sm"
                                                            >
                                                                <Plus className="w-4 h-4 me-1" />
                                                                העלה תפריט
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </CollapsibleContent>
                                    </Collapsible>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <UserIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-600 mb-2">אין מתאמנים</h3>
                                <p className="text-slate-500">
                                    {searchTerm || filterStatus !== 'all'
                                        ? 'לא נמצאו מתאמנים המתאימים לחיפוש'
                                        : 'עדיין לא נרשמו מתאמנים במערכת'
                                    }
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Upload Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedUser ? 'עדכון תפריט אישי' : 'העלאת תפריט אישי'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        {!selectedUser && (
                            <div>
                                <Label htmlFor="user-select">בחר מתאמן *</Label>
                                {/* Replaced native select with shadcn/ui Select component */}
                                <Select value={selectedUser} onValueChange={setSelectedUser}>
                                    <SelectTrigger className="w-full mt-1">
                                        <SelectValue placeholder="בחר מתאמן..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>מתאמנים</SelectLabel>
                                            {users.map((user) => (
                                                <SelectItem key={user.id} value={user.email}>
                                                    {user.name} ({user.email})
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div>
                            <Label htmlFor="file-upload">העלה קובץ תפריט *</Label>
                            <div className="mt-2">
                                <input
                                    id="file-upload"
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={handleFileUpload}
                                    className="block w-full text-sm text-slate-500 file:me-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    disabled={isUploading}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    קבצים נתמכים: JPG, PNG, PDF (עד 10MB)
                                </p>
                            </div>
                            {isUploading && (
                                <div className="flex items-center gap-2 mt-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">מעלה קובץ...</span>
                                </div>
                            )}
                            {uploadedFile && (
                                <div className="flex items-center gap-2 mt-2 p-2 bg-green-50 rounded-md">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-800">קובץ הועלה בהצלחה</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="instructions">הוראות למתאמן (אופציונלי)</Label>
                            <Textarea
                                id="instructions"
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="הוראות מיוחדות או הסברים לגבי התפריט..."
                                rows={3}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsDialogOpen(false);
                                    setSelectedUser('');
                                    setUploadedFile(null);
                                    setInstructions('');
                                }}
                            >
                                ביטול
                            </Button>
                            <Button
                                onClick={handleSaveMenu}
                                disabled={!selectedUser || !uploadedFile}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {selectedUser && menus.find(m => m.user_email === selectedUser) ? 'עדכן תפריט' : 'שמור תפריט'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* View Menu Dialog */}
            <Dialog open={!!viewingMenu} onOpenChange={() => setViewingMenu(null)}>
                <DialogContent dir="rtl" className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            תפריט של {viewingMenu?.user_email && users.find(u => u.email === viewingMenu.user_email)?.name}
                        </DialogTitle>
                        {viewingMenu && (
                            <DialogDescription>
                                הועלה בתאריך: {format(new Date(viewingMenu.upload_date), 'dd/MM/yyyy')}
                            </DialogDescription>
                        )}
                    </DialogHeader>
                    {viewingMenu && (
                        <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <strong>תאריך העלאה:</strong> {formatDate(viewingMenu.upload_date)}
                                </div>
                                <div>
                                    <strong>סטטוס צפייה:</strong>
                                    <Badge className={`me-2 ${
                                        viewingMenu.viewed_by_trainee
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-orange-100 text-orange-800'
                                    }`}>
                                        {viewingMenu.viewed_by_trainee ? 'נצפה' : 'לא נצפה'}
                                    </Badge>
                                </div>
                            </div>

                            {viewingMenu.instructions && (
                                <div>
                                    <h4 className="font-semibold mb-2">הנחיות:</h4>
                                    <p className="text-slate-600 bg-slate-50 p-3 rounded-md mb-4">
                                        {viewingMenu.instructions}
                                    </p>
                                </div>
                            )}

                            <h4 className="font-semibold mb-2">תצוגת התפריט:</h4>
                            <div className="border rounded-lg overflow-hidden">
                                {getFileType(viewingMenu.menu_file_url) === 'pdf' ? (
                                    <div className="p-8 text-center">
                                        <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                                        <p className="text-sm text-slate-600 mb-4">קובץ PDF - לא ניתן להציג בדפדפן</p>
                                        <Button
                                            onClick={() => window.open(viewingMenu.menu_file_url, '_blank')}
                                            className="flex items-center gap-2"
                                        >
                                            <Download className="w-4 h-4" />
                                            פתח קובץ PDF
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="cursor-zoom-in flex items-center justify-center bg-gray-100"
                                        onClick={() => handleImageClick(viewingMenu.menu_file_url)}
                                    >
                                        <img
                                            src={viewingMenu.menu_file_url}
                                            alt="תפריט"
                                            className="w-full h-auto max-h-96 object-contain"
                                        />
                                    </div>
                                )}
                            </div>
                            {getFileType(viewingMenu.menu_file_url) !== 'pdf' && (
                                <p className="text-xs text-slate-500 mt-2 text-center">
                                    לחץ על התמונה להגדלה עם אפשרות זום
                                </p>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setViewingMenu(null)}>סגור</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Enhanced Zoomed Image Dialog with Drag-to-Pan */}
            <Dialog open={!!zoomedImage} onOpenChange={handleCloseZoom}>
              <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 bg-black/90 border-0 overflow-hidden flex items-center justify-center">
                <div className="relative w-full h-full">
                  {/* Zoom Controls */}
                  <div className="absolute top-4 end-4 z-10 flex gap-2 bg-black/60 rounded-lg p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleZoom(0.2)}
                      className="text-white hover:bg-white/20"
                      title="הגדל"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleZoom(-0.2)}
                      className="text-white hover:bg-white/20"
                      title="הקטן"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={resetZoom}
                      className="text-white hover:bg-white/20"
                      title="אפס זום"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                    <div className="flex items-center text-white text-sm px-2">
                      {Math.round(zoomLevel * 100)}%
                    </div>
                  </div>

                  {/* Close Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseZoom}
                    className="absolute top-4 start-4 z-10 text-white hover:bg-white/20"
                    title="סגור"
                  >
                    ✕
                  </Button>

                  {/* Zoom & Pan Container */}
                  <div
                    ref={zoomContainerRef}
                    className="w-full h-full overflow-auto flex items-center justify-center cursor-grab"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    style={{
                      background: 'radial-gradient(circle, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.9) 100%)'
                    }}
                  >
                    <img
                      src={zoomedImage}
                      alt="תפריט בהגדלה"
                      className="transition-transform duration-200 ease-out"
                      style={{
                        transform: `scale(${zoomLevel})`,
                        maxWidth: 'none',
                        maxHeight: 'none',
                        pointerEvents: 'none'
                      }}
                      draggable={false}
                    />
                  </div>

                  {/* Instructions */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-2 rounded-lg">
                    השתמש בגלגלת העכבר כדי להגדיל/להקטין • לחץ וגרור כדי להזיז
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Calorie Target Dialog */}
            <Dialog open={showCalorieDialog} onOpenChange={setShowCalorieDialog}>
                <DialogContent className="w-[95vw] max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>קביעת יעד קלוריות יומי</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-slate-600 mb-2">
                                עבור: <span className="font-semibold">{calorieTargetUser?.name}</span>
                            </p>
                            <Label htmlFor="calorieTarget">יעד קלוריות יומי (קק"ל)</Label>
                            <Input
                                id="calorieTarget"
                                type="number"
                                placeholder="לדוגמה: 1800"
                                value={calorieTarget}
                                onChange={(e) => setCalorieTarget(e.target.value)}
                                min="800"
                                max="4000"
                            />
                            <p className="text-xs text-slate-500 mt-1">
                                הערך יוצג למתאמן בלשונית הבוסטר במקום הערך הסטנדרטי.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setShowCalorieDialog(false);
                            setCalorieTargetUser(null);
                            setCalorieTarget('');
                        }}>
                            ביטול
                        </Button>
                        <Button onClick={saveCalorieTarget} disabled={!calorieTarget || isNaN(parseInt(calorieTarget)) || parseInt(calorieTarget) < 800 || parseInt(calorieTarget) > 4000}>
                            שמור יעד
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
