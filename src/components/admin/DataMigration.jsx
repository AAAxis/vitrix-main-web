import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Database, Play } from 'lucide-react';
import { WeightEntry, Workout, CalorieTracking, WeeklyTask, ProgressPicture, MonthlyGoal } from '@/api/entities';

export default function DataMigration() {
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState([]);
    const [error, setError] = useState('');

    // Enhanced data migration script from the plan
    const fixOrphanedUserEmails = async (EntityClass, entityName) => {
        try {
            const records = await EntityClass.list();
            const orphanedRecords = records.filter(item => !item.user_email && item.created_by);
            
            let updated = 0;
            let failed = 0;

            for (const record of orphanedRecords) {
                try {
                    await EntityClass.update(record.id, { user_email: record.created_by });
                    updated++;
                    console.log(`עודכן: ${record.id} ← ${record.created_by}`);
                } catch (error) {
                    failed++;
                    console.error(`נכשל: ${record.id}`, error);
                }
            }

            return {
                entityName,
                total: orphanedRecords.length,
                updated,
                failed,
                status: failed === 0 ? 'success' : 'partial'
            };
        } catch (error) {
            return {
                entityName,
                total: 0,
                updated: 0,
                failed: 0,
                status: 'error',
                error: error.message
            };
        }
    };

    const runDataMigration = async () => {
        setIsRunning(true);
        setResults([]);
        setError('');

        try {
            const entities = [
                { class: WeightEntry, name: 'WeightEntry' },
                { class: Workout, name: 'Workout' },
                { class: CalorieTracking, name: 'CalorieTracking' },
                { class: WeeklyTask, name: 'WeeklyTask' },
                { class: ProgressPicture, name: 'ProgressPicture' },
                { class: MonthlyGoal, name: 'MonthlyGoal' }
            ];

            const migrationResults = [];
            
            for (const entity of entities) {
                const result = await fixOrphanedUserEmails(entity.class, entity.name);
                migrationResults.push(result);
            }

            setResults(migrationResults);
            
        } catch (error) {
            setError(`שגיאה כללית במיגרציה: ${error.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const getTotalStats = () => {
        return results.reduce((acc, result) => ({
            total: acc.total + result.total,
            updated: acc.updated + result.updated,
            failed: acc.failed + result.failed
        }), { total: 0, updated: 0, failed: 0 });
    };

    const stats = getTotalStats();

    return (
        <Card className="muscle-glass border-0 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                    <Database className="w-6 h-6 text-blue-600" />
                    מיגרציית נתונים - איחוד user_email
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                            <h4 className="font-semibold text-amber-800">אזהרה - פעולה בלתי הפיכה</h4>
                            <p className="text-sm text-amber-700 mt-1">
                                פעולה זו תעדכן את כל הרשומות הקיימות ותאחד את השדות user_email ו-created_by.
                                וודא שיש לך גיבוי לפני ביצוע המיגרציה.
                            </p>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={runDataMigration}
                    disabled={isRunning}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {isRunning ? (
                        <>
                            <Play className="w-4 h-4 mr-2 animate-spin" />
                            מבצע מיגרציה...
                        </>
                    ) : (
                        <>
                            <Play className="w-4 h-4 mr-2" />
                            הרץ מיגרציית נתונים
                        </>
                    )}
                </Button>

                {error && (
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                        <p className="text-red-700 text-sm">{error}</p>
                    </div>
                )}

                {results.length > 0 && (
                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-slate-800 mb-2">סיכום כללי</h4>
                            <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                                    <div className="text-sm text-slate-600">סה"כ רשומות</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-green-600">{stats.updated}</div>
                                    <div className="text-sm text-slate-600">עודכנו בהצלחה</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                                    <div className="text-sm text-slate-600">נכשלו</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-semibold text-slate-800">פירוט לפי ишות</h4>
                            {results.map((result, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">{result.entityName}</span>
                                        <Badge variant={result.status === 'success' ? 'default' : result.status === 'partial' ? 'secondary' : 'destructive'}>
                                            {result.status === 'success' ? 'הושלם' : result.status === 'partial' ? 'חלקי' : 'שגיאה'}
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-slate-600">
                                        {result.updated}/{result.total} עודכנו
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}