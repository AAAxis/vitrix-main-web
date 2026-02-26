import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GroupEvent, EventParticipation, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Target,
  Dumbbell,
  Users2,
  Star,
  Lock,
  Loader2,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { format, parseISO, isToday, isFuture, isPast, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function BoosterEventsCalendar() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isUpdatingParticipation, setIsUpdatingParticipation] = useState(false);
  const navigate = useNavigate();

  // Gender-based texts
  const genderedTexts = useMemo(() => {
    const isFemale = user?.gender === 'female';
    return {
        participating: isFemale ? 'משתתפת' : 'משתתף',
        notParticipating: isFemale ? 'לא משתתפת' : 'לא משתתף',
        responseAvailable: 'תגובה תהיה זמינה 48 שעות לפני האירוע',
        hoursRemaining: (hours) => `נותרו ${hours} שעות עד לפתיחת התגובות`
    };
  }, [user?.gender]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const currentUser = await User.me();
      if (!currentUser) {
        throw new Error('לא ניתן לטעון את פרטי המשתמש');
      }
      setUser(currentUser);

      if (!currentUser.booster_unlocked) {
        setIsLoading(false);
        return;
      }

      const [allEvents, userParticipations] = await Promise.all([
        GroupEvent.list('-start_datetime'),
        EventParticipation.filter({ user_email: currentUser.email })
      ]);

      const boosterEvents = allEvents.filter(event => {
        if (!event || !event.group_name) return false;
        
        return event.group_name === 'בוסטרים מחזור 8' || 
               event.group_name === 'כלל המתאמנים' ||
               event.event_type === 'booster_special' ||
               (currentUser.group_names && currentUser.group_names.includes(event.group_name));
      });
      
      setEvents(boosterEvents);
      setParticipations(userParticipations);
      
    } catch (err) {
      console.error('Error loading booster events:', err);
      setError('שגיאה בטעינת נתוני האירועים. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getEventsByDate = (date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      return events.filter(event => {
        if (!event.start_datetime) return false;
        try {
          const eventDate = format(parseISO(event.start_datetime), 'yyyy-MM-dd');
          return eventDate === dateStr;
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
  };

  const getUserParticipation = (eventId) => {
    return participations.find(p => p.event_id === eventId);
  };

  const handleParticipationChange = async (eventId, status) => {
    if (!user || isUpdatingParticipation) return;
    
    setIsUpdatingParticipation(true);
    try {
      const existingParticipation = getUserParticipation(eventId);
      
      if (existingParticipation) {
        await EventParticipation.update(existingParticipation.id, { 
          status,
          responded_at: new Date().toISOString()
        });
      } else {
        await EventParticipation.create({
          event_id: eventId,
          user_email: user.email,
          status,
          responded_at: new Date().toISOString()
        });
      }
      
      // After successful update, fetch participations again
      const updatedParticipations = await EventParticipation.filter({ user_email: user.email });
      setParticipations(updatedParticipations);

      // Navigate back to home with a refresh state
      navigate(createPageUrl('Home'), { state: { refreshUpdates: true } });

    } catch (err) {
      console.error('Error updating participation:', err);
      setError('שגיאה בעדכון ההשתתפות');
    } finally {
      setIsUpdatingParticipation(false);
    }
  };

  const getEventStatus = (event) => {
    try {
      const now = new Date();
      const eventStart = parseISO(event.start_datetime);
      
      if (isPast(eventStart) && !isToday(eventStart)) {
        return { label: 'הסתיים', color: 'bg-gray-100 text-gray-600', icon: CheckCircle };
      } else if (isToday(eventStart)) {
        return { label: 'היום', color: 'bg-blue-100 text-blue-800', icon: AlertCircle };
      } else {
        return { label: 'קרוב', color: 'bg-green-100 text-green-800', icon: Clock };
      }
    } catch {
      return { label: 'לא ידוע', color: 'bg-gray-100 text-gray-600', icon: AlertCircle };
    }
  };

  const getEventTypeIcon = (eventType) => {
    switch (eventType) {
      case 'workout': return <Dumbbell className="w-4 h-4" />;
      case 'meeting': return <Users2 className="w-4 h-4" />;
      case 'assessment': return <Target className="w-4 h-4" />;
      case 'booster_special': return <Star className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const upcomingEvents = events.filter(event => {
    try {
      return isFuture(parseISO(event.start_datetime)) || isToday(parseISO(event.start_datetime));
    } catch {
      return false;
    }
  }).sort((a, b) => {
    try {
      return parseISO(a.start_datetime) - parseISO(b.start_datetime);
    } catch {
      return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
        <p className="text-slate-600">טוען נתוני אירועים...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="muscle-glass border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            שגיאה בטעינת האירועים
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="w-4 h-4 ms-2" />
            נסה שוב
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!user?.booster_unlocked) {
    return (
      <Card className="muscle-glass">
        <CardContent className="text-center py-12">
          <Lock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            לוח אירועים זמין רק למשתתפי הבוסטר
          </h3>
          <p className="text-gray-500">
            פנה למאמן לקבלת הרשאות גישה ללוח האירועים המיוחד
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="muscle-glass border-0 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div>🚀 לוח אירועים - בוסטרים מחזור 8</div>
              <div className="text-purple-100 text-sm mt-1">
                אירועים מיוחדים, מפגשים וחגיגות התקדמות
              </div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upcoming">אירועים קרובים ({upcomingEvents.length})</TabsTrigger>
          <TabsTrigger value="calendar">לוח שנה</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          <Card className="muscle-glass">
            <CardHeader>
              <CardTitle>🔥 אירועים קרובים</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length > 0 ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {upcomingEvents.map((event, index) => {
                      const status = getEventStatus(event);
                      const participation = getUserParticipation(event.id);
                      const now = new Date();
                      const eventStart = parseISO(event.start_datetime);
                      const hoursUntilEvent = differenceInHours(eventStart, now);
                      const canRespond = hoursUntilEvent <= 48;
                      
                      return (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <Card className="border-s-4 border-l-purple-500 hover:shadow-lg transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-start gap-3">
                                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    {getEventTypeIcon(event.event_type)}
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-lg">{event.event_title}</h3>
                                    <p className="text-gray-600 text-sm mt-1">{event.event_description}</p>
                                  </div>
                                </div>
                                <Badge className={`${status.color} flex items-center gap-1`}>
                                  <status.icon className="w-3 h-3" />
                                  {status.label}
                                </Badge>
                              </div>

                              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                      <CalendarIcon className="w-4 h-4 text-gray-500" />
                                      <span>{format(parseISO(event.start_datetime), 'dd/MM/yyyy', { locale: he })}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-4 h-4 text-gray-500" />
                                      <span>
                                        {format(parseISO(event.start_datetime), 'HH:mm', { locale: he })} - 
                                        {format(parseISO(event.end_datetime), 'HH:mm', { locale: he })}
                                      </span>
                                    </div>
                                    {event.location && (
                                      <div className="flex items-center gap-1">
                                        <MapPin className="w-4 h-4 text-gray-500" />
                                        <span>{event.location}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div>
                                  {canRespond ? (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant={participation?.status === 'participating' ? 'default' : 'outline'}
                                        onClick={() => handleParticipationChange(event.id, 'participating')}
                                        disabled={isUpdatingParticipation}
                                        className="text-xs"
                                      >
                                        <CheckCircle className="w-4 h-4 me-1" />
                                        {genderedTexts.participating}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant={participation?.status === 'not_participating' ? 'default' : 'outline'}
                                        onClick={() => handleParticipationChange(event.id, 'not_participating')}
                                        disabled={isUpdatingParticipation}
                                        className="text-xs"
                                      >
                                        <XCircle className="w-4 h-4 me-1" />
                                        {genderedTexts.notParticipating}
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-md">
                                      {genderedTexts.responseAvailable}
                                    </div>
                                  )}
                                </div>
                                
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    setIsDialogOpen(true);
                                  }}
                                  className="text-xs bg-white hover:bg-gray-50 border border-gray-300"
                                >
                                  פרטים נוספים
                                </Button>
                              </div>

                              {participation && (
                                <div className="mt-3 pt-3 border-t border-gray-200">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      <CheckCircle className="w-3 h-3 me-1" />
                                      תגובתך: {participation.status === 'participating' ? genderedTexts.participating : genderedTexts.notParticipating}
                                    </Badge>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">אין אירועים קרובים</h3>
                  <p className="text-gray-500">אירועים חדשים יופיעו כאן כאשר יתווספו</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 muscle-glass">
              <CardContent className="p-6">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  locale={he}
                  className="w-full"
                  components={{
                    DayContent: ({ date }) => {
                      const dayEvents = getEventsByDate(date);
                      return (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <span>{format(date, 'd')}</span>
                          {dayEvents.length > 0 && (
                            <div className="absolute -top-1 -end-1 w-2 h-2 bg-purple-500 rounded-full"></div>
                          )}
                        </div>
                      );
                    }
                  }}
                />
              </CardContent>
            </Card>

            <Card className="muscle-glass">
              <CardHeader>
                <CardTitle className="text-lg">
                  {format(selectedDate, 'dd/MM/yyyy', { locale: he })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  {getEventsByDate(selectedDate).length > 0 ? (
                    <div className="space-y-3">
                      {getEventsByDate(selectedDate).map(event => {
                        const status = getEventStatus(event);
                        const participation = getUserParticipation(event.id);
                        
                        return (
                          <div
                            key={event.id}
                            className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsDialogOpen(true);
                            }}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-sm">{event.event_title}</h4>
                              <Badge className={`text-xs ${status.color}`}>
                                {status.label}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              {getEventTypeIcon(event.event_type)}
                              <span>{format(parseISO(event.start_datetime), 'HH:mm')}</span>
                            </div>
                            {participation && (
                              <Badge 
                                variant="outline" 
                                className={`mt-2 text-xs ${
                                  participation.status === 'participating' ? 'border-green-200 text-green-700' :
                                  participation.status === 'not_participating' ? 'border-red-200 text-red-700' :
                                  'border-yellow-200 text-yellow-700'
                                }`}
                              >
                                {participation.status === 'participating' ? (user?.gender === 'female' ? 'משתתפת' : 'משתתף') :
                                 participation.status === 'not_participating' ? (user?.gender === 'female' ? 'לא משתתפת' : 'לא משתתף') : 'אולי'}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">אין אירועים ביום זה</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent && getEventTypeIcon(selectedEvent.event_type)}
              {selectedEvent?.event_title}
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <p className="text-gray-700">{selectedEvent.event_description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <CalendarIcon className="w-4 h-4" />
                    תאריך
                  </div>
                  <p className="text-sm">{format(parseISO(selectedEvent.start_datetime), 'EEEE, dd/MM/yyyy', { locale: he })}</p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4" />
                    שעות
                  </div>
                  <p className="text-sm">
                    {format(parseISO(selectedEvent.start_datetime), 'HH:mm')} - {format(parseISO(selectedEvent.end_datetime), 'HH:mm')}
                  </p>
                </div>
                
                {selectedEvent.location && (
                  <div className="md:col-span-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                      <MapPin className="w-4 h-4" />
                      מיקום
                    </div>
                    <p className="text-sm">{selectedEvent.location}</p>
                  </div>
                )}
              </div>

              {(() => {
                  const now = new Date();
                  const eventStart = parseISO(selectedEvent.start_datetime);
                  const hoursUntilEvent = differenceInHours(eventStart, now);
                  const canRespond = hoursUntilEvent <= 48;

                  return canRespond ? (
                      <div className="flex gap-3">
                          <Button
                              onClick={() => {
                                  handleParticipationChange(selectedEvent.id, 'participating');
                                  setIsDialogOpen(false);
                              }}
                              className="flex-1"
                              variant={getUserParticipation(selectedEvent.id)?.status === 'participating' ? 'default' : 'outline'}
                              disabled={isUpdatingParticipation}
                          >
                              <CheckCircle className="w-4 h-4 me-2" />
                              {genderedTexts.participating}
                          </Button>
                          <Button
                              onClick={() => {
                                  handleParticipationChange(selectedEvent.id, 'not_participating');
                                  setIsDialogOpen(false);
                              }}
                              className="flex-1"
                              variant={getUserParticipation(selectedEvent.id)?.status === 'not_participating' ? 'destructive' : 'outline'}
                              disabled={isUpdatingParticipation}
                          >
                              <XCircle className="w-4 h-4 me-2" />
                              {genderedTexts.notParticipating}
                          </Button>
                      </div>
                  ) : (
                      <div className="text-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-yellow-800 text-sm">
                              {genderedTexts.responseAvailable}
                          </p>
                          <p className="text-yellow-600 text-xs mt-1">
                              {genderedTexts.hoursRemaining(Math.max(0, hoursUntilEvent))}
                          </p>
                      </div>
                  );
              })()}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}