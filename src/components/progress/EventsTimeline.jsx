
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GroupEvent, EventParticipation, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, MapPin, Users, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { format, parseISO, isToday, isFuture, isPast, addHours, subHours, differenceInHours } from 'date-fns';
import { he } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';

// New EventCard component
const EventCard = ({ event, participation, onParticipationChange, isUpdating, genderedTexts }) => {
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

  const status = getEventStatus(event);
  const now = new Date();
  const eventStart = parseISO(event.start_datetime);
  const hoursUntilEvent = differenceInHours(eventStart, now);
  const isPastEvent = isPast(eventStart) && !isToday(eventStart); // Define isPastEvent here
  const canRespond = hoursUntilEvent <= 48 && !isPastEvent;

  return (
    <Card className="border-r-4 border-r-purple-500 hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
              <Calendar className="w-5 h-5 text-purple-600" />
            </div>
            <div className="flex-1">
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
          <div className="flex items-center justify-between text-sm flex-wrap gap-2">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-500" />
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
                  onClick={() => onParticipationChange(event.id, 'participating')}
                  disabled={isUpdating}
                  className="text-xs"
                >
                  <CheckCircle className="w-4 h-4 ml-1" />
                  {genderedTexts.participating}
                </Button>
                <Button
                  size="sm"
                  variant={participation?.status === 'not_participating' ? 'default' : 'outline'}
                  onClick={() => onParticipationChange(event.id, 'not_participating')}
                  disabled={isUpdating}
                  className="text-xs"
                >
                  <XCircle className="w-4 h-4 ml-1" />
                  {genderedTexts.notParticipating}
                </Button>
              </div>
            ) : isPastEvent ? (
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-md">
                האירוע הסתיים
              </div>
            ) : (
              <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-md">
                {genderedTexts.responseAvailable}
              </div>
            )}
          </div>
        </div>

        {participation && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="w-3 h-3 ml-1" />
                תגובתך: {participation.status === 'participating' ? genderedTexts.participating : genderedTexts.notParticipating}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};


export default function EventsTimeline({ user }) {
  const [events, setEvents] = useState([]);
  const [participations, setParticipations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdatingParticipation, setIsUpdatingParticipation] = useState(false);

  // Gender-based texts
  const genderedTexts = useMemo(() => {
    const isFemale = user?.gender === 'female';
    return {
      participating: isFemale ? 'משתתפת' : 'משתתף',
      notParticipating: isFemale ? 'לא משתתפת' : 'לא משתתף',
      responseAvailable: 'תגובה תהיה זמינה 48 שעות לפני האירוע',
    };
  }, [user?.gender]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      if (!user?.group_names?.length) {
        setEvents([]);
        setParticipations([]);
        setIsLoading(false);
        return;
      }

      const [allEvents, userParticipations] = await Promise.all([
        GroupEvent.filter({ group_name: { $in: user.group_names } }, '-start_datetime'),
        EventParticipation.filter({ user_email: user.email })
      ]);
      
      setEvents(allEvents);
      setParticipations(userParticipations);
      
    } catch (err) {
      console.error('Error loading events:', err);
      setError('שגיאה בטעינת נתוני האירועים. אנא נסה שוב.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.group_names, user?.email]);

  useEffect(() => {
    if (user?.email) {
      loadData();
    }
  }, [user?.email, loadData]);

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
      
      // Refresh participations after update
      const updatedParticipations = await EventParticipation.filter({ user_email: user.email });
      setParticipations(updatedParticipations);

    } catch (err) {
      console.error('Error updating participation:', err);
      setError('שגיאה בעדכון ההשתתפות');
    } finally {
      setIsUpdatingParticipation(false);
    }
  };

  const categorizedEvents = useMemo(() => {
    const now = new Date();
    
    const upcoming = [];
    const past = [];
    
    events.forEach(event => {
      try {
        const eventStart = parseISO(event.start_datetime);
        
        if (isPast(eventStart) && !isToday(eventStart)) {
          past.push(event);
        } else {
          upcoming.push(event);
        }
      } catch {
        // If date parsing fails, treat as upcoming
        upcoming.push(event);
      }
    });
    
    return {
      upcoming: upcoming.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime)),
      past: past.sort((a, b) => new Date(b.start_datetime) - new Date(a.start_datetime))
    };
  }, [events]);


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
            <RefreshCw className="w-4 h-4 ml-2" />
            נסה שוב
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!user?.group_names?.length) {
    return (
      <Card className="muscle-glass">
        <CardContent className="text-center py-12">
          <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">
            לא משויך לקבוצות
          </h3>
          <p className="text-gray-500">
            פנה למאמן כדי להשתייך לקבוצה ולראות אירועים
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="muscle-glass border-0 shadow-lg" dir="rtl">
      <CardHeader className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <div>📅 לוח אירועים קבוצתיים</div>
            <div className="text-purple-100 text-sm mt-1">
              אירועים ופעילויות הקבוצה שלך
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {events.length === 0 ? (
          <div className="text-center py-10 text-slate-500">
            <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold">אין אירועים להצגה</h3>
            <p className="text-sm">עדיין לא נקבעו אירועים לקבוצה שלך.</p>
          </div>
        ) : (
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">אירועים קרובים ({categorizedEvents.upcoming.length})</TabsTrigger>
              <TabsTrigger value="past">אירועים שעברו ({categorizedEvents.past.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming" className="mt-4">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-4 pl-2">
                  {categorizedEvents.upcoming.length > 0 ? (
                    <AnimatePresence>
                      {categorizedEvents.upcoming.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <EventCard 
                            event={event}
                            participation={getUserParticipation(event.id)}
                            onParticipationChange={handleParticipationChange}
                            isUpdating={isUpdatingParticipation}
                            genderedTexts={genderedTexts}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <div className="text-center py-10 text-slate-500">
                      <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">אין אירועים קרובים</h3>
                      <p className="text-gray-500">אירועים חדשים יופיעו כאן כאשר יתווספו</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="past" className="mt-4">
              <ScrollArea className="h-[calc(100vh-350px)]">
                <div className="space-y-4 pl-2">
                  {categorizedEvents.past.length > 0 ? (
                    <AnimatePresence>
                      {categorizedEvents.past.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <EventCard 
                            event={event}
                            participation={getUserParticipation(event.id)}
                            onParticipationChange={handleParticipationChange} // Even for past events, participation can be shown
                            isUpdating={isUpdatingParticipation}
                            genderedTexts={genderedTexts}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <div className="text-center py-10 text-slate-500">
                      <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                      <h3 className="text-lg font-semibold text-gray-600 mb-2">אין אירועים קודמים</h3>
                      <p className="text-gray-500">אירועים שהסתיימו יופיעו כאן</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
