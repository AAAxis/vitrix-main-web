
import React, { useState, useEffect } from 'react';
import { ExerciseDefinition, Workout, WorkoutTemplate, ExerciseDefault } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Trash2, Info, Search, Save, Play, FolderOpen, Loader2, ChevronDown, Edit, FilePlus, Video } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import VideoPlayer from './VideoPlayer';

export default function ManualWorkoutBuilder({ user }) {
  const [exerciseDefinitions, setExerciseDefinitions] = useState([]);
  const [workoutExercises, setWorkoutExercises] = useState([]);
  const [workoutTitle, setWorkoutTitle] = useState('אימון מותאם אישית');
  const [workoutDescription, setWorkoutDescription] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExerciseInfo, setSelectedExerciseInfo] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); 
  const [templateToDelete, setTemplateToDelete] = useState(null);
  
  // Video player state
  const [videoPlayerOpen, setVideoPlayerOpen] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [currentVideoTitle, setCurrentVideoTitle] = useState('');
  
  const [exerciseDefaults, setExerciseDefaults] = useState({}); 

  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        console.log('⚠️ No user, skipping data load');
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      
      // Add timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Data loading timeout - forcing stop');
        setIsLoading(false);
      }, 30000); // 30 second timeout
      
      try {
        console.log('🔄 Starting to load exercises and templates...', { userEmail: user.email });
        
        // Load exercises with timeout
        const exercisesPromise = ExerciseDefinition.list().catch(err => {
          console.error('❌ Error loading exercises:', err);
          return [];
        });
        
        // Load templates with timeout
        const templatesPromise = WorkoutTemplate.filter({ created_by: user.email }).catch(err => {
          console.error('❌ Error loading templates:', err);
          return [];
        });
        
        // Load defaults with timeout
        const defaultsPromise = ExerciseDefault.filter({ user_email: user.email }).catch(err => {
          console.error('❌ Error loading defaults:', err);
          return [];
        });
        
        const [defs, tpls, defaults] = await Promise.all([
          exercisesPromise,
          templatesPromise,
          defaultsPromise
        ]);
        
        clearTimeout(timeoutId);
        
        console.log('📋 Loaded exercises:', defs?.length || 0);
        console.log('📋 Loaded templates:', tpls?.length || 0);
        console.log('📋 Loaded defaults:', defaults?.length || 0);
        
        if (defs && defs.length > 0) {
          setExerciseDefinitions(defs.sort((a, b) => (a.name_he || '').localeCompare(b.name_he || '')));
        } else {
          console.warn('⚠️ No exercises found in database');
          setExerciseDefinitions([]);
        }
        setTemplates(tpls || []);

        const defaultsMap = (defaults || []).reduce((acc, def) => {
          acc[def.exercise_id] = def;
          return acc;
        }, {});
        setExerciseDefaults(defaultsMap);

      } catch (error) {
        clearTimeout(timeoutId);
        console.error("❌ Error loading data for manual builder:", error);
        setExerciseDefinitions([]);
        setTemplates([]);
        setExerciseDefaults({});
      } finally {
        console.log('✅ Finished loading data');
        setIsLoading(false);
      }
    };
    loadData();
  }, [user]);

  const handlePlayVideo = (videoUrl, exerciseName) => {
    setCurrentVideoUrl(videoUrl);
    setCurrentVideoTitle(exerciseName);
    setVideoPlayerOpen(true);
  };

  const addExercise = (exerciseDef) => {
    const newExercise = {
      key: `${exerciseDef.id}-${Date.now()}`, 
      definitionId: exerciseDef.id,
      name: exerciseDef.name_he,
      category: exerciseDef.category,
      video_url: exerciseDef.video_url,
      part: 'part_1_exercises', 
      suggested_sets: 1,
      suggested_reps: 1,
      suggested_weight: 1,
      suggested_duration: 1,
      notes: ''
    };
    setWorkoutExercises(prev => [...prev, newExercise]);
  };
  
  const removeExercise = (key) => {
    setWorkoutExercises(prev => prev.filter(ex => ex.key !== key));
  };
  
  const handleSetChange = (key, field, value) => {
    setWorkoutExercises(prev => prev.map(ex => {
        if (ex.key === key) {
            if (field === 'part') {
                return { ...ex, [field]: value };
            }
            const numValue = Number(value);
            return { ...ex, [field]: isNaN(numValue) ? 1 : numValue };
        }
        return ex;
    }));
  };

  const mapExerciseToWorkoutFormat = (ex) => ({
    name: ex.name,
    category: ex.category,
    sets: Array(ex.suggested_sets).fill().map(() => ({
      repetitions: ex.suggested_reps,
      weight: ex.suggested_weight,
      duration_seconds: ex.suggested_duration,
      completed: false
    })),
    completed: false,
    notes: ex.notes,
    video_url: ex.video_url,
  });

  const handleStartWorkout = async () => {
    if (workoutExercises.length === 0) {
      alert("יש להוסיף לפחות תרגיל אחד לאימון.");
      return;
    }
    setIsSaving(true);
    try {
      const workoutData = {
        date: new Date().toISOString().split('T')[0],
        workout_type: 'אימון כוח',
        status: 'פעיל',
        start_time: new Date().toISOString(),
        warmup_description: 'חימום כללי - 10 דקות',
        warmup_duration: 10,
        warmup_completed: false,
        part_1_exercises: workoutExercises.filter(e => e.part === 'part_1_exercises').map(mapExerciseToWorkoutFormat),
        part_2_exercises: workoutExercises.filter(e => e.part === 'part_2_exercises').map(mapExerciseToWorkoutFormat),
        part_3_exercises: workoutExercises.filter(e => e.part === 'part_3_exercises').map(mapExerciseToWorkoutFormat),
        coach_workout_title: workoutTitle,
        coach_workout_description: workoutDescription,
      };
      const newWorkout = await Workout.create(workoutData);
      navigate(createPageUrl('Journal'), { state: { workoutToStart: newWorkout }});
    } catch (error) {
      console.error("Failed to start workout:", error);
      alert("שגיאה בהפעלת האימון.");
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to remove undefined values from objects
  const removeUndefined = (obj) => {
    if (obj === null || obj === undefined) return null;
    if (Array.isArray(obj)) {
      return obj.map(item => removeUndefined(item)).filter(item => item !== undefined);
    }
    if (typeof obj === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined) {
          cleaned[key] = removeUndefined(value);
        }
      }
      return cleaned;
    }
    return obj;
  };

  const handleSaveOrUpdateTemplate = async () => {
    if (!templateName) {
      alert("יש לתת שם לתבנית.");
      return;
    }
    if (workoutExercises.length === 0) {
      alert("יש להוסיף תרגילים לתבנית.");
      return;
    }
    setIsSaving(true);
    try {
      const templateData = removeUndefined({
        template_name: templateName,
        workout_title: workoutTitle || '',
        workout_description: workoutDescription || '',
        part_1_exercises: workoutExercises.filter(e => e.part === 'part_1_exercises').map(ex => ({
          key: ex.key,
          definitionId: ex.definitionId,
          name: ex.name || '',
          category: ex.category || '',
          video_url: ex.video_url || '',
          part: ex.part || 'part_1_exercises',
          suggested_sets: ex.suggested_sets ?? 1,
          suggested_reps: ex.suggested_reps ?? 1,
          suggested_weight: ex.suggested_weight ?? 1,
          suggested_duration: ex.suggested_duration ?? 1,
          notes: ex.notes || ''
        })),
        part_2_exercises: workoutExercises.filter(e => e.part === 'part_2_exercises').map(ex => ({
          key: ex.key,
          definitionId: ex.definitionId,
          name: ex.name || '',
          category: ex.category || '',
          video_url: ex.video_url || '',
          part: ex.part || 'part_2_exercises',
          suggested_sets: ex.suggested_sets ?? 1,
          suggested_reps: ex.suggested_reps ?? 1,
          suggested_weight: ex.suggested_weight ?? 1,
          suggested_duration: ex.suggested_duration ?? 1,
          notes: ex.notes || ''
        })),
        part_3_exercises: workoutExercises.filter(e => e.part === 'part_3_exercises').map(ex => ({
          key: ex.key,
          definitionId: ex.definitionId,
          name: ex.name || '',
          category: ex.category || '',
          video_url: ex.video_url || '',
          part: ex.part || 'part_3_exercises',
          suggested_sets: ex.suggested_sets ?? 1,
          suggested_reps: ex.suggested_reps ?? 1,
          suggested_weight: ex.suggested_weight ?? 1,
          suggested_duration: ex.suggested_duration ?? 1,
          notes: ex.notes || ''
        })),
      });

      if (editingTemplate) {
        await WorkoutTemplate.update(editingTemplate.id, templateData);
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...t, ...templateData } : t));
        alert("התבנית עודכנה בהצלחה!");
      } else {
        const newTemplate = await WorkoutTemplate.create(templateData);
        setTemplates(prev => [...prev, { ...templateData, id: newTemplate.id }]); 
        alert("התבנית נשמרה בהצלחה!");
      }
      setEditingTemplate(null);
      setTemplateName('');
    } catch (error) {
      console.error("Failed to save/update template:", error);
      alert("שגיאה בשמירת התבנית.");
    } finally {
      setIsSaving(false);
    }
  };

  const loadTemplate = (template, isForEditing = false) => {
    setWorkoutTitle(template.workout_title || 'אימון מותאם אישית');
    setWorkoutDescription(template.workout_description || '');

    const part1 = (template.part_1_exercises || []).map((ex, index) => ({ 
      ...ex, 
      part: 'part_1_exercises',
      key: ex.key || `${ex.definitionId || ex.name || 'p1'}-${Date.now()}-${index}`,
      definitionId: ex.definitionId || '',
      name: ex.name || '',
      category: ex.category || '',
      video_url: ex.video_url || '',
      suggested_sets: ex.suggested_sets || 3,
      suggested_reps: ex.suggested_reps || 0,
      suggested_weight: ex.suggested_weight || 0,
      suggested_duration: ex.suggested_duration || 0,
      notes: ex.notes || ''
    }));
    
    const part2 = (template.part_2_exercises || []).map((ex, index) => ({ 
      ...ex, 
      part: 'part_2_exercises',
      key: ex.key || `${ex.definitionId || ex.name || 'p2'}-${Date.now()}-${index}`,
      definitionId: ex.definitionId || '',
      name: ex.name || '',
      category: ex.category || '',
      video_url: ex.video_url || '',
      suggested_sets: ex.suggested_sets || 3,
      suggested_reps: ex.suggested_reps || 0,
      suggested_weight: ex.suggested_weight || 0,
      suggested_duration: ex.suggested_duration || 0,
      notes: ex.notes || ''
    }));
    
    const part3 = (template.part_3_exercises || []).map((ex, index) => ({ 
      ...ex, 
      part: 'part_3_exercises',
      key: ex.key || `${ex.definitionId || ex.name || 'p3'}-${Date.now()}-${index}`,
      definitionId: ex.definitionId || '',
      name: ex.name || '',
      category: ex.category || '',
      video_url: ex.video_url || '',
      suggested_sets: ex.suggested_sets || 3,
      suggested_reps: ex.suggested_reps || 0,
      suggested_weight: ex.suggested_weight || 0,
      suggested_duration: ex.suggested_duration || 0,
      notes: ex.notes || ''
    }));

    const allExercises = [...part1, ...part2, ...part3];
    setWorkoutExercises(allExercises);

    if (isForEditing) {
        setEditingTemplate(template);
        setTemplateName(template.template_name);
    } else {
        setEditingTemplate(null);
        setTemplateName('');
    }
  };
  
  const prepareToDelete = (template) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  };
  
  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await WorkoutTemplate.delete(templateToDelete.id);
      setTemplates(prev => prev.filter(t => t.id !== templateToDelete.id));
      alert("התבנית נמחקה בהצלחה.");
    } catch (error) {
      console.error("Failed to delete template:", error);
      alert("שגיאה במחיקת התבנית.");
    } finally {
      setIsDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const resetToNewTemplate = () => {
    setWorkoutTitle('אימון מותאם אישית');
    setWorkoutDescription('');
    setTemplateName('');
    setWorkoutExercises([]);
    setEditingTemplate(null);
  };

  const filteredExercises = exerciseDefinitions.filter(def => 
    (def.name_he && def.name_he.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (def.name_en && def.name_en.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-slate-600">טוען תרגילים...</p>
        {!user && <p className="text-xs text-red-500">ממתין לטעינת משתמש...</p>}
      </div>
    );
  }
  
  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-64 space-y-4">
        <p className="text-slate-600">ממתין לטעינת משתמש...</p>
      </div>
    );
  }

  const exercisesByPart = {
    part_1_exercises: workoutExercises.filter(ex => ex.part === 'part_1_exercises'),
    part_2_exercises: workoutExercises.filter(ex => ex.part === 'part_2_exercises'),
    part_3_exercises: workoutExercises.filter(ex => ex.part === 'part_3_exercises'),
  };

  const partLabels = {
    part_1_exercises: 'חלק 1 - תרגילים ראשיים',
    part_2_exercises: 'חלק 2 - תרגילים מתקדמים',
    part_3_exercises: 'חלק 3 - סיום / עצימות',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left Column: Exercise Selection */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="muscle-glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-slate-800">בניית אימון ידני</CardTitle>
            <CardDescription>
              בחר תרגילים ממאגר התרגילים וצור אימון מותאם אישית. הערכים יטענו לפי ההעדפות האישיות שהגדרת.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>פרטי האימון</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="שם האימון (לדוגמה: אימון רגליים א')" value={workoutTitle} onChange={(e) => setWorkoutTitle(e.target.value)} />
                <Textarea placeholder="תיאור קצר של האימון (אופציונלי)" value={workoutDescription} onChange={(e) => setWorkoutDescription(e.target.value)} />
              </CardContent>
            </Card>
            
            {/* Exercise Selection */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">הוספת תרגילים</Label>
              <div className="relative">
                <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="חיפוש תרגיל להוספה..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pe-10"
                />
              </div>
              
              <div className="text-xs text-slate-500 mb-2">
                {exerciseDefinitions.length} תרגילים זמינים
                {searchTerm && ` (${filteredExercises.length} תואמים לחיפוש)`}
              </div>
              <ScrollArea className="h-[400px] border rounded-lg bg-white">
                <div className="p-2 space-y-1">
                  {filteredExercises.length > 0 ? filteredExercises.map(exercise => (
                    <div
                      key={exercise.id}
                      className="flex items-center justify-between p-2 hover:bg-slate-100 rounded cursor-pointer"
                      onClick={() => addExercise(exercise)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{exercise.name_he}</p>
                        <p className="text-xs text-slate-500">{exercise.name_en}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {exercise.video_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlayVideo(exercise.video_url, exercise.name_he);
                            }}
                            title="צפה בהדגמת וידאו"
                          >
                            <Video className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedExerciseInfo(exercise);
                          }}
                        >
                          <Info className="w-3 h-3" />
                        </Button>
                        <Plus className="w-4 h-4 text-green-600" />
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-slate-500 py-8">
                      {searchTerm ? 'לא נמצאו תרגילים תואמים' : 'טוען תרגילים...'}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Templates, Your Workout, Save/Start */}
      <div className="lg:col-span-1 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>התבניות שלי</CardTitle>
            <CardDescription>טען, ערוך או מחק תבניות אימון קיימות.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex-grow">
                  <FolderOpen className="w-4 h-4 me-2" />
                  טען תבנית
                  <ChevronDown className="w-4 h-4 ms-auto" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[300px]" dir="rtl">
                {templates.length > 0 ? templates.map(t => (
                  <React.Fragment key={t.id}>
                    <DropdownMenuItem 
                      className="flex items-center justify-between cursor-pointer"
                      onSelect={(e) => {
                        e.preventDefault();
                      }}
                    >
                      <span 
                        className="flex-grow text-sm"
                        onClick={() => {
                          loadTemplate(t);
                        }}
                      >
                        {t.template_name}
                      </span>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            loadTemplate(t, true); 
                          }}
                        >
                          <Edit className="w-4 h-4 text-blue-600"/>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7" 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            prepareToDelete(t); 
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600"/>
                        </Button>
                      </div>
                    </DropdownMenuItem>
                    {templates.indexOf(t) < templates.length - 1 && <DropdownMenuSeparator />}
                  </React.Fragment>
                )) : (
                  <DropdownMenuItem disabled>אין תבניות שמורות</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="secondary" onClick={resetToNewTemplate} title="צור תבנית חדשה">
              <FilePlus className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
        
        {workoutExercises.length > 0 && (
          <div className="space-y-6">
                  {Object.keys(exercisesByPart).map(partKey => (
                      exercisesByPart[partKey].length > 0 && (
                          <div key={partKey}>
                              <h3 className="text-lg font-semibold text-slate-700 mb-3">{partLabels[partKey]}</h3>
                              <div className="space-y-4">
                                  {exercisesByPart[partKey].map((ex) => (
                                      <div key={ex.key} className="p-3 border rounded-lg bg-white space-y-3">
                                          <div className="flex justify-between items-start">
                                              <div className="flex items-center gap-2 flex-1">
                                                  <p className="font-semibold text-slate-800">{ex.name}</p>
                                                  {ex.video_url && (
                                                      <Button
                                                          variant="ghost"
                                                          size="icon"
                                                          className="h-6 w-6"
                                                          onClick={() => handlePlayVideo(ex.video_url, ex.name)}
                                                          title="צפה בהדגמת וידאו"
                                                      >
                                                          <Video className="w-4 h-4 text-blue-600" />
                                                      </Button>
                                                  )}
                                              </div>
                                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => removeExercise(ex.key)}>
                                                  <Trash2 className="w-4 h-4" />
                                              </Button>
                                          </div>
                                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                              <div className="sm:col-span-1">
                                                  <Label className="text-xs">שייך ל</Label>
                                                  <Select value={ex.part} onValueChange={(value) => handleSetChange(ex.key, 'part', value)}>
                                                      <SelectTrigger>
                                                          <SelectValue placeholder="בחר חלק" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                          <SelectItem value="part_1_exercises">חלק 1</SelectItem>
                                                          <SelectItem value="part_2_exercises">חלק 2</SelectItem>
                                                          <SelectItem value="part_3_exercises">חלק 3</SelectItem>
                                                      </SelectContent>
                                                  </Select>
                                              </div>
                                              <div className="sm:col-span-1">
                                                  <Label className="text-xs">סטים</Label>
                                                  <Input type="number" value={ex.suggested_sets ?? 1} onChange={(e) => handleSetChange(ex.key, 'suggested_sets', e.target.value)} />
                                              </div>
                                              <div className="sm:col-span-1">
                                                  <Label className="text-xs">חזרות</Label>
                                                  <Input type="number" value={ex.suggested_reps ?? 1} onChange={(e) => handleSetChange(ex.key, 'suggested_reps', e.target.value)} />
                                              </div>
                                              <div className="sm:col-span-1">
                                                  <Label className="text-xs">משקל (ק"ג)</Label>
                                                  <Input type="number" value={ex.suggested_weight ?? 1} onChange={(e) => handleSetChange(ex.key, 'suggested_weight', e.target.value)} />
                                              </div>
                                              <div className="sm:col-span-1">
                                                  <Label className="text-xs">משך (שניות)</Label>
                                                  <Input type="number" value={ex.suggested_duration ?? 1} onChange={(e) => handleSetChange(ex.key, 'suggested_duration', e.target.value)} />
                                              </div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )
                  ))}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>{editingTemplate ? "עדכן או הפעל" : "שמור והפעל"}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
              <div>
                  <Label>שם התבנית</Label>
                  <div className="flex gap-2 mt-1">
                      <Input placeholder="שם תבנית..." value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
                      <Button onClick={handleSaveOrUpdateTemplate} disabled={isSaving || !templateName}>
                          {isSaving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                          <span className="me-2">{editingTemplate ? 'עדכן' : 'שמור'}</span>
                      </Button>
                  </div>
              </div>
              <Button onClick={handleStartWorkout} disabled={isSaving || workoutExercises.length === 0} className="w-full muscle-primary-gradient text-white">
                  <Play className="w-4 h-4 ms-2" />
                  התחל אימון
              </Button>
          </CardContent>
        </Card>
      </div>

      {/* Exercise Info Dialog */}
      <Dialog open={!!selectedExerciseInfo} onOpenChange={() => setSelectedExerciseInfo(null)}>
        <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader>
                <DialogTitle>{selectedExerciseInfo?.name_he}</DialogTitle>
                <DialogDescription>{selectedExerciseInfo?.name_en}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <div>
                    <h4 className="font-semibold mb-1 text-slate-800">💪 שרירים עובדים</h4>
                    <p className="text-sm text-slate-600">{selectedExerciseInfo?.muscle_group}</p>
                </div>
                <div>
                    <h4 className="font-semibold mb-1 text-slate-800">🎯 מטרה ותיאור</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                        {selectedExerciseInfo?.description?.split('//')[1]?.trim() || selectedExerciseInfo?.description}
                    </p>
                </div>
                <div>
                    <h4 className="font-semibold mb-1 text-slate-800">⚡ ציוד</h4>
                    <p className="text-sm text-slate-600">{selectedExerciseInfo?.equipment}</p>
                </div>
                {selectedExerciseInfo?.video_url && (
                    <Button 
                        onClick={() => {
                            handlePlayVideo(selectedExerciseInfo.video_url, selectedExerciseInfo.name_he);
                            setSelectedExerciseInfo(null);
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                        <Video className="w-4 h-4 ms-2" />
                        צפה בהדגמת וידאו
                    </Button>
                )}
            </div>
            <Button onClick={() => setSelectedExerciseInfo(null)} className="w-full">סגור</Button>
        </DialogContent>
      </Dialog>

      {/* Delete Template Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>אישור מחיקת תבנית</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את התבנית "{templateToDelete?.template_name}"? פעולה זו אינה ניתנת לשחזור.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">מחק</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Video Player Modal */}
      <VideoPlayer
        isOpen={videoPlayerOpen}
        onClose={() => setVideoPlayerOpen(false)}
        videoUrl={currentVideoUrl}
        exerciseName={currentVideoTitle}
      />
    </div>
  );
}
