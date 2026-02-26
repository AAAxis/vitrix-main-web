import React, { useState, useEffect } from 'react';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User as UserIcon, Camera, Save, Loader2, Trash2, AlertTriangle, Building2, ImageIcon } from 'lucide-react';
import { User } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

export default function AdminProfileScreen() {
  const { user: contextUser, refreshUser } = useAdminDashboard();
  const [user, setUser] = useState(contextUser || null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    organization_name: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingOrgLogo, setIsUploadingOrgLogo] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = React.useRef(null);
  const orgLogoInputRef = React.useRef(null);

  useEffect(() => {
    if (contextUser) {
      setUser(contextUser);
      setForm({
        name: contextUser.name || '',
        email: contextUser.email || '',
        phone: contextUser.phone || contextUser.coach_phone || '',
        organization_name: contextUser.organization_name || '',
      });
    }
  }, [contextUser]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
    if (message.text) setMessage({ type: '', text: '' });
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const updateData = {
        name: form.name.trim(),
        email: form.email.trim(),
      };
      if (form.phone !== undefined) updateData.phone = form.phone.trim();
      if (user?.coach_phone !== undefined) updateData.coach_phone = form.phone.trim();
      if (form.organization_name !== undefined) updateData.organization_name = form.organization_name.trim();
      const updated = await User.updateMyUserData(updateData);
      setUser((prev) => ({ ...prev, ...updated }));
      setMessage({ type: 'success', text: 'הפרופיל עודכן בהצלחה.' });
      if (refreshUser) refreshUser();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'שגיאה בשמירת הפרופיל. אנא נסה שוב.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingImage(true);
    setMessage({ type: '', text: '' });
    try {
      const { file_url } = await UploadFile({ file });
      await User.updateMyUserData({ profile_image_url: file_url });
      setUser((prev) => ({ ...prev, profile_image_url: file_url }));
      setMessage({ type: 'success', text: 'תמונת הפרופיל עודכנה.' });
      if (refreshUser) refreshUser();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error uploading image:', error);
      setMessage({ type: 'error', text: 'שגיאה בהעלאת התמונה.' });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOrgLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingOrgLogo(true);
    setMessage({ type: '', text: '' });
    try {
      const { file_url } = await UploadFile({ file, path: 'organization-logos' });
      await User.updateMyUserData({ organization_logo_url: file_url });
      setUser((prev) => ({ ...prev, organization_logo_url: file_url }));
      setMessage({ type: 'success', text: 'לוגו הארגון עודכן.' });
      if (refreshUser) refreshUser();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error uploading organization logo:', error);
      setMessage({ type: 'error', text: 'שגיאה בהעלאת לוגו הארגון.' });
    } finally {
      setIsUploadingOrgLogo(false);
      if (orgLogoInputRef.current) orgLogoInputRef.current.value = '';
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmEmail !== (user?.email || '')) {
      setMessage({ type: 'error', text: 'יש להזין את כתובת המייל בדיוק לאישור המחיקה.' });
      return;
    }
    setIsDeleting(true);
    setMessage({ type: '', text: '' });
    try {
      await User.deleteCurrentUser();
      setDeleteDialogOpen(false);
      setDeleteConfirmEmail('');
    } catch (error) {
      console.error('Error deleting account:', error);
      const msg = error.code === 'auth/requires-recent-login'
        ? 'נדרשת התחברות מחדש לפני מחיקת החשבון. אנא התנתק והתחבר שוב ונסה שוב.'
        : error.message || 'שגיאה במחיקת החשבון. אנא נסה שוב.';
      setMessage({ type: 'error', text: msg });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">הפרופיל שלי</h1>
        <p className="text-slate-600 mt-1">עריכת פרטים ומחיקת חשבון</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="w-5 h-5" />
            פרטים אישיים
          </CardTitle>
          <CardDescription>עדכן את השם, האימייל והטלפון שלך</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <div
                className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200 cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {user.profile_image_url ? (
                  <img
                    src={user.profile_image_url}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-12 h-12 text-slate-400" />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                  {isUploadingImage ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : (
                    <Camera className="w-8 h-8 text-white" />
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploadingImage}
              />
            </div>
            <div className="flex-1 w-full space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">שם מלא</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="השם שלך"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">אימייל</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="your@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">טלפון</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  disabled={isSaving}
                  placeholder="050-0000000"
                />
              </div>
            </div>
          </div>

          {message.text && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                שומר...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 ms-2" />
                שמור שינויים
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            ארגון
          </CardTitle>
          <CardDescription>שם הארגון או הסטודיו ולוגו להצגה במערכת</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="organization_name">שם הארגון</Label>
            <Input
              id="organization_name"
              value={form.organization_name}
              onChange={handleChange}
              disabled={isSaving}
              placeholder="שם הארגון / הסטודיו"
            />
          </div>
          <div className="space-y-2">
            <Label>לוגו ארגון</Label>
            <div className="flex items-center gap-4">
              <div
                className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-emerald-300 transition-colors"
                onClick={() => orgLogoInputRef.current?.click()}
              >
                {user.organization_logo_url ? (
                  <img
                    src={user.organization_logo_url}
                    alt="לוגו ארגון"
                    className="w-full h-full object-contain p-1"
                  />
                ) : (
                  <ImageIcon className="w-12 h-12 text-slate-400" />
                )}
              </div>
              <div>
                <input
                  ref={orgLogoInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleOrgLogoUpload}
                  disabled={isUploadingOrgLogo}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => orgLogoInputRef.current?.click()}
                  disabled={isUploadingOrgLogo}
                >
                  {isUploadingOrgLogo ? (
                    <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 ms-2" />
                  )}
                  {isUploadingOrgLogo ? 'מעלה...' : 'העלה לוגו לארגון'}
                </Button>
              </div>
            </div>
          </div>
          <p className="text-sm text-slate-500">לחץ על הלוגו או על הכפתור להעלאת תמונה. השם יישמר בלחיצה על &quot;שמור שינויים&quot;.</p>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            אזור מסוכן
          </CardTitle>
          <CardDescription>
            מחיקת החשבון היא בלתי הפיכה. כל הנתונים יימחקו לצמיתות.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            className="border-red-300 text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4 ms-2" />
            מחק את החשבון שלי
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              מחיקת חשבון
            </DialogTitle>
            <DialogDescription>
              פעולה זו תמחק את החשבון ואת כל הנתונים לצמיתות. להמשך, הקלד את כתובת המייל שלך לאישור:{' '}
              <strong>{user.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-confirm-email">אימייל לאישור</Label>
            <Input
              id="delete-confirm-email"
              type="email"
              value={deleteConfirmEmail}
              onChange={(e) => setDeleteConfirmEmail(e.target.value)}
              placeholder={user.email}
              disabled={isDeleting}
              className="border-red-200 focus-visible:ring-red-500"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteConfirmEmail('');
              }}
              disabled={isDeleting}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting || deleteConfirmEmail !== user.email}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 ms-2 animate-spin" />
                  מוחק...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 ms-2" />
                  מחק חשבון לצמיתות
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
