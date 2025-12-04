
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Home, BookOpen, TrendingUp, Dumbbell, Utensils } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';

const navItems = [
    { href: 'Home', icon: Home, label: 'דף הבית' },
    { href: 'Progress', icon: TrendingUp, label: 'בוסטר' },
    { href: 'Recipes', icon: Utensils, label: 'מתכונים' },
    { href: 'ExercisesSetup', icon: Dumbbell, label: 'אימונים' },
    { href: 'Journal', icon: BookOpen, label: 'יומן אימונים' },
];

const NavLink = ({ href, icon: Icon, label, pathname, onNavigate }) => {
    const pageUrl = createPageUrl(href);
    const isActive = pathname === pageUrl;
    const commonClasses = "flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200";
    const activeClasses = "bg-emerald-500 text-white font-bold shadow-lg";
    const inactiveClasses = "text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800";

    return (
        <Link to={pageUrl} className={`${commonClasses} ${isActive ? activeClasses : inactiveClasses}`} onClick={onNavigate}>
            <Icon className="h-5 w-5" />
            <span>{label}</span>
        </Link>
    );
};

export default function TraineeInterface({ children, currentPageName }) {
    const location = useLocation();
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    return (
        <div className="grid min-h-screen w-full md:grid-cols-[1fr_220px] lg:grid-cols-[1fr_280px]" dir="rtl">
            <div className="flex flex-col">
                {/* Mobile Header */}
                <header className="flex h-16 items-center gap-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 backdrop-blur-sm px-6 sticky top-0 z-30 md:hidden">
                    <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                        <SheetTrigger asChild>
                            <Button variant="outline" size="icon" className="shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">פתח תפריט ניווט</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="flex flex-col bg-gradient-to-b from-emerald-50 to-teal-50" dir="rtl">
                            <nav className="grid gap-4 text-lg font-medium mt-4">
                                <Link to={createPageUrl('Home')} className="flex items-center gap-4 px-2.5 text-emerald-800 mb-4 font-bold" onClick={() => setIsSheetOpen(false)}>
                                    <img src="/logo.jpeg" alt="Logo" className="h-8 w-8" />
                                    <span>Vitrix</span>
                                </Link>
                                {navItems.map(item => (
                                     <NavLink key={item.href} {...item} pathname={location.pathname} onNavigate={() => setIsSheetOpen(false)} />
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <div className="flex-1">
                        {/* Title removed from mobile header */}
                    </div>
                </header>
                <main className="flex-1 bg-gradient-to-br from-slate-50 via-green-50 to-lime-50 p-4 sm:p-6">
                    {children}
                </main>
            </div>
             {/* Desktop Sidebar */}
            <aside className="hidden border-r bg-gradient-to-b from-emerald-50 to-teal-50 border-emerald-200 md:block">
                <div className="flex h-full max-h-screen flex-col gap-2 sticky top-0">
                    <div className="flex h-16 items-center border-b border-emerald-200 px-6 bg-white/50 backdrop-blur-sm">
                        <Link to={createPageUrl('Home')} className="flex items-center gap-2 font-semibold">
                            <img src="/logo.jpeg" alt="Logo" className="h-8 w-8" />
                            <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Vitrix</span>
                        </Link>
                    </div>
                    <nav className="flex-1 overflow-auto py-4 px-4 text-sm font-medium">
                        <ul className="space-y-2">
                            {navItems.map(item => (
                                <li key={item.href}>
                                    <NavLink {...item} pathname={location.pathname} />
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            </aside>
        </div>
    );
}
