
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { WeeklyTask, BoosterPlusTask, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Clock, XCircle, Calendar, Target, MessageSquare, Trophy, AlertTriangle, CheckCircle } from 'lucide-react';
import { format, parseISO, differenceInDays, isAfter, isBefore } from 'date-fns';
import { he } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

const statusConfig = {
  'הושלם': {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    badgeColor: 'bg-green-100 text-green-800'
  },
  'בעבודה': {
    icon: Clock,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeColor: 'bg-orange-100 text-orange-800'
  },
  'לא בוצע': {
    icon: XCircle,
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    badgeColor: 'bg-slate-100 text-slate-600'
  }
};

const getWeekStatus = (task) => {
    const commonClasses = "flex flex-col items-center gap-1 text-sm";
    const WeekIcon = Calendar; 

    if (task.isFuture) {
      return (
        <div className={`${commonClasses} text-blue-600`}>
          <WeekIcon className="w-4 h-4" />
          <span>מתחיל בעוד {Math.abs(task.daysLeft)} ימים</span>
          <div className="text-xs text-slate-500 mt-1">
            {format(parseISO(task.week_start_date), 'dd/MM/yyyy', { locale: he })} - {format(parseISO(task.week_end_date), 'dd/MM/yyyy', { locale: he })}
          </div>
        </div>
      );
    }
    if (task.isPast) {
      return (
        <div className={`${commonClasses} text-slate-500`}>
          <WeekIcon className="w-4 h-4" />
          <span>השבוע הסתיים</span>
          <div className="text-xs text-slate-500 mt-1">
            {format(parseISO(task.week_start_date), 'dd/MM/yyyy', { locale: he })} - {format(parseISO(task.week_end_date), 'dd/MM/yyyy', { locale: he })}
          </div>
        </div>
      );
    }
    if (task.daysLeft === 0) {
      return (
        <div className={`${commonClasses} text-red-600`}>
          <AlertTriangle className="w-4 h-4" />
          <span>יום אחרון!</span>
          <div className="text-xs text-slate-500 mt-1">
            {format(parseISO(task.week_start_date), 'dd/MM/yyyy', { locale: he })} - {format(parseISO(task.week_end_date), 'dd/MM/yyyy', { locale: he })}
          </div>
        </div>
      );
    }
    // Active task
    return (
      <div className={`${commonClasses} ${task.daysLeft <= 2 ? 'text-orange-600' : 'text-slate-600'}`}>
        <WeekIcon className="w-4 h-4" />
        <span>נותרו {task.daysLeft} ימים</span>
        <div className="text-xs text-slate-500 mt-1">
          {format(parseISO(task.week_start_date), 'dd/MM/yyyy', { locale: he })} - {format(parseISO(task.week_end_date), 'dd/MM/yyyy', { locale: he })}
        </div>
      </div>
    );
};

const TaskCard = ({ task, onStatusUpdate, onAddNote, genderedTexts }) => {
    const StatusIcon = task.statusConfig.icon;
    const isBoosterPlus = 'insight' in task;

    return (
        <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.1 }}
            className="w-full"
        >
            <Card className={`${task.statusConfig.bgColor} ${task.statusConfig.borderColor} border-2 transition-all duration-300 hover:shadow-lg`}>
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full ${task.statusConfig.bgColor} flex items-center justify-center`}>
                                <StatusIcon className={`w-6 h-6 ${task.statusConfig.color}`} />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-bold text-slate-800">
🔵 שבוע {task.week} – {task.title}
                                </CardTitle>
                                <Badge className={`${task.statusConfig.badgeColor} mt-2`}>
                                    {task.status}
                                </Badge>
                            </div>
                        </div>
                        <div className="text-center">
                            {getWeekStatus(task)}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-2">
                    {isBoosterPlus ? (
                        <>
                            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Target className="w-5 h-5 text-blue-600" />
                                    <h4 className="font-bold text-blue-800 text-lg">🎯 המשימה:</h4>
                                </div>
                                <div className="text-blue-900 leading-relaxed text-base whitespace-pre-line font-medium">
                                    {task.details}
                                </div>
                            </div>
                             <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <MessageSquare className="w-5 h-5 text-amber-600" />
                                    <h4 className="font-bold text-amber-800 text-lg">💡 תובנה:</h4>
                                </div>
                                <div className="text-amber-900 leading-relaxed text-base whitespace-pre-line italic">
                                    {task.insight}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Target className="w-5 h-5 text-blue-600" />
                                    <h4 className="font-bold text-blue-800 text-lg">🎯 המשימה:</h4>
                                </div>
                                <div className="text-blue-900 leading-relaxed text-base whitespace-pre-line font-medium">
                                    {task.mission_text}
                                </div>
                            </div>

                            <div className="bg-amber-50 rounded-xl p-5 border border-amber-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <MessageSquare className="w-5 h-5 text-amber-600" />
                                    <h4 className="font-bold text-amber-800 text-lg">💡 הטיפ:</h4>
                                </div>
                                <div className="text-amber-900 leading-relaxed text-base whitespace-pre-line">
                                    {task.tip_text}
                                </div>
                            </div>

                            <div className="bg-green-50 rounded-xl p-5 border border-green-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <Trophy className="w-5 h-5 text-green-600" />
                                    <h4 className="font-bold text-green-800 text-lg">🚀 בוסטר:</h4>
                                </div>
                                <div className="text-green-900 leading-relaxed text-base whitespace-pre-line font-medium italic">
                                    {task.booster_text}
                                </div>
                            </div>
                        </>
                    )}
                    
                    <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200">
                        {task.status === 'לא בוצע' && task.isActive && (
                             <Button
                                onClick={() => onStatusUpdate(task, 'בעבודה')}
                                variant="outline"
                                size="sm"
                                className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                            >
                                <Clock className="w-4 h-4 ms-2" />
                                {genderedTexts.startWork}
                            </Button>
                        )}
                        {task.status === 'בעבודה' && (
                            <Button
                                onClick={() => onAddNote(task)}
                                variant="outline"
                                size="sm"
                                className="bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                            >
                                <MessageSquare className="w-4 h-4 ms-2" />
                                {genderedTexts.addNote}
                            </Button>
                        )}
                        {task.status !== 'הושלם' && (task.isActive || task.isPast) && (
                            <Button
                                onClick={() => onStatusUpdate(task, 'הושלם')}
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                <CheckCircle className="w-4 h-4 ms-2" />
                                {genderedTexts.markAsCompleted}
                            </Button>
                        )}
                        
                        {task.completion_date && (
                            <div className="flex items-center text-sm text-green-600 mt-2">
                                <CheckCircle className="w-4 h-4 ms-1" />
                                <span>הושלם ב-{format(parseISO(task.completion_date), 'dd/MM/yyyy', { locale: he })}</span>
                            </div>
                        )}
                    </div>

                    {task.notes_thread && task.notes_thread.length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <h5 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                הערות קודמות:
                            </h5>
                            <div className="space-y-3">
                                {task.notes_thread.map((note, noteIndex) => (
                                    <div key={noteIndex} className="bg-white rounded-lg p-3 border border-slate-100">
                                        <p className="text-slate-700 leading-relaxed mb-2">{note.text}</p>
                                        <p className="text-xs text-slate-400">
                                            {format(parseISO(note.timestamp), 'dd/MM/yyyy HH:mm', { locale: he })}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

export default function WeeklyTasksTracker({ user: initialUser, onFinalTaskCompleted }) {
  const [user, setUser] = useState(initialUser);
  const [weeklyTasks, setWeeklyTasks] = useState([]);
  const [boosterPlusTasks, setBoosterPlusTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [note, setNote] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      if (currentUser?.email) {
        const [userWeeklyTasks, userBoosterPlusTasks] = await Promise.all([
          WeeklyTask.filter({ user_email: currentUser.email }, 'week'),
          currentUser.booster_plus_enabled ? BoosterPlusTask.filter({ user_email: currentUser.email }, 'week') : Promise.resolve([])
        ]);
        setWeeklyTasks(userWeeklyTasks || []);
        setBoosterPlusTasks(userBoosterPlusTasks || []);
      }
    } catch (error) {
      console.error('Error loading weekly tasks:', error);
      setWeeklyTasks([]);
      setBoosterPlusTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // If initialUser changes, update the internal state
    if (initialUser) {
      setUser(initialUser);
    }
    loadData();
  }, [loadData, initialUser]);

  const genderedTexts = useMemo(() => {
    const isMale = !user || user.gender === 'male';
    return {
        startWork: isMale ? 'התחל עבודה' : 'התחילי לעבוד',
        addNote: isMale ? 'הוסף הערה למאמן' : 'הוסיפי הערה למאמנת',
        markAsCompleted: isMale ? 'סמן כהושלם' : 'סמני כהושלם',
        notePlaceholder: isMale ? 'כתוב הערה או שאלה למאמן...' : 'כתבי הערה או שאלה למאמנת...',
        emptyStateCoach: 'המאמן/ת שלך יקצה לך משימות שבועיות בהתאם לתוכנית האימונים.'
    };
  }, [user]);

  const processTasks = (tasksToProcess) => {
    if (!tasksToProcess.length) return { all: [], displayed: [], stats: { total: 0, completed: 0, inProgress: 0, notStarted: 0 } };

    const now = new Date();
    const tasksWithStatus = tasksToProcess
        .filter(task => !task.is_frozen) // Exclude frozen tasks from all calculations and displays
        .map(task => {
            const startDate = parseISO(task.week_start_date);
            const endDate = parseISO(task.week_end_date);
            
            const daysLeft = differenceInDays(endDate, now);
            const isActive = !isBefore(now, startDate) && !isAfter(now, endDate);
            const isPast = isAfter(now, endDate);
            const isFuture = isBefore(now, startDate);
            
            return {
                ...task,
                daysLeft,
                isActive,
                isPast,
                isFuture,
                statusConfig: statusConfig[task.status] || statusConfig['לא בוצע']
            };
        });

    const displayed = tasksWithStatus.filter(task => !task.isFuture && task.status !== 'הושלם');

    const stats = {
        total: tasksWithStatus.length,
        completed: tasksWithStatus.filter(t => t.status === 'הושלם').length,
        inProgress: tasksWithStatus.filter(t => t.status === 'בעבודה').length,
        notStarted: tasksWithStatus.filter(t => t.status === 'לא בוצע').length
    };

    return { all: tasksWithStatus, displayed, stats };
  };

  const { all: allWeekly, displayed: displayedWeekly, stats: weeklyStats } = useMemo(() => processTasks(weeklyTasks), [weeklyTasks]);
  const { all: allBoosterPlus, displayed: displayedBoosterPlus, stats: boosterPlusStats } = useMemo(() => processTasks(boosterPlusTasks), [boosterPlusTasks]);


  const updateTaskStatus = async (task, newStatus) => {
    try {
      const isPlus = 'insight' in task;
      const Model = isPlus ? BoosterPlusTask : WeeklyTask;

      const updatedData = {
        status: newStatus,
        completion_date: newStatus === 'הושלם' ? new Date().toISOString().split('T')[0] : null
      };

      await Model.update(task.id, updatedData);
      
      // If the final task (week 12) of the regular booster is completed
      if (!isPlus && task.week === 12 && newStatus === 'הושלם') {
        await User.updateMyUserData({ needs_final_feedback: true });
        if (onFinalTaskCompleted) {
          onFinalTaskCompleted();
        }
      }

      loadData();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const addNoteToTask = async () => {
    if (!selectedTask || !note.trim()) return;

    try {
      const isPlus = 'insight' in selectedTask;
      const Model = isPlus ? BoosterPlusTask : WeeklyTask;

      const existingNotes = selectedTask.notes_thread || [];
      const newNote = {
        text: note.trim(),
        timestamp: new Date().toISOString()
      };

      await Model.update(selectedTask.id, { notes_thread: [...existingNotes, newNote] });
      setNote('');
      setIsModalOpen(false);
      setSelectedTask(null);
      loadData();
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const StatsCard = ({ title, stats }) => (
    <Card className="muscle-glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
              <div className="text-sm text-slate-500">סה"כ משימות</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-slate-500">הושלמו</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.inProgress}</div>
              <div className="text-sm text-slate-500">בעבודה</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-500">{stats.notStarted}</div>
              <div className="text-sm text-slate-500">לא התחילו</div>
            </div>
          </div>
          
          {stats.total > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>התקדמות כללית</span>
                <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
              </div>
              <Progress 
                value={(stats.completed / stats.total) * 100} 
                className="h-2"
              />
            </div>
          )}
        </CardContent>
      </Card>
  );

  const TasksSection = ({ title, displayedTasks, onStatusUpdate, onAddNote, genderedTexts }) => (
    <div>
        <h3 className="text-2xl font-bold text-slate-800 mb-4">{title}</h3>
        {displayedTasks.length > 0 ? (
            <div className="space-y-4">
                <AnimatePresence>
                    {displayedTasks.map((task) => (
                        <TaskCard 
                            key={task.id}
                            task={task} 
                            onStatusUpdate={onStatusUpdate} 
                            onAddNote={onAddNote} 
                            genderedTexts={genderedTexts} 
                        />
                    ))}
                </AnimatePresence>
            </div>
        ) : (
             <Card className="max-w-2xl mx-auto bg-gradient-to-br from-green-50 to-blue-50">
                <CardContent className="text-center py-12">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-green-700 mb-3">🎉 כל הכבוד!</h3>
                    <p className="text-green-600 text-lg mb-2">
                    השלמת את כל המשימות הפעילות שלך
                    </p>
                    <p className="text-slate-600">
                    המשימה הבאה תהיה זמינה בהתאם ללוח הזמנים שלך
                    </p>
                </CardContent>
            </Card>
        )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="me-4 text-slate-600">טוען משימות שבועיות...</p>
      </div>
    );
  }

  const noTasksAtAll = weeklyTasks.length === 0 && boosterPlusTasks.length === 0;
  if (noTasksAtAll) {
      return (
        <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-12">
            <Target className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 mb-2">אין משימות שבועיות</h3>
            <p className="text-slate-500">{genderedTexts.emptyStateCoach}</p>
            </CardContent>
        </Card>
        );
  }

  return (
    <div className="space-y-8">
      {(user?.booster_plus_enabled && boosterPlusTasks.length > 0) && <StatsCard title="סיכום משימות בוסטר" stats={boosterPlusStats} />}
      {(!user?.booster_plus_enabled && weeklyTasks.length > 0) && <StatsCard title="סיכום משימות בוסטר" stats={weeklyStats} />}
      
      {user?.booster_plus_enabled && boosterPlusTasks.length > 0 && (
        <TasksSection 
            title="משימות בוסטר"
            displayedTasks={displayedBoosterPlus}
            onStatusUpdate={updateTaskStatus}
            onAddNote={(task) => { setSelectedTask(task); setIsModalOpen(true); }}
            genderedTexts={genderedTexts}
        />
      )}
      
      {!user?.booster_plus_enabled && weeklyTasks.length > 0 && (
          <TasksSection 
            title="משימות בוסטר"
            displayedTasks={displayedWeekly}
            onStatusUpdate={updateTaskStatus}
            onAddNote={(task) => { setSelectedTask(task); setIsModalOpen(true); }}
            genderedTexts={genderedTexts}
          />
      )}

      {/* Note Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>הוסף הערה למשימה</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="note">הערה או שאלה למאמן</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={genderedTexts.notePlaceholder}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => {
              setIsModalOpen(false);
              setNote('');
              setSelectedTask(null);
            }}>
              ביטול
            </Button>
            <Button onClick={addNoteToTask} disabled={!note.trim()}>
              שלח הערה
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
