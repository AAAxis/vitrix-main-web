
import React, { useState, useEffect, useMemo } from 'react';
import { NotificationResponse, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Loader2, ClipboardCheck, Search, Users, User as UserIcon } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { groupBy } from 'lodash';

const statusMapping = (userGender) => ({
    participating: { text: userGender === 'female' ? "מאשרת" : "מאשר", color: "bg-green-100 text-green-800" },
    not_participating: { text: userGender === 'female' ? "לא מאשרת" : "לא מאשר", color: "bg-red-100 text-red-800" },
    other: { text: "אחר", color: "bg-yellow-100 text-yellow-800" }
});

export default function NotificationStatusViewer() {
    const [responses, setResponses] = useState([]);
    const [users, setUsers] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [allResponses, allUsers] = await Promise.all([
                    NotificationResponse.list('-responded_at'),
                    User.list()
                ]);
                setResponses(allResponses);
                const usersMap = allUsers.reduce((acc, user) => {
                    acc[user.email] = user;
                    return acc;
                }, {});
                setUsers(usersMap);
            } catch (error) {
                console.error("Failed to load notification responses:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const groupedResponses = useMemo(() => {
        const filtered = responses.filter(r => 
            r.notification_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            r.user_name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        return groupBy(filtered, 'notification_id');
    }, [responses, searchTerm]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ClipboardCheck className="w-6 h-6 text-indigo-600" />
                        סטטוס תגובות להתראות
                    </CardTitle>
                    <CardDescription>
                        צפה בתגובות המשתמשים להתראות, תזכורות ואירועים.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="relative">
                        <Search className="absolute end-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input 
                            placeholder="חפש לפי כותרת התראה או שם משתמש..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pe-10"
                        />
                    </div>
                </CardContent>
            </Card>

            <ScrollArea className="h-[60vh]">
                <div className="space-y-4 pe-2">
                    {Object.keys(groupedResponses).length > 0 ? (
                        Object.entries(groupedResponses).map(([notificationId, responseGroup]) => (
                            <Card key={notificationId} className="shadow-md">
                                <CardHeader className="bg-slate-50 rounded-t-lg p-4">
                                    <CardTitle className="text-base font-semibold text-slate-800">{responseGroup[0].notification_title}</CardTitle>
                                    <div className="flex items-center text-sm text-slate-500 gap-2">
                                        <Users className="w-4 h-4" />
                                        <span>{responseGroup.length} תגובות</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 space-y-3">
                                    {responseGroup.map(response => {
                                        const user = users[response.user_email];
                                        const statusInfo = statusMapping(user?.gender)[response.response_status] || {};
                                        return (
                                            <div key={response.id} className="flex items-start gap-3 p-3 border rounded-md">
                                                {user?.profile_image_url ? (
                                                    <img src={user.profile_image_url} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                                                        <UserIcon className="w-5 h-5 text-slate-500" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold">{response.user_name}</span>
                                                        <Badge className={statusInfo.color}>{statusInfo.text}</Badge>
                                                    </div>
                                                    {response.response_details && (
                                                        <p className="text-sm text-slate-600 mt-1 p-2 bg-yellow-50 rounded">
                                                            <strong>פירוט:</strong> {response.response_details}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        {format(new Date(response.responded_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <ClipboardCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <h3 className="text-xl font-semibold">אין תגובות להציג</h3>
                            <p>כאשר משתמשים יגיבו להתראות, התגובות יופיעו כאן.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
