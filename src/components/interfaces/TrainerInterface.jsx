
import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { User as UserIcon, LogOut, Menu, Users, BarChart, Dumbbell, ChevronLeft, Settings, LayoutDashboard, Image, Camera, Loader2, X, ShieldCheck, Key } from 'lucide-react';
import AdminDashboard from '../../pages/AdminDashboard';
import AdminUserDetail from '../../pages/AdminUserDetail';
import { User } from '@/api/entities';
import { UploadFile } from '@/api/integrations';

const TAB_PATHS = {
  'control-center': '/control-center',
  'user-management': '/user-management/user-list',
  'admin-management': '/admin-management',
  'trainer-management': '/trainer-management',
  'progress-media': '/progress-media/notification-status',
  'workout-creator': '/workout-creator/send-workout',
  'programs': '/programs',
};

export default function TrainerInterface({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const basePath = pathname.startsWith('/trainer') ? '/trainer' : '/admin';

  const isSystemAdmin = user && (
    (user.role || '').toLowerCase() === 'admin' ||
    user.is_admin === true ||
    user.isAdmin === true ||
    user.admin === true ||
    (user.type || '').toLowerCase() === 'admin' ||
    (Array.isArray(user.permissions) && user.permissions.some(p => String(p || '').toLowerCase() === 'admin'))
  );

  const adminMenuItems = useMemo(() => {
    const all = [
      { id: 'control-center', label: 'מרכז שליטה', icon: LayoutDashboard },
      { id: 'user-management', label: 'ניהול משתמשים', icon: Users },
      { id: 'admin-management', label: 'מנהלים', icon: Key },
      { id: 'trainer-management', label: 'ניהול מאמנים', icon: ShieldCheck },
      { id: 'progress-media', label: 'שיתוף ומדיה', icon: Image },
      { id: 'workout-creator', label: 'יוצר אימונים', icon: Dumbbell },
      { id: 'programs', label: 'תוכניות והגדרות', icon: Settings },
    ];
    if (isSystemAdmin) return all;
    return all.filter(item => item.id !== 'admin-management' && item.id !== 'trainer-management');
  }, [isSystemAdmin]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [navigateToTab, setNavigateToTab] = useState(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [localUser, setLocalUser] = useState(user);
  const fileInputRef = React.useRef(null);

  const activeAdminTab = useMemo(() => {
    if (!pathname.startsWith('/admin') && !pathname.startsWith('/trainer')) return 'control-center';
    const pathAfterBase = pathname.slice(basePath.length) || '/';
    const segment = pathAfterBase.split('/').filter(Boolean)[0] || '';
    if (segment === 'control-center') return 'control-center';
    if (segment === 'user-management') return 'user-management';
    if (segment === 'admin-management') return 'admin-management';
    if (segment === 'trainer-management') return 'trainer-management';
    if (segment === 'progress-media') return 'progress-media';
    if (segment === 'workout-creator') return 'workout-creator';
    if (segment === 'programs') return 'programs';
    if (segment === 'profile') return 'profile';
    return 'control-center';
  }, [pathname, basePath]);

  const isUserDetailPath = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    if (basePath === '/admin' && parts.length >= 4) {
      return parts[0] === 'admin' && parts[1] === 'user-management' && parts[2] === 'user-list';
    }
    if (basePath === '/trainer' && parts.length >= 4) {
      return parts[0] === 'trainer' && parts[1] === 'user-management' && parts[2] === 'user-list';
    }
    return false;
  }, [pathname, basePath]);

  const userDetailEmail = useMemo(() => {
    if (!isUserDetailPath) return null;
    const parts = pathname.split('/').filter(Boolean);
    return parts[3] ? decodeURIComponent(parts[3]) : null;
  }, [isUserDetailPath, pathname]);

  const handleLogout = async () => {
    try {
      await User.logout();
    } catch (error) {
      console.error('Logout error:', error);
      alert('שגיאה בהתנתקות. אנא נסה שוב.');
    }
  };

  const handleMenuItemClick = (tabId) => {
    const path = TAB_PATHS[tabId];
    if (path) {
      navigate(`${basePath}${path}`, { replace: true });
    }
    setIsMenuOpen(false);
  };

  const handleLogoClick = () => {
    setIsMenuOpen(false);
    // Open settings drawer instead of navigating
    setIsSettingsDrawerOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const { file_url } = await UploadFile({ file });
      const updatedUser = await User.updateMyUserData({ profile_image_url: file_url });
      setLocalUser(updatedUser);
      // Refresh global user state if needed (InterfaceRouter should handle this but local state is faster)
    } catch (error) {
      console.error('Error uploading admin profile image:', error);
      alert('שגיאה בהעלאת התמונה. אנא נסה שוב.');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // --- Sidebar Component for reuse ---
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-emerald-500 to-teal-500 text-white" dir="rtl">
      <div className="p-6 border-b border-emerald-400">
        <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleLogoClick}>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30 flex-shrink-0">
            <UserIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold drop-shadow-sm">ממשק ניהול</h1>
            <p className="text-emerald-100 text-sm">מאמנים ומתאמנים</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2">
        {adminMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeAdminTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleMenuItemClick(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-right transition-all duration-200 font-medium ${isActive
                  ? 'bg-white text-emerald-700 shadow-lg'
                  : 'hover:bg-white/20'
                }`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.label}</span>
              </div>
              <ChevronLeft className="w-4 h-4" />
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex" dir="rtl">
      {/* --- Desktop Sidebar (Fixed on the Right) --- */}
      <aside className="hidden lg:block w-72 flex-shrink-0 shadow-2xl">
        <SidebarContent />
      </aside>

      {/* --- Main Content Area (Mobile and Desktop) --- */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between h-16 px-4" dir="rtl">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="w-6 h-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-72">
                <SidebarContent />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold text-slate-700">ניהול</h1>
            <div className="w-10"></div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6">
          {isUserDetailPath ? (
            <AdminUserDetail userEmailFromPath={userDetailEmail} />
          ) : (
            <AdminDashboard
              activeTab={activeAdminTab}
              hideNavigation={true}
              onNavigateToTab={setNavigateToTab}
            />
          )}
        </main>
      </div>

      {/* Settings Drawer */}
      <Drawer open={isSettingsDrawerOpen} onOpenChange={setIsSettingsDrawerOpen}>
        <DrawerContent dir="rtl">
          <DrawerClose asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 end-4 z-10 rounded-full h-9 w-9 text-slate-600 hover:bg-slate-100"
              aria-label="סגור"
            >
              <X className="w-5 h-5" />
            </Button>
          </DrawerClose>
          <DrawerHeader className="text-right pt-14">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative group cursor-pointer" onClick={triggerFileUpload}>
                {localUser?.profile_image_url ? (
                  <img
                    src={localUser.profile_image_url}
                    alt={localUser?.name || 'מאמן'}
                    className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 transition-opacity group-hover:opacity-70"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-500 group-hover:bg-emerald-200 transition-colors">
                    <UserIcon className="w-8 h-8 text-emerald-600" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {isUploadingImage ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isUploadingImage}
                />
              </div>
              <div>
                <DrawerTitle className="text-2xl">{localUser?.name || 'מאמן'}</DrawerTitle>
                <DrawerDescription className="text-base mt-1">
                  {localUser?.email || ''}
                </DrawerDescription>
              </div>
            </div>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start text-right"
              onClick={() => {
                setIsSettingsDrawerOpen(false);
                if (navigateToTab) {
                  navigateToTab('profile');
                } else {
                  navigate(`${basePath}/profile`, { replace: true });
                }
              }}
            >
              <UserIcon className="w-5 h-5 ms-3" />
              הפרופיל שלי
            </Button>
          </div>

          <DrawerFooter className="border-t pt-4">
            <Button
              variant="outline"
              className="w-full justify-start text-right text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 ms-3" />
              התנתק
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
