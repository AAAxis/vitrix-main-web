import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCheck, UserX } from 'lucide-react';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [updatingUserId, setUpdatingUserId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const allUsers = await User.list();
            const currentUser = await User.me();
            setUsers(allUsers.filter(u => u.email !== currentUser.email));
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (user, newStatus) => {
        setUpdatingUserId(user.id);
        try {
            await User.update(user.id, { status: newStatus });
            setUsers(prevUsers => 
                prevUsers.map(u => u.id === user.id ? { ...u, status: newStatus } : u)
            );
        } catch (error) {
            console.error(`Error updating status for user ${user.id}:`, error);
        } finally {
            setUpdatingUserId(null);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center p-4"><Loader2 className="w-6 h-6 animate-spin text-purple-600" /></div>;
    }

    return (
        <div className="space-y-4">
            {users.length === 0 ? (
                <p className="text-sm text-slate-500 text-center">לא נמצאו משתמשים לניהול.</p>
            ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pe-2">
                    {users.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div>
                                <p className="font-semibold text-slate-800">{user.name || user.email}</p>
                                <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                {updatingUserId === user.id ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Badge variant={user.status === 'פעיל' ? 'default' : 'destructive'} className={`${user.status === 'פעיל' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} border-none`}>
                                            {user.status === 'פעיל' ? <UserCheck className="w-3 h-3 me-1" /> : <UserX className="w-3 h-3 me-1" />}
                                            {user.status}
                                        </Badge>
                                        <Switch
                                            checked={user.status === 'פעיל'}
                                            onCheckedChange={(isChecked) => handleStatusChange(user, isChecked ? 'פעיל' : 'מוקפא')}
                                            aria-label={`Switch status for ${user.name}`}
                                        />
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}