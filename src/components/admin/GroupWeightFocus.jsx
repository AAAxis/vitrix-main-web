
import React, { useState, useEffect, useMemo } from 'react';
import { WeightEntry, User, UserGroup } from '@/api/entities';
import { useAdminDashboard } from '@/contexts/AdminDashboardContext';
import { groupsForStaff } from '@/lib/groupUtils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Minus, Users, Scale, MoveLeft } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { orderBy } from 'lodash';

export default function GroupWeightFocus() {
    const { user: currentUser, isSystemAdmin } = useAdminDashboard();
    const [allUsers, setAllUsers] = useState([]);
    const [allGroups, setAllGroups] = useState([]);
    const [allWeightEntries, setAllWeightEntries] = useState([]);
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [users, groups, weightEntries] = await Promise.all([
                    User.filter({ role: 'user' }),
                    UserGroup.list(),
                    WeightEntry.list('date')
                ]);

                setAllUsers(users);
                setAllGroups(groupsForStaff(groups || [], currentUser, isSystemAdmin));
                setAllWeightEntries(weightEntries || []);
            } catch (err) {
                console.error("Failed to load group weight data:", err);
                setError('שגיאה בטעינת נתוני הקבוצה.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [currentUser, isSystemAdmin]);

    const filteredUsers = useMemo(() => {
        let users = selectedGroup === 'all' ? allUsers : allUsers.filter(user => 
            user.group_names && user.group_names.includes(selectedGroup)
        );
        
        // רק משתמשים עם משקל התחלתי תקין
        return users.filter(user => 
            typeof user.initial_weight === 'number' && 
            !isNaN(user.initial_weight) && 
            user.initial_weight > 0
        );
    }, [allUsers, selectedGroup]);

    const chartData = useMemo(() => {
        if (!filteredUsers.length) return [];
    
        const userEmailsInGroup = new Set(filteredUsers.map(u => u.email));
    
        // Get initial weights for users with valid initial weight only
        const initialWeights = new Map();
        let totalInitialWeight = 0;
        filteredUsers.forEach(user => {
            initialWeights.set(user.email, user.initial_weight);
            totalInitialWeight += user.initial_weight;
        });
    
        // Filter weight entries only for users with initial weight AND only from 03/07/25 onwards
        const startDate = new Date('2025-07-03');
        const groupWeightEntries = allWeightEntries
            .filter(entry => 
                userEmailsInGroup.has(entry.user_email) && 
                entry.date && 
                typeof entry.weight === 'number' && 
                !isNaN(entry.weight) &&
                new Date(entry.date) >= startDate // Only entries from 03/07/25 onwards
            )
            .sort((a, b) => new Date(a.date) - new Date(b.date));
    
        // Get unique dates from the valid entries (only from 03/07/25 onwards)
        const uniqueDates = [...new Set(groupWeightEntries.map(e => format(parseISO(e.date), 'yyyy-MM-dd')))].sort();
    
        // Calculate progress over time
        const latestKnownWeights = new Map(initialWeights);
        const dataForChart = [];
        
        // Add starting point (03/07/25) with initial total weight
        if (totalInitialWeight > 0) {
            dataForChart.push({
                date: '03/07',
                fullDate: '2025-07-03',
                totalWeight: parseFloat(totalInitialWeight.toFixed(1)),
            });
        }
    
        uniqueDates.forEach(dateStr => {
            // Skip if this date is the same as our start date
            if (dateStr === '2025-07-03') return;
            
            // Find all entries for the current date
            const entriesForThisDate = groupWeightEntries.filter(entry => format(parseISO(entry.date), 'yyyy-MM-dd') === dateStr);
            
            // Update latest known weights with entries from this date
            entriesForThisDate.forEach(entry => {
                latestKnownWeights.set(entry.user_email, entry.weight);
            });
    
            // Calculate the total sum - only for users with initial weight
            let currentTotalWeight = 0;
            for (const user of filteredUsers) {
                if (latestKnownWeights.has(user.email)) {
                    currentTotalWeight += latestKnownWeights.get(user.email);
                }
            }
            
            dataForChart.push({
                date: format(parseISO(dateStr), 'dd/MM', { locale: he }),
                fullDate: dateStr,
                totalWeight: parseFloat(currentTotalWeight.toFixed(1)),
            });
        });
    
        return dataForChart.sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));
    
    }, [filteredUsers, allWeightEntries]);

    const summaryData = useMemo(() => {
        const startDate = new Date('2025-07-03');
        
        return filteredUsers.map(user => {
            // Only consider weight entries from 03/07/25 onwards
            const userEntries = orderBy(
                allWeightEntries.filter(e => 
                    e.user_email === user.email && 
                    e.date && 
                    typeof e.weight === 'number' &&
                    new Date(e.date) >= startDate // Only entries from 03/07/25 onwards
                ),
                ['date'],
                ['desc']
            );
            
            const startWeight = user.initial_weight;
            const currentWeight = userEntries.length > 0 ? userEntries[0].weight : startWeight;
            const change = (currentWeight - startWeight).toFixed(1);
            
            return {
                id: user.id,
                name: user.name,
                startWeight,
                currentWeight,
                change
            };
        }).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredUsers, allWeightEntries]);

    const groupSummary = useMemo(() => {
        if (!summaryData.length) return null;

        const totalStartWeight = summaryData.reduce((sum, u) => sum + u.startWeight, 0);
        const totalCurrentWeight = summaryData.reduce((sum, u) => sum + u.currentWeight, 0);
        const totalChange = totalCurrentWeight - totalStartWeight;

        return {
            userCount: summaryData.length,
            totalStartWeight: totalStartWeight.toFixed(1),
            totalCurrentWeight: totalCurrentWeight.toFixed(1),
            totalChange: totalChange.toFixed(1)
        };
    }, [summaryData]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return <div className="text-center text-red-500 p-8">{error}</div>;
    }

    return (
        <div className="space-y-6" dir="rtl">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        בחירת קבוצה
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                        <SelectTrigger className="w-full max-w-sm">
                            <SelectValue placeholder="בחר קבוצה" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">כל המתאמנים</SelectItem>
                            {allGroups.map(group => (
                                <SelectItem key={group.id} value={group.name}>
                                    {group.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {groupSummary && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">מתאמנים בקבוצה</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{groupSummary.userCount}</div>
                            <p className="text-xs text-muted-foreground">
                                מתאמנים עם נתוני משקל תקינים
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>סיכום התקדמות משקל כולל</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap items-center justify-around text-center gap-4">
                            <div>
                                <p className="text-sm text-slate-600 mb-1">סכום התחלתי</p>
                                <p className="text-2xl font-bold text-purple-600">{groupSummary.totalStartWeight} ק"ג</p>
                            </div>
                            <MoveLeft className="w-8 h-8 text-slate-400" />
                            <div>
                                <p className="text-sm text-slate-600 mb-1">סכום נוכחי</p>
                                <p className="text-2xl font-bold text-green-600">{groupSummary.totalCurrentWeight} ק"ג</p>
                            </div>
                            <div className="border-e border-slate-200 h-16 mx-2 hidden md:block"></div>
                            <div>
                                <p className="text-sm text-slate-600 mb-1">שינוי כולל</p>
                                <div className={`text-2xl font-bold flex items-center gap-2 justify-center ${
                                    parseFloat(groupSummary.totalChange) < 0 ? 'text-green-600' : 
                                    parseFloat(groupSummary.totalChange) > 0 ? 'text-red-600' : 'text-slate-600'
                                }`}>
                                    {parseFloat(groupSummary.totalChange) < 0 ? 
                                        <TrendingDown className="w-6 h-6" /> : 
                                        parseFloat(groupSummary.totalChange) > 0 ? 
                                        <TrendingUp className="w-6 h-6" /> : 
                                        <Minus className="w-6 h-6" />
                                    }
                                    <span>{groupSummary.totalChange > 0 ? '+' : ''}{groupSummary.totalChange} ק"ג</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>גרף התקדמות כולל</CardTitle>
                    <CardDescription>
                        סכום המשקל הכולל לאורך זמן עבור {selectedGroup === 'all' ? 'כל המתאמנים' : `קבוצת ${selectedGroup}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {chartData.length > 1 ? (
                        <div className="h-96 -mx-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart 
                                    data={chartData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis 
                                        label={{ value: 'סכום משקל (ק"ג)', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip 
                                        contentStyle={{ direction: 'rtl' }}
                                        formatter={(value, name) => {
                                            if (name === 'totalWeight') return [`${value} ק"ג`, 'סכום משקל כולל'];
                                            return [value, name];
                                        }}
                                    />
                                    <Legend 
                                        formatter={(value) => {
                                            if (value === 'totalWeight') return 'סכום משקל כולל';
                                            return value;
                                        }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="totalWeight" 
                                        stroke="#3b82f6" 
                                        strokeWidth={3}
                                        name="totalWeight"
                                        dot={{ fill: '#3b82f6', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-500">
                            <Scale className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>אין מספיק נתונים להצגת גרף התקדמות.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>סיכום התקדמות אישי</CardTitle>
                    <CardDescription>
                        השוואת משקל התחלתי מור נוכחי עבור {selectedGroup === 'all' ? 'כל המתאמנים' : `קבוצת ${selectedGroup}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {summaryData.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">שם המתאמן</TableHead>
                                    <TableHead className="text-right">משקל התחלתי</TableHead>
                                    <TableHead className="text-right">משקל נוכחי</TableHead>
                                    <TableHead className="text-right">שינוי (ק"ג)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {summaryData.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium text-right">{user.name}</TableCell>
                                        <TableCell className="text-right">{user.startWeight} ק"ג</TableCell>
                                        <TableCell className="text-right">{user.currentWeight} ק"ג</TableCell>
                                        <TableCell className="text-right">
                                            <span className={`flex items-center justify-end gap-1 font-semibold ${
                                                parseFloat(user.change) > 0 ? 'text-red-600' : 
                                                parseFloat(user.change) < 0 ? 'text-green-600' : 'text-slate-600'
                                            }`}>
                                                {parseFloat(user.change) > 0 ? <TrendingUp className="w-4 h-4" /> : 
                                                 parseFloat(user.change) < 0 ? <TrendingDown className="w-4 h-4" /> : 
                                                 <Minus className="w-4 h-4" />}
                                                {parseFloat(user.change) > 0 ? `+${user.change}` : user.change} ק"ג
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center text-slate-500 py-8">
                            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>אין מתאמנים בקבוצה הנבחרת עם נתוני משקל תקינים</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
