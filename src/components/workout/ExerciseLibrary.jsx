import React, { useState, useEffect } from "react";
import { ExerciseDefinition, ExerciseDefault, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, Search, Save, Loader2, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ExerciseLibrary() {
    const [exercises, setExercises] = useState([]);
    const [user, setUser] = useState(null);
    const [selectedExercise, setSelectedExercise] = useState(null);
    const [defaults, setDefaults] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [savingExercise, setSavingExercise] = useState(null);
    const [savedExercise, setSavedExercise] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [exerciseDefs, currentUser] = await Promise.all([
                ExerciseDefinition.list(),
                User.me()
            ]);
            
            setExercises(exerciseDefs.sort((a, b) => a.name_he.localeCompare(b.name_he)));
            setUser(currentUser);

            // Load user's exercise defaults
            const userDefaults = await ExerciseDefault.filter({ user_email: currentUser.email });
            const defaultsMap = {};
            
            // Initialize all exercises with 0 values
            exerciseDefs.forEach(exercise => {
                defaultsMap[exercise.id] = {
                    weight: 0,
                    reps: 0,
                    duration: 0
                };
            });

            // Override with saved user defaults where they exist
            userDefaults.forEach(def => {
                defaultsMap[def.exercise_id] = {
                    weight: def.default_weight || 0,
                    reps: def.default_reps || 0,
                    duration: def.default_duration || 0
                };
            });

            setDefaults(defaultsMap);
        } catch (error) {
            console.error("Error loading exercise library data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDefaultChange = (exerciseId, field, value) => {
        setDefaults(prev => ({
            ...prev,
            [exerciseId]: {
                ...prev[exerciseId],
                [field]: Number(value) || 0
            }
        }));
    };

    const saveDefaults = async (exerciseId) => {
        if (!user) return;
        
        setSavingExercise(exerciseId);
        try {
            const exerciseDefaults = defaults[exerciseId];
            
            // Check if defaults already exist for this user and exercise
            const existingDefaults = await ExerciseDefault.filter({ 
                user_email: user.email, 
                exercise_id: exerciseId 
            });

            const defaultData = {
                user_email: user.email,
                exercise_id: exerciseId,
                default_weight: exerciseDefaults.weight,
                default_reps: exerciseDefaults.reps,
                default_duration: exerciseDefaults.duration,
                last_updated: new Date().toISOString()
            };

            if (existingDefaults.length > 0) {
                await ExerciseDefault.update(existingDefaults[0].id, defaultData);
            } else {
                await ExerciseDefault.create(defaultData);
            }

            // Show success feedback
            setSavedExercise(exerciseId);
            setTimeout(() => {
                setSavedExercise(null);
            }, 2000);

        } catch (error) {
            console.error("Error saving exercise defaults:", error);
        } finally {
            setSavingExercise(null);
        }
    };

    const filteredExercises = exercises.filter(exercise => 
        (exercise.name_he && exercise.name_he.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exercise.name_en && exercise.name_en.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>מאגר תרגילים עם העדפות אישיות</CardTitle>
                    <p className="text-sm text-slate-600 mt-2">
                        הגדר ערכי ברירת מחדל אישיים לכל תרגיל. הערכים יישמרו ויוצגו אוטומטית בפעם הבאה.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="relative mb-4">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="חיפוש תרגיל..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pr-10"
                        />
                    </div>
                    
                    <ScrollArea className="h-[500px]">
                        <div className="space-y-4">
                            {filteredExercises.map((exercise) => (
                                <motion.div
                                    key={exercise.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-slate-50 p-4 rounded-lg border"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="font-semibold text-slate-800">{exercise.name_he}</p>
                                            <p className="text-sm text-slate-500">{exercise.name_en}</p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setSelectedExercise(exercise)}
                                            className="text-blue-600 hover:bg-blue-100"
                                        >
                                            <Info className="w-4 h-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-4 gap-3">
                                        <div>
                                            <Label className="text-xs">משקל (ק"ג)</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.5"
                                                value={defaults[exercise.id]?.weight || 0}
                                                onChange={(e) => handleDefaultChange(exercise.id, 'weight', e.target.value)}
                                                className="h-8"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">חזרות</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={defaults[exercise.id]?.reps || 0}
                                                onChange={(e) => handleDefaultChange(exercise.id, 'reps', e.target.value)}
                                                className="h-8"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs">זמן (שנ')</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="1"
                                                value={defaults[exercise.id]?.duration || 0}
                                                onChange={(e) => handleDefaultChange(exercise.id, 'duration', e.target.value)}
                                                className="h-8"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <Button
                                                onClick={() => saveDefaults(exercise.id)}
                                                disabled={savingExercise === exercise.id}
                                                size="sm"
                                                className={`h-8 transition-all duration-200 ${
                                                    savedExercise === exercise.id 
                                                        ? 'bg-green-600 hover:bg-green-700' 
                                                        : 'bg-blue-600 hover:bg-blue-700'
                                                } text-white`}
                                            >
                                                <AnimatePresence mode="wait">
                                                    {savingExercise === exercise.id ? (
                                                        <motion.div
                                                            key="loading"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                        >
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                        </motion.div>
                                                    ) : savedExercise === exercise.id ? (
                                                        <motion.div
                                                            key="success"
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                            exit={{ scale: 0 }}
                                                        >
                                                            <CheckCircle className="w-3 h-3" />
                                                        </motion.div>
                                                    ) : (
                                                        <motion.div
                                                            key="save"
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                        >
                                                            <Save className="w-3 h-3" />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </Button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Exercise Info Modal */}
            <Dialog open={!!selectedExercise} onOpenChange={() => setSelectedExercise(null)}>
                <DialogContent className="max-w-md" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-lg">{selectedExercise?.name_he}</DialogTitle>
                        <DialogDescription className="text-sm text-slate-500">{selectedExercise?.name_en}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <h4 className="font-semibold mb-2 text-slate-800 flex items-center gap-2">
                                💪 <span>שרירים עובדים</span>
                            </h4>
                            <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded">
                                {selectedExercise?.muscle_group}
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-2 text-slate-800 flex items-center gap-2">
                                🎯 <span>מטרה ותיאור</span>
                            </h4>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3 rounded">
                                {selectedExercise?.description?.split('//')[1]?.trim() || selectedExercise?.description}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold mb-1 text-slate-800 flex items-center gap-2">
                                    ⚡ <span>ציוד</span>
                                </h4>
                                <p className="text-sm text-slate-600">{selectedExercise?.equipment}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-1 text-slate-800 flex items-center gap-2">
                                    🏷️ <span>קטגוריה</span>
                                </h4>
                                <p className="text-sm text-slate-600">{selectedExercise?.category}</p>
                            </div>
                        </div>
                    </div>
                    <Button onClick={() => setSelectedExercise(null)} className="w-full">
                        סגור
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}