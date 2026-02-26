import React, { useState, useEffect } from 'react';
import { User, CoachMessage, UserGroup } from '@/api/entities';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';
import { groupsForStaff } from '@/lib/groupUtils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Users, User as UserIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function CoachMessenger() {
    const { user: currentUser, isSystemAdmin } = useAdminDashboard();
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [sendTo, setSendTo] = useState('individual'); // Fixed: properly defined
    const [selectedUserEmail, setSelectedUserEmail] = useState('');
    const [selectedGroupName, setSelectedGroupName] = useState('');
    const [messageText, setMessageText] = useState(''); // Fixed: consistent naming
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [allUsers, allGroups] = await Promise.all([User.list(), UserGroup.list()]);
                setUsers(allUsers);
                setGroups(groupsForStaff(allGroups || [], currentUser, isSystemAdmin));
            } catch (error) {
                console.error('Error fetching data:', error);
                setStatus('שגיאה בטעינת הנתונים.');
            }
        };
        fetchData();
    }, []);

    const handleSendMessage = async () => {
        // Data Integrity Fix: Validate inputs before proceeding
        if (!messageText.trim()) {
            setStatus('נא להזין תוכן הודעה.');
            return;
        }

        if (sendTo === 'individual' && !selectedUserEmail) {
            setStatus('יש לבחור מתאמן.');
            return;
        }

        if (sendTo === 'group' && !selectedGroupName) {
            setStatus('יש לבחור קבוצה.');
            return;
        }

        setIsLoading(true);
        setStatus('');

        try {
            let targetEmails = [];
            
            if (sendTo === 'all') {
                const validUsers = users.filter(user => user.email);
                if (validUsers.length === 0) {
                    throw new Error('לא נמצאו מתאמנים תקינים במערכת');
                }
                targetEmails = validUsers.map(user => user.email);
                
            } else if (sendTo === 'individual') {
                const selectedUser = users.find(u => u.email === selectedUserEmail);
                if (!selectedUser || !selectedUser.email) {
                    throw new Error('המתאמן הנבחר אינו תקין');
                }
                targetEmails = [selectedUserEmail];
                
            } else if (sendTo === 'group') {
                const groupUsers = users.filter(u => u.group_name === selectedGroupName && u.email);
                if (groupUsers.length === 0) {
                    throw new Error(`לא נמצאו מתאמנים תקינים בקבוצת "${selectedGroupName}"`);
                }
                targetEmails = groupUsers.map(u => u.email);
            }

            if (targetEmails.length === 0) {
                throw new Error('לא נמצאו נמענים תקינים לשליחה');
            }

            const messagePromises = targetEmails.map(email => {
                return CoachMessage.create({
                    user_email: email,
                    message_text: messageText.trim()
                });
            });

            const results = await Promise.allSettled(messagePromises);
            
            const successCount = results.filter(result => result.status === 'fulfilled').length;
            const failureCount = results.filter(result => result.status === 'rejected').length;
            
            if (successCount === targetEmails.length) {
                setStatus(`ההודעה נשלחה בהצלחה ל-${successCount} מתאמנים! 🎉`);
            } else if (successCount > 0) {
                setStatus(`ההודעה נשלחה ל-${successCount} מתאמנים. ${failureCount} שליחות נכשלו.`);
            } else {
                throw new Error('כל השליחות נכשלו');
            }

            setMessageText('');
            setSendTo('individual');
            setSelectedUserEmail('');
            setSelectedGroupName('');

        } catch (error) {
            console.error('Error sending messages:', error);
            setStatus(error.message.includes('network') ? 
                'בעיית תקשורת. בדוק את החיבור לאינטרנט ונסה שוב.' : 
                `שגיאה בשליחת ההודעה: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            <RadioGroup value={sendTo} onValueChange={setSendTo} className="flex gap-4">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="individual" id="r1" />
                    <Label htmlFor="r1">למתאמן יחיד</Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="group" id="r2" />
                    <Label htmlFor="r2">לקבוצה</Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <RadioGroupItem value="all" id="r3" />
                    <Label htmlFor="r3">לכל המתאמנים</Label>
                </div>
            </RadioGroup>

            {sendTo === 'individual' && (
                <div className="space-y-2">
                    <Label htmlFor="user-select">בחר מתאמן</Label>
                    <Select onValueChange={setSelectedUserEmail} value={selectedUserEmail}>
                        <SelectTrigger id="user-select">
                            <SelectValue placeholder="בחר מתאמן..." />
                        </SelectTrigger>
                        <SelectContent>
                            {users.map(user => (
                                <SelectItem key={user.id} value={user.email}>
                                    {user.name || user.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {sendTo === 'group' && (
                <div className="space-y-2">
                    <Label htmlFor="group-select">בחר קבוצה</Label>
                    <Select onValueChange={setSelectedGroupName} value={selectedGroupName}>
                        <SelectTrigger id="group-select">
                            <SelectValue placeholder="בחר קבוצה..." />
                        </SelectTrigger>
                        <SelectContent>
                            {groups.map(group => (
                                <SelectItem key={group.id} value={group.name}>
                                    {group.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            
            <div className="space-y-2">
                <Label htmlFor="message-text">תוכן ההודעה</Label>
                <Textarea 
                    id="message-text" 
                    value={messageText} 
                    onChange={(e) => setMessageText(e.target.value)} 
                    placeholder="כתוב הודעה..." 
                    className="h-24"
                />
            </div>

            <div className="flex items-center justify-between mt-4">
                <Button onClick={handleSendMessage} disabled={isLoading}>
                    {isLoading ? (
                        <>
                            <Loader2 className="ms-2 h-4 w-4 animate-spin" /> 
                            שולח...
                        </>
                    ) : (
                        <>
                            <Send className="ms-2 h-4 w-4" /> 
                            שלח
                        </>
                    )}
                </Button>
                {status && (
                    <p className={`text-sm ${status.includes('שגיאה') ? 'text-red-600' : 'text-green-600'}`}>
                        {status}
                    </p>
                )}
            </div>
        </div>
    );
}