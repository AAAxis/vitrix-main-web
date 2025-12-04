
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { User as UserIcon, LogOut, Menu, Users, BarChart, Dumbbell, ChevronLeft, Settings, LayoutDashboard, Image } from 'lucide-react';
import AdminDashboard from '../../pages/AdminDashboard';
import { User } from '@/api/entities';
import TerminationFeedbackViewer from '../admin/TerminationFeedbackViewer'; // Added import

export default function TrainerInterface({ user }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState('control-center');
  const [navigateToTab, setNavigateToTab] = useState(null);

  const adminMenuItems = [
    { id: 'control-center', label: 'מרכז שליטה', icon: LayoutDashboard },
    { id: 'user-management', label: 'ניהול משתמשים', icon: Users },
    { id: 'progress-media', label: 'שיתוף ומדיה', icon: Image }, // Updated label and icon
    { id: 'workout-creator', label: 'יוצר אימונים', icon: Dumbbell },
    { id: 'programs', label: 'תוכניות והגדרות', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await User.logout();
    } catch (error) {
      console.error('Logout error:', error);
      alert('שגיאה בהתנתקות. אנא נסה שוב.');
    }
  };

  const handleMenuItemClick = (tabId) => {
    setActiveAdminTab(tabId);
    setIsMenuOpen(false);
  };

  const handleLogoClick = () => {
    setIsMenuOpen(false);
    // Navigate to programs tab with user-settings sub-tab
    if (navigateToTab) {
      navigateToTab('programs', 'user-settings');
    } else {
      setActiveAdminTab('programs');
    }
  };

  // --- Sidebar Component for reuse ---
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-emerald-500 to-teal-500 text-white" dir="rtl">
      <div className="p-6 border-b border-emerald-400">
        <div className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity" onClick={handleLogoClick}>
          {user?.profile_image_url ? (
            <img 
              src={user.profile_image_url}
              alt={user?.name || 'מאמן'}
              className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center border-2 border-white/30">
              <UserIcon className="w-6 h-6" />
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold drop-shadow-sm">{user?.name || 'מאמן'}</h1>
            <p className="text-emerald-100 text-sm">ממשק ניהול מאמנים</p>
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
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-right transition-all duration-200 font-medium ${
                isActive 
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

      <div className="p-6 border-t border-emerald-400">
        <Button 
          onClick={handleLogout} 
          variant="ghost" 
          className="w-full text-white hover:bg-white/20 border border-white/30"
        >
          <LogOut className="w-4 h-4 ml-2" />
          התנתק
        </Button>
      </div>
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
          <AdminDashboard 
            activeTab={activeAdminTab} 
            setActiveTab={setActiveAdminTab} 
            hideNavigation={true}
            onNavigateToTab={setNavigateToTab}
          />
        </main>
      </div>
    </div>
  );
}
