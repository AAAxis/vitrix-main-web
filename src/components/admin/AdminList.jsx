import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/api/entities';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Key, User as UserIcon, UserMinus, UserPlus, Loader2, Search, Mail } from 'lucide-react';

export default function AdminList({ canAccess }) {
  const { isSystemAdmin } = useAdminDashboard();
  const canLoad = canAccess === true || isSystemAdmin;
  const [users, setUsers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [downgradingId, setDowngradingId] = useState(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addDialogSearchTerm, setAddDialogSearchTerm] = useState('');
  const [addDialogUsers, setAddDialogUsers] = useState([]);
  const [isLoadingAddUsers, setIsLoadingAddUsers] = useState(false);
  const [promotingId, setPromotingId] = useState(null);

  const loadAdmins = useCallback(async () => {
    if (!canLoad) return;
    setIsLoading(true);
    setError('');
    try {
      const list = await User.list();
      const admins = (list || []).filter(
        u => (u.role || '').toLowerCase() === 'admin' || u.is_admin === true
      );
      setUsers(admins);
      setFiltered(admins);
    } catch (err) {
      console.error('Failed to load admins:', err);
      setError('שגיאה בטעינת רשימת המנהלים');
      setUsers([]);
      setFiltered([]);
    } finally {
      setIsLoading(false);
    }
  }, [canLoad]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFiltered(users);
      return;
    }
    const term = searchTerm.trim().toLowerCase();
    setFiltered(
      users.filter(
        u =>
          (u.name || '').toLowerCase().includes(term) ||
          (u.full_name || '').toLowerCase().includes(term) ||
          (u.email || '').toLowerCase().includes(term)
      )
    );
  }, [searchTerm, users]);

  const handleDowngrade = async (user) => {
    const uid = user.uid || user.id;
    if (!uid) return;
    setDowngradingId(uid);
    setError('');
    try {
      await User.update(uid, { role: 'trainee', is_admin: false });
      setMessage(`${user.name || user.email} הוסר מתפקיד מנהל.`);
      loadAdmins();
    } catch (err) {
      console.error('Failed to downgrade:', err);
      setError('שגיאה בהסרת תפקיד המנהל');
    } finally {
      setDowngradingId(null);
    }
  };

  const isAdminUser = (u) =>
    (u.role || '').toLowerCase() === 'admin' || u.is_admin === true || u.isAdmin === true;

  useEffect(() => {
    if (!isAddDialogOpen || !canLoad) return;
    let cancelled = false;
    setIsLoadingAddUsers(true);
    User.list()
      .then((list) => {
        if (cancelled) return;
        const nonAdmins = (list || []).filter((u) => !isAdminUser(u));
        setAddDialogUsers(nonAdmins);
      })
      .catch(() => {
        if (!cancelled) setAddDialogUsers([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingAddUsers(false);
      });
    return () => { cancelled = true; };
  }, [isAddDialogOpen, canLoad]);

  const addDialogFiltered = addDialogUsers.filter((u) => {
    if (!addDialogSearchTerm.trim()) return true;
    const term = addDialogSearchTerm.trim().toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(term) ||
      (u.full_name || '').toLowerCase().includes(term) ||
      (u.email || '').toLowerCase().includes(term)
    );
  }).slice(0, 50);

  const handlePromoteToAdmin = async (user) => {
    const uid = user.uid || user.id;
    if (!uid) return;
    setPromotingId(uid);
    setError('');
    try {
      await User.update(uid, { role: 'admin', is_admin: true });
      setMessage(`${user.name || user.email} הוגדר כמנהל מערכת.`);
      setIsAddDialogOpen(false);
      setAddDialogSearchTerm('');
      loadAdmins();
      setAddDialogUsers((prev) => prev.filter((u) => (u.uid || u.id) !== uid));
    } catch (err) {
      console.error('Failed to promote to admin:', err);
      setError('שגיאה בהגדרת המשתמש כמנהל');
    } finally {
      setPromotingId(null);
    }
  };

  if (!canLoad) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>גישה לרשימת מנהלים שמורה למנהל מערכת.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Key className="w-6 h-6 text-amber-600" />
            ניהול מנהלים
          </CardTitle>
          <CardDescription>מנהלי מערכת — ניתן להסיר תפקיד מנהל או להוסיף מנהלים חדשים</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => { setIsAddDialogOpen(true); setAddDialogSearchTerm(''); setError(''); }} className="gap-2 bg-amber-600 hover:bg-amber-700">
              <UserPlus className="w-4 h-4" />
              הוסף מנהל
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="חפש לפי שם או אימייל..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pe-10"
            />
          </div>
        </CardContent>
      </Card>

      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            {searchTerm ? 'לא נמצאו מנהלים לפי החיפוש.' : 'אין משתמשים עם תפקיד מנהל במערכת.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(admin => (
            <Card key={admin.id || admin.uid} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {admin.profile_image_url ? (
                      <img
                        src={admin.profile_image_url}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover border-2 border-amber-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center border-2 border-amber-200">
                        <UserIcon className="w-6 h-6 text-amber-600" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800">
                          {admin.name || admin.full_name || 'חסר שם'}
                        </p>
                        <Badge className="bg-amber-100 text-amber-800 border border-amber-200">
                          <Key className="w-3 h-3 ms-1" />מנהל
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                        <Mail className="w-3.5 h-3.5" />
                        {admin.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-amber-700 border-amber-300 hover:bg-amber-50"
                    onClick={() => handleDowngrade(admin)}
                    disabled={downgradingId === (admin.uid || admin.id)}
                  >
                    {downgradingId === (admin.uid || admin.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin ms-1" />
                    ) : (
                      <UserMinus className="w-3.5 h-3.5 ms-1" />
                    )}
                    הסר תפקיד
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden" dir="rtl">
          <DialogHeader className="text-right ps-8">
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-amber-600" />
              הוספת מנהל מערכת
            </DialogTitle>
            <DialogDescription>חפש משתמש והגדר אותו כמנהל — יוכל לראות את כל המשתמשים וההגדרות</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="relative">
              <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="חפש לפי שם או אימייל..."
                value={addDialogSearchTerm}
                onChange={(e) => setAddDialogSearchTerm(e.target.value)}
                className="pe-10"
              />
            </div>
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {isLoadingAddUsers && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  </div>
                )}
                {!isLoadingAddUsers && addDialogFiltered.length === 0 && (
                  <p className="text-center py-4 text-slate-500 text-sm">
                    {addDialogSearchTerm.trim() ? 'לא נמצאו משתמשים לפי החיפוש.' : 'אין משתמשים זמינים להגדרה כמנהל (כולם כבר מנהלים).'}
                  </p>
                )}
                {!isLoadingAddUsers && addDialogFiltered.map((u) => (
                  <div
                    key={u.id || u.uid}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      {u.profile_image_url ? (
                        <img src={u.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{u.name || u.full_name || 'חסר שם'}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                        {(u.role || '').toLowerCase() === 'trainer' && (
                          <Badge variant="outline" className="text-xs mt-0.5">מאמן</Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2 bg-amber-600 hover:bg-amber-700"
                      onClick={() => handlePromoteToAdmin(u)}
                      disabled={promotingId === (u.uid || u.id)}
                    >
                      {promotingId === (u.uid || u.id) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Key className="w-3.5 h-3.5" />
                      )}
                      הגדר כמנהל
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
