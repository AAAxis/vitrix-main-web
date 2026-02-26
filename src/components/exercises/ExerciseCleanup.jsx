import React, { useState } from 'react';
import { ExerciseDefinition } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ExerciseCleanup() {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const [duplicates, setDuplicates] = useState([]);
    const [cleanupResult, setCleanupResult] = useState(null);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState('');
    const COACH_PIN = '2206';

    const findDuplicates = async () => {
        setIsAnalyzing(true);
        setDuplicates([]);
        setCleanupResult(null);
        setPin(''); // Reset pin when starting a new analysis
        setPinError(''); // Clear any previous pin errors

        try {
            const allExercises = await ExerciseDefinition.list();
            console.log(`Total exercises found: ${allExercises.length}`);

            // Group exercises by Hebrew name (case-insensitive)
            const exerciseGroups = {};
            
            allExercises.forEach(exercise => {
                const hebrewName = exercise.name_he?.trim()?.toLowerCase();
                if (!hebrewName) return;

                if (!exerciseGroups[hebrewName]) {
                    exerciseGroups[hebrewName] = [];
                }
                exerciseGroups[hebrewName].push(exercise);
            });

            // Find groups with more than one exercise (duplicates)
            const duplicateGroups = [];
            Object.entries(exerciseGroups).forEach(([name, exercises]) => {
                if (exercises.length > 1) {
                    duplicateGroups.push({
                        name,
                        originalName: exercises[0].name_he,
                        englishName: exercises[0].name_en,
                        exercises,
                        count: exercises.length
                    });
                }
            });

            console.log(`Found ${duplicateGroups.length} duplicate groups`);
            setDuplicates(duplicateGroups);

        } catch (error) {
            console.error('Error analyzing exercises:', error);
            alert('שגיאה בניתוח התרגילים');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const removeDuplicates = async () => {
        if (pin !== COACH_PIN) {
            setPinError('קוד אישור שגוי. אנא נסה שוב.');
            return;
        }
        setPinError(''); // Clear error if PIN is correct
        
        if (duplicates.length === 0) {
            alert('לא נמצאו כפילויות להסרה');
            return;
        }

        const confirmed = window.confirm(
            `האם אתה בטוח שברצונך להסיר כפילויות? פעולה זו תמחק ${duplicates.reduce((sum, group) => sum + (group.count - 1), 0)} תרגילים מהמאגר.`
        );

        if (!confirmed) return;

        setIsRemoving(true);
        let removedCount = 0;
        let failedCount = 0;

        try {
            for (const group of duplicates) {
                // Keep the first exercise in each group, remove the rest
                const [keepExercise, ...removeExercises] = group.exercises;
                
                console.log(`Keeping exercise: ${keepExercise.name_he} (ID: ${keepExercise.id})`);
                
                for (const exerciseToRemove of removeExercises) {
                    try {
                        console.log(`Removing duplicate: ${exerciseToRemove.name_he} (ID: ${exerciseToRemove.id})`);
                        await ExerciseDefinition.delete(exerciseToRemove.id);
                        removedCount++;
                    } catch (error) {
                        console.error(`Failed to remove exercise ${exerciseToRemove.id}:`, error);
                        failedCount++;
                    }
                }
            }

            setCleanupResult({
                removed: removedCount,
                failed: failedCount,
                duplicateGroups: duplicates.length
            });

            // Clear duplicates list after successful cleanup
            setDuplicates([]);

        } catch (error) {
            console.error('Error during cleanup:', error);
            alert('שגיאה במהלך הסרת הכפילויות');
        } finally {
            setIsRemoving(false);
            setPin(''); // Reset pin after operation completes
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-3">
                <Button 
                    onClick={findDuplicates} 
                    disabled={isAnalyzing || isRemoving}
                    variant="outline"
                    className="flex-1"
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 className="me-2 h-4 w-4 animate-spin" />
                            מנתח...
                        </>
                    ) : (
                        <>
                            <AlertCircle className="me-2 h-4 w-4" />
                            חפש כפילויות
                        </>
                    )}
                </Button>
            </div>

            {/* Results */}
            {cleanupResult && (
                <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        <strong>ניקוי הושלם בהצלחה!</strong><br />
                        נמחקו {cleanupResult.removed} תרגילים כפולים מתוך {cleanupResult.duplicateGroups} קבוצות.
                        {cleanupResult.failed > 0 && (
                            <span className="text-red-600">
                                <br />כישלון במחיקת {cleanupResult.failed} תרגילים.
                            </span>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {/* Duplicates List */}
            {duplicates.length > 0 && (
                <div className="space-y-3">
                    <h3 className="font-semibold text-slate-700">
                        נמצאו {duplicates.length} תרגילים עם כפילויות:
                    </h3>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                        {duplicates.map((group, index) => (
                            <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                <div className="font-medium text-red-800 mb-1">
                                    {group.originalName}
                                </div>
                                <div className="text-sm text-red-600 mb-1">
                                    {group.englishName}
                                </div>
                                <div className="text-sm text-red-600">
                                    {group.count} עותקים • מזהים: {group.exercises.map(ex => ex.id).join(', ')}
                                </div>
                                <div className="text-xs text-red-500 mt-1">
                                    יישמר: ID {group.exercises[0].id} | יימחקו: {group.exercises.slice(1).map(ex => `ID ${ex.id}`).join(', ')}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {duplicates.length > 0 && (
                <div className="mt-4 p-4 border-t border-red-200 bg-red-50/90 rounded-lg shadow-inner">
                    <h4 className="font-semibold text-lg text-red-800 mb-2">אישור מחיקה סופית</h4>
                    <p className="text-sm text-red-700 mb-4">
                        זוהי פעולה בלתי הפיכה. לאישור המחיקה של <strong>{duplicates.reduce((sum, group) => sum + (group.count - 1), 0)}</strong> תרגילים כפולים, אנא הזן את קוד האבטחה.
                    </p>
                    <div className="flex flex-col sm:flex-row items-start gap-4">
                        <div className="flex-1 w-full sm:w-auto">
                            <Label htmlFor="pin-cleanup" className="text-red-900 font-medium">קוד אבטחה (4 ספרות)</Label>
                            <Input
                                id="pin-cleanup"
                                type="password"
                                value={pin}
                                onChange={(e) => { setPin(e.target.value); setPinError(''); }}
                                maxLength="4"
                                placeholder="****"
                                className="w-full sm:w-40 mt-1 text-center font-mono tracking-widest"
                                disabled={isRemoving}
                            />
                            {pinError && <p className="text-sm text-red-600 mt-1">{pinError}</p>}
                        </div>
                        <Button 
                            onClick={removeDuplicates} 
                            disabled={isRemoving || isAnalyzing || pin.length !== 4}
                            variant="destructive"
                            className="w-full sm:w-auto mt-2 sm:mt-6"
                        >
                            {isRemoving ? (
                                <><Loader2 className="me-2 h-4 w-4 animate-spin" /> מסיר...</>
                            ) : (
                                <><Trash2 className="me-2 h-4 w-4" /> אשר ומחק</>
                            )}
                        </Button>
                    </div>
                </div>
            )}

            {duplicates.length === 0 && !isAnalyzing && !cleanupResult && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        לחץ על "חפש כפילויות" כדי לסרוק את מאגר התרגילים. פעולה זו בטוחה ולא מוחקת נתונים.
                    </AlertDescription>
                </Alert>
            )}
        </div>
    );
}