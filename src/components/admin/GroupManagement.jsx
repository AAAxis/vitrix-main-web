
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserGroup, GroupWorkoutPlan, GroupReminder, GroupMessage, GroupEvent } from '@/api/entities';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';
import { groupsForStaff } from '@/lib/groupUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Search,
  Calendar,
  MessageSquare,
  Bell,
  Dumbbell,
  Eye,
  Shield,
  Filter,
  TrendingUp,
  UserPlus,
  Loader2,
  ChevronRight,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GroupCalendar from './GroupCalendar';
import GroupMessaging from './GroupMessaging';
import GroupWeightFocus from './GroupWeightFocus'; // Added GroupWeightFocus import

export default function GroupManagement() {
    const { user: currentUser, isSystemAdmin } = useAdminDashboard();
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        assigned_coach: '',
        color_tag: '#3b82f6',
        status: 'Active'
    });
    const [assignToGroupSearchTerm, setAssignToGroupSearchTerm] = useState('');
    const [isAssigningToGroup, setIsAssigningToGroup] = useState(false);

    useEffect(() => {
        loadData();
    }, [currentUser]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [allGroups, allUsers] = await Promise.all([UserGroup.list(), User.listForStaff(currentUser)]);
            setGroups(groupsForStaff(allGroups || [], currentUser, isSystemAdmin));
            setUsers(allUsers);
        } catch (error) {
            console.error("Error loading groups/users:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenDialog = (group = null) => {
        if (group) {
            setEditingGroup(group);
            setFormData({
                name: group.name,
                description: group.description || '',
                assigned_coach: group.assigned_coach || '',
                color_tag: group.color_tag || '#3b82f6',
                status: group.status || 'Active'
            });
            setAssignToGroupSearchTerm('');
        } else {
            setEditingGroup(null);
            setFormData({
                name: '',
                description: '',
                assigned_coach: currentUser?.email || '',
                color_tag: '#3b82f6',
                status: 'Active'
            });
            setIsDialogOpen(true);
        }
    };

    const handleSaveGroup = async (e) => {
        e.preventDefault();
        if (!formData.name) return;

        try {
            if (editingGroup) {
                await UserGroup.update(editingGroup.id, formData);
            } else {
                await UserGroup.create(formData);
            }
            setIsDialogOpen(false);
            setEditingGroup(null);
            loadData();
        } catch (error) {
            console.error("Error saving group:", error);
        }
    };

    const handleDeleteGroup = async (groupId, groupName, onSuccess) => {
        const usersInGroup = users.filter(u => u.group_names?.includes(groupName));

        if (usersInGroup.length > 0) {
            const action = window.confirm(
                `לקבוצה זו יש ${usersInGroup.length} משתמשים. לחץ אישור כדי לנתק אותם מהקבוצה, או ביטול כדי לבטל.`
            );
            if (!action) return;
        }

        if (window.confirm("האם אתה בטוח שברצונך למחוק את הקבוצה הזו? פעולה זו לא ניתנת לביטול.")) {
            try {
                // Unassign users from the group
                for (const user of usersInGroup) {
                    const updatedGroups = user.group_names.filter(g => g !== groupName);
                    await User.update(user.id, { group_names: updatedGroups });
                }

                await UserGroup.delete(groupId);
                loadData();
                if (onSuccess) onSuccess();
            } catch (error) {
                console.error("Error deleting group:", error);
            }
        }
    };

    const countUsersInGroup = (groupName) => {
        return users.filter(user => {
            // Add safety check for user object and group_names array
            if (!user || !Array.isArray(user.group_names)) return false;
            return user.group_names.includes(groupName);
        }).length;
    };

    const getUsersInGroup = (groupName) => {
        return users.filter(user => {
            // Add safety check for user object and group_names array
            if (!user || !Array.isArray(user.group_names)) return false;
            return user.group_names.includes(groupName);
        });
    };

    const getAvailableUsers = () => {
        return users.filter(user => {
            // Add safety check for user object
            if (!user) return false;
            const userGroups = Array.isArray(user.group_names) ? user.group_names : [];
            return !userGroups.includes(selectedGroup?.name);
        });
    };

    const assignableToGroupUsers = useMemo(() => {
        if (!editingGroup?.name) return [];
        const notInGroup = users.filter(u => {
            if (!u) return false;
            const names = Array.isArray(u.group_names) ? u.group_names : [];
            return !names.includes(editingGroup.name);
        });
        if (!assignToGroupSearchTerm.trim()) return notInGroup;
        const term = assignToGroupSearchTerm.toLowerCase().trim();
        return notInGroup.filter(u => {
            const name = (u.name || u.full_name || '').toLowerCase();
            const email = (u.email || '').toLowerCase();
            return name.includes(term) || email.includes(term);
        });
    }, [users, editingGroup?.name, assignToGroupSearchTerm]);

    const handleAssignUserToGroup = async (user) => {
        const uid = user.id || user.uid;
        if (!uid || !editingGroup?.name) return;
        setIsAssigningToGroup(true);
        try {
            const current = Array.isArray(user.group_names) ? user.group_names : [];
            const next = current.includes(editingGroup.name) ? current : [...current, editingGroup.name];
            await User.update(uid, { group_names: next });
            loadData();
        } catch (err) {
            console.error('Error assigning user to group:', err);
        } finally {
            setIsAssigningToGroup(false);
        }
    };

    const filteredGroups = groups.filter(group => {
        const searchMatch = group.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           group.assigned_coach?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           getUsersInGroup(group.name).some(u =>
                               (u.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                               (u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
                           );
        const statusMatch = statusFilter === 'all' || group.status === statusFilter;
        return searchMatch && statusMatch;
    });

    if (isLoading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
    );

    // ── Edit group: separate screen (reuse same pattern as trainer group edit) ──
    if (editingGroup) {
        const membersInGroup = users.filter(u => Array.isArray(u.group_names) && u.group_names.includes(editingGroup.name));
        return (
            <div className="space-y-6" dir="rtl">
                <Button variant="ghost" onClick={() => setEditingGroup(null)} className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-2">
                    <ChevronRight className="w-4 h-4" />
                    חזרה לרשימת קבוצות
                </Button>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xl">עריכת קבוצה: {editingGroup.name}</CardTitle>
                        <CardDescription>{membersInGroup.length} משתמשים בקבוצה</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSaveGroup} className="space-y-4">
                            <div>
                                <Label htmlFor="name">שם הקבוצה *</Label>
                                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="הזן שם קבוצה..." disabled />
                                <p className="text-xs text-slate-500 mt-1">שינוי שם קבוצה לא זמין (משפיע על שיוך משתמשים).</p>
                            </div>
                            <div>
                                <Label htmlFor="description">תיאור</Label>
                                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="תיאור קצר של הקבוצה..." rows={3} />
                            </div>
                            <div>
                                <Label htmlFor="assigned_coach">מאמן מוקצה (אימייל)</Label>
                                <Input id="assigned_coach" type="email" value={formData.assigned_coach} onChange={(e) => setFormData({ ...formData, assigned_coach: e.target.value })} placeholder="coach@example.com" />
                            </div>
                            <div className="flex items-center gap-4">
                                <div>
                                    <Label htmlFor="color_tag">תג צבע</Label>
                                    <Input id="color_tag" type="color" value={formData.color_tag} onChange={(e) => setFormData({ ...formData, color_tag: e.target.value })} className="p-1 h-10 w-20" />
                                </div>
                                <div className="flex-1">
                                    <Label htmlFor="status">סטטוס</Label>
                                    <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Active">פעיל</SelectItem>
                                            <SelectItem value="Inactive">לא פעיל</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setEditingGroup(null)}>ביטול</Button>
                                <Button type="submit"><Save className="w-4 h-4 ms-2" />שמור שינויים</Button>
                                <Button type="button" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDeleteGroup(editingGroup.id, editingGroup.name, () => setEditingGroup(null))}><Trash2 className="w-4 h-4 ms-2" />מחק קבוצה</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2"><UserPlus className="w-4 h-4" />שייך מתאמנים לקבוצה</CardTitle>
                        <CardDescription>משתמשים שעדיין לא בקבוצה זו. חפש ולחץ שייך.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="relative">
                            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input placeholder="חפש לפי שם או אימייל..." value={assignToGroupSearchTerm} onChange={(e) => setAssignToGroupSearchTerm(e.target.value)} className="pe-10" />
                        </div>
                        <ScrollArea className="h-[280px] rounded-md border p-2">
                            <div className="space-y-2">
                                {assignableToGroupUsers.length === 0 && (
                                    <div className="text-center py-6 text-slate-500 text-sm">
                                        {assignToGroupSearchTerm.trim() ? 'לא נמצאו משתמשים.' : 'כל המשתמשים כבר בקבוצה זו.'}
                                    </div>
                                )}
                                {assignableToGroupUsers.map((u) => (
                                    <div key={u.id || u.uid} className="flex items-center justify-between gap-2 py-2 px-2 rounded hover:bg-slate-50">
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm truncate">{u.name || u.full_name || 'חסר שם'}</p>
                                            <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                        </div>
                                        <Button type="button" size="sm" variant="secondary" className="shrink-0" onClick={() => handleAssignUserToGroup(u)} disabled={isAssigningToGroup}>
                                            {isAssigningToGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 ms-1" />}
                                            שייך
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6" dir="rtl">
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white via-purple-50 to-blue-50">
                <CardHeader className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white rounded-t-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold">ניהול קבוצות</CardTitle>
                                <p className="text-purple-100 text-sm mt-1">
                                    {groups.length} קבוצות • {users.length} משתמשים
                                </p>
                            </div>
                        </div>
                        <Button
                            onClick={() => handleOpenDialog()}
                            className="bg-white/20 hover:bg-white/30 border border-white/30"
                        >
                            <Plus className="w-4 h-4 me-2" /> צור קבוצה חדשה
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 mb-6">
                            <TabsTrigger value="overview" className="text-xs sm:text-sm">
                                <Eye className="w-4 h-4 me-1 sm:me-2" />
                                סקירה
                            </TabsTrigger>
                            <TabsTrigger value="weight-focus" className="text-xs sm:text-sm">
                                <TrendingUp className="w-4 h-4 me-1 sm:me-2" />
                                מעקב משקל קבוצתי
                            </TabsTrigger>
                            <TabsTrigger value="calendar" className="text-xs sm:text-sm">
                                <Calendar className="w-4 h-4 me-1 sm:me-2" />
                                לוח שנה
                            </TabsTrigger>
                            <TabsTrigger value="messaging" className="text-xs sm:text-sm">
                                <MessageSquare className="w-4 h-4 me-1 sm:me-2" />
                                הודעות
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="space-y-6">
                            {/* Filters */}
                            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-slate-50 rounded-xl">
                                <div className="relative flex-1">
                                    <Search className="absolute end-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                    <Input
                                        placeholder="חיפוש לפי שם קבוצה, מאמן או משתמש..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pe-10 bg-white"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <Filter className="w-4 h-4 text-gray-500" />
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full sm:w-40 bg-white">
                                            <SelectValue placeholder="סינון סטטוס" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">כל הסטטוסים</SelectItem>
                                            <SelectItem value="Active">פעיל</SelectItem>
                                            <SelectItem value="Inactive">לא פעיל</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Groups Grid */}
                            <AnimatePresence>
                                {filteredGroups.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                        {filteredGroups.map((group, index) => {
                                            const userCount = countUsersInGroup(group.name);

                                            return (
                                                <motion.div
                                                    key={group.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -20 }}
                                                    transition={{ delay: index * 0.1 }}
                                                >
                                                    <Card className="h-full hover:shadow-lg transition-all duration-300 border-s-4 group cursor-pointer"
                                                          style={{ borderLeftColor: group.color_tag }}>
                                                        <CardHeader className="pb-3">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                    <div
                                                                        className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white shadow-sm"
                                                                        style={{ backgroundColor: group.color_tag }}
                                                                    />
                                                                    <div className="min-w-0 flex-1">
                                                                        <CardTitle className="text-lg font-bold text-slate-800 truncate">
                                                                            {group.name}
                                                                        </CardTitle>
                                                                        {group.description && (
                                                                            <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                                                                                {group.description}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <Badge
                                                                    className={`flex-shrink-0 ${
                                                                        group.status === 'Active'
                                                                            ? 'bg-green-100 text-green-800 border-green-200'
                                                                            : 'bg-gray-100 text-gray-800 border-gray-200'
                                                                    }`}
                                                                >
                                                                    {group.status === 'Active' ? 'פעיל' : 'לא פעיל'}
                                                                </Badge>
                                                            </div>
                                                        </CardHeader>

                                                        <CardContent className="space-y-4">
                                                            {/* Stats */}
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="bg-blue-50 rounded-lg p-3 text-center">
                                                                    <div className="flex items-center justify-center gap-2 mb-1">
                                                                        <Users className="w-4 h-4 text-blue-600" />
                                                                        <span className="text-2xl font-bold text-blue-800">
                                                                            {userCount}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs text-blue-600 font-medium">
                                                                        משתמשים
                                                                    </span>
                                                                </div>
                                                                <div className="bg-purple-50 rounded-lg p-3 text-center">
                                                                    <div className="flex items-center justify-center gap-2 mb-1">
                                                                        <Shield className="w-4 h-4 text-purple-600" />
                                                                        <span className="text-sm font-bold text-purple-800 truncate">
                                                                            {group.assigned_coach ? '✓' : '✗'}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-xs text-purple-600 font-medium">
                                                                        מאמן
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            {/* Coach Info */}
                                                            {group.assigned_coach && (
                                                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                                                                    <div className="flex items-center gap-2 text-sm">
                                                                        <Shield className="w-4 h-4 text-green-600" />
                                                                        <span className="font-medium text-green-800">מאמן:</span>
                                                                        <span className="text-green-700 truncate flex-1">
                                                                            {group.assigned_coach}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Action Buttons */}
                                                            <div className="flex gap-2 pt-2">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="flex-1 text-xs"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenDialog(group);
                                                                    }}
                                                                >
                                                                    <Edit className="w-3 h-3 me-1" />
                                                                    ערוך
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteGroup(group.id, group.name);
                                                                    }}
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                </Button>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                                        <h3 className="text-lg font-semibold text-gray-600 mb-2">
                                            {searchTerm || statusFilter !== 'all' ? 'לא נמצאו קבוצות' : 'אין קבוצות עדיין'}
                                        </h3>
                                        <p className="text-gray-500 mb-4">
                                            {searchTerm || statusFilter !== 'all'
                                                ? 'נסה לשנות את החיפוש או הסינון'
                                                : 'צור את הקבוצה הראשונה שלך'}
                                        </p>
                                        {!searchTerm && statusFilter === 'all' && (
                                            <Button onClick={() => handleOpenDialog()}>
                                                <Plus className="w-4 h-4 me-2" />
                                                צור קבוצה חדשה
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </AnimatePresence>
                        </TabsContent>

                        <TabsContent value="weight-focus" className="space-y-6">
                            <GroupWeightFocus />
                        </TabsContent>

                        <TabsContent value="calendar">
                            <GroupCalendar groups={groups} />
                        </TabsContent>

                        <TabsContent value="messaging">
                            <GroupMessaging groups={groups} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Create/Edit Group Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingGroup ? 'עריכת קבוצה' : 'יצירת קבוצה חדשה'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveGroup} className="space-y-4">
                        <div>
                            <Label htmlFor="name">שם הקבוצה *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                required
                                placeholder="הזן שם קבוצה..."
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">תיאור</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                                placeholder="תיאור קצר של הקבוצה..."
                                rows={3}
                            />
                        </div>
                        {editingGroup && (
                        <div>
                            <Label htmlFor="assigned_coach">מאמן מוקצה (אימייל)</Label>
                            <Input
                                id="assigned_coach"
                                type="email"
                                value={formData.assigned_coach}
                                onChange={(e) => setFormData({...formData, assigned_coach: e.target.value})}
                                placeholder="coach@example.com"
                            />
                        </div>
                        )}
                        <div className="flex items-center gap-4">
                            <div>
                                <Label htmlFor="color_tag">תג צבע</Label>
                                <Input
                                    id="color_tag"
                                    type="color"
                                    value={formData.color_tag}
                                    onChange={(e) => setFormData({...formData, color_tag: e.target.value})}
                                    className="p-1 h-10 w-20"
                                />
                            </div>
                            <div className="flex-1">
                                <Label htmlFor="status">סטטוס</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(v) => setFormData({...formData, status: v})}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">פעיל</SelectItem>
                                        <SelectItem value="Inactive">לא פעיל</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {editingGroup && (
                            <>
                                <div className="border-t pt-4 mt-4">
                                    <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                                        <UserPlus className="w-4 h-4" />
                                        שייך מתאמנים לקבוצה
                                    </Label>
                                    <p className="text-xs text-slate-500 mb-2">משתמשים שעדיין לא בקבוצה זו. חפש ולחץ שייך.</p>
                                    <div className="relative mb-3">
                                        <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input
                                            placeholder="חפש לפי שם או אימייל..."
                                            value={assignToGroupSearchTerm}
                                            onChange={(e) => setAssignToGroupSearchTerm(e.target.value)}
                                            className="pe-10"
                                        />
                                    </div>
                                    <ScrollArea className="h-[200px] rounded-md border p-2">
                                        <div className="space-y-2">
                                            {assignableToGroupUsers.length === 0 && (
                                                <div className="text-center py-6 text-slate-500 text-sm">
                                                    {assignToGroupSearchTerm.trim() ? 'לא נמצאו משתמשים.' : 'כל המשתמשים כבר בקבוצה זו.'}
                                                </div>
                                            )}
                                            {assignableToGroupUsers.map((u) => (
                                                <div key={u.id || u.uid} className="flex items-center justify-between gap-2 py-2 px-2 rounded hover:bg-slate-50">
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm truncate">{u.name || u.full_name || 'חסר שם'}</p>
                                                        <p className="text-xs text-slate-500 truncate">{u.email}</p>
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="secondary"
                                                        className="shrink-0"
                                                        onClick={() => handleAssignUserToGroup(u)}
                                                        disabled={isAssigningToGroup}
                                                    >
                                                        {isAssigningToGroup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5 ms-1" />}
                                                        שייך
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                </div>
                            </>
                        )}
                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDialogOpen(false)}
                            >
                                ביטול
                            </Button>
                            <Button type="submit">
                                {editingGroup ? 'עדכן קבוצה' : 'צור קבוצה'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// Group Settings Component
const GroupSettings = ({ group, onUpdate }) => {
    const [workoutPlans, setWorkoutPlans] = useState([]);
    const [reminders, setReminders] = useState([]);
    const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [planFormData, setPlanFormData] = useState({
        plan_name: '',
        is_active: true
    });

    const loadGroupSettings = useCallback(async () => {
        try {
            const [plans, remindersList] = await Promise.all([
                GroupWorkoutPlan.filter({ group_name: group.name }),
                GroupReminder.filter({ group_name: group.name })
            ]);
            setWorkoutPlans(plans);
            setReminders(remindersList);
        } catch (error) {
            console.error("Error loading group settings:", error);
        }
    }, [group.name]); // Dependency on group.name

    useEffect(() => {
        loadGroupSettings();
    }, [loadGroupSettings]); // Dependency on the memoized function

    const handleOpenPlanDialog = (plan = null) => {
        if (plan) {
            setEditingPlan(plan);
            setPlanFormData({
                plan_name: plan.plan_name || '',
                is_active: plan.is_active !== undefined ? plan.is_active : true
            });
        } else {
            setEditingPlan(null);
            setPlanFormData({
                plan_name: '',
                is_active: true
            });
        }
        setIsPlanDialogOpen(true);
    };

    const handleSavePlan = async (e) => {
        e.preventDefault();
        if (!planFormData.plan_name) return;

        try {
            const planData = {
                ...planFormData,
                group_name: group.name
            };

            if (editingPlan) {
                await GroupWorkoutPlan.update(editingPlan.id, planData);
            } else {
                await GroupWorkoutPlan.create(planData);
            }
            setIsPlanDialogOpen(false);
            loadGroupSettings();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error saving workout plan:", error);
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            <div className="border-b pb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: group.color_tag }}
                    />
                    הגדרות {group.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{group.description}</p>
            </div>

            <Tabs defaultValue="workout-plans" className="w-full">
                <TabsList>
                    <TabsTrigger value="workout-plans">
                        <Dumbbell className="w-4 h-4 me-2" />
                        תוכניות אימון
                    </TabsTrigger>
                    <TabsTrigger value="reminders">
                        <Bell className="w-4 h-4 me-2" />
                        תזכורות
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="workout-plans" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium">תוכניות אימון קבוצתיות</h4>
                        <Button size="sm" onClick={() => handleOpenPlanDialog()}>
                            <Plus className="w-4 h-4 me-2" />
                            הוסף תוכנית
                        </Button>
                    </div>
                    {workoutPlans.length > 0 ? (
                        <div className="space-y-2">
                            {workoutPlans.map(plan => (
                                <div key={plan.id} className="p-3 border rounded-lg flex justify-between items-center">
                                    <div>
                                        <span className="font-medium">{plan.plan_name}</span>
                                        <Badge className="me-2" variant={plan.is_active ? 'default' : 'secondary'}>
                                            {plan.is_active ? 'פעיל' : 'לא פעיל'}
                                        </Badge>
                                    </div>
                                    <Button variant="outline" size="sm" onClick={() => handleOpenPlanDialog(plan)}>ערוך</Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <Dumbbell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p className="text-gray-500 text-center">לא הוגדרו תוכניות אימון</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="reminders" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="font-medium">תזכורות קבוצתיות</h4>
                        <Button size="sm">
                            <Plus className="w-4 h-4 me-2" />
                            הוסף תזכורת
                        </Button>
                    </div>
                    {reminders.length > 0 ? (
                        <div className="space-y-2">
                            {reminders.map(reminder => (
                                <div key={reminder.id} className="p-3 border rounded-lg flex justify-between items-center">
                                    <div>
                                        <span className="font-medium">{reminder.title}</span>
                                        <p className="text-sm text-gray-500">{reminder.message}</p>
                                        <Badge className="mt-1" variant={reminder.is_active ? 'default' : 'secondary'}>
                                            {reminder.is_active ? 'פעיל' : 'לא פעיל'}
                                        </Badge>
                                    </div>
                                    <Button variant="outline" size="sm">ערוך</Button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p className="text-gray-500 text-center">לא הוגדרו תזכורות</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Add/Edit Workout Plan Dialog */}
            <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
                <DialogContent className="sm:max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingPlan ? 'עריכת תוכנית אימון' : 'הוספת תוכנית אימון חדשה'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSavePlan} className="space-y-4">
                        <div>
                            <Label htmlFor="plan_name">שם התוכנית *</Label>
                            <Input
                                id="plan_name"
                                value={planFormData.plan_name}
                                onChange={(e) => setPlanFormData({...planFormData, plan_name: e.target.value})}
                                required
                                placeholder="הזן שם תוכנית אימון..."
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_active"
                                checked={planFormData.is_active}
                                onCheckedChange={(checked) => setPlanFormData({...planFormData, is_active: checked})}
                            />
                            <Label htmlFor="is_active">תוכנית פעילה</Label>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsPlanDialogOpen(false)}
                            >
                                ביטול
                            </Button>
                            <Button type="submit">
                                {editingPlan ? 'עדכן תוכנית' : 'הוסף תוכנית'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
