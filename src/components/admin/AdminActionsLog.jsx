
import React, { useState, useEffect } from 'react';
import { AdminActionLog } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { Shield, User, RotateCcw, Rocket, Users, FileText, Trash2 } from 'lucide-react';

const actionTypeIcons = {
    'admin_removal': <Shield className="w-4 h-4 text-yellow-600" />,
    'user_status_change': <User className="w-4 h-4 text-blue-600" />,
    'user_reset': <RotateCcw className="w-4 h-4 text-red-600" />,
    'user_deletion': <Trash2 className="w-4 h-4 text-red-700" />,
    'booster_management': <Rocket className="w-4 h-4 text-purple-600" />,
    'group_management': <Users className="w-4 h-4 text-green-600" />
};

const actionTypeLabels = {
    'admin_removal': 'הסרת הרשאות ניהול',
    'user_status_change': 'שינוי סטטוס משתמש',
    'user_reset': 'איפוס נתוני משתמש',
    'user_deletion': 'מחיקת משתמש',
    'booster_management': 'ניהול תוכנית בוסטר',
    'group_management': 'ניהול קבוצות'
};

const actionTypeColors = {
    'admin_removal': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'user_status_change': 'bg-blue-100 text-blue-800 border-blue-200',
    'user_reset': 'bg-red-100 text-red-800 border-red-200',
    'user_deletion': 'bg-red-200 text-red-900 border-red-300',
    'booster_management': 'bg-purple-100 text-purple-800 border-purple-200',
    'group_management': 'bg-green-100 text-green-800 border-green-200'
};

export default function AdminActionsLog() {
    const [logs, setLogs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadLogs();
    }, []);

    const loadLogs = async () => {
        setIsLoading(true);
        try {
            const adminLogs = await AdminActionLog.list('-created_date');
            setLogs(adminLogs || []);
            setError('');
        } catch (err) {
            console.error('Error loading admin logs:', err);
            setError('שגיאה בטעינת יומן הפעולות');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p>טוען יומן פעולות...</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-red-600">
                    <p>{error}</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    יומן פעולות מנהלים
                </CardTitle>
                <p className="text-sm text-slate-600">מעקב אחר כל הפעולות הניהוליות במערכת</p>
            </CardHeader>
            <CardContent>
                {logs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>אין פעולות רשומות</p>
                    </div>
                ) : (
                    <ScrollArea className="h-96 w-full">
                        <div className="space-y-3">
                            {logs.map((log) => (
                                <div key={log.id} className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            {actionTypeIcons[log.action_type]}
                                            <Badge className={actionTypeColors[log.action_type]}>
                                                {actionTypeLabels[log.action_type]}
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-slate-500">
                                            {format(parseISO(log.created_date), 'dd/MM/yyyy HH:mm', { locale: he })}
                                        </span>
                                    </div>
                                    
                                    <div className="text-sm text-slate-700 mb-2">
                                        <p><strong>מנהל מבצע:</strong> {log.admin_email}</p>
                                        <p><strong>משתמש מטרה:</strong> {log.target_user_email}</p>
                                        <p><strong>פרטי הפעולה:</strong> {log.action_details}</p>
                                    </div>
                                    
                                    {(log.previous_state || log.new_state) && (
                                        <div className="text-xs text-slate-600 bg-white p-2 rounded border">
                                            {log.previous_state && <p><strong>מצב קודם:</strong> {log.previous_state}</p>}
                                            {log.new_state && <p><strong>מצב חדש:</strong> {log.new_state}</p>}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
        </Card>
    );
}
