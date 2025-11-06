
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GroupEvent, EventParticipation, UserGroup, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Clock, Users, PlusCircle, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { format, parseISO, isToday, isFuture } from 'date-fns';
import { he } from 'date-fns/locale';

const eventTypeOptions = [
    { value: 'workout', label: 'אימון קבוצתי' },
    { value: 'meeting', label: 'מפגש' },
    { value: 'assessment', label: 'מדידות והערכה' },
    { value: 'booster_special', label: 'אירוע בוסטר מיוחד' },
    { value: 'other', label: 'אחר' }
];

const initialFormState = {
    group_name: '',
    event_title: '',
    event_description: '',
    event_type: 'workout',
    start_datetime: '',
    end_datetime: '',
    location: ''
};

export default function GroupCalendar() {
    const [groups, setGroups] = useState([]);
    const [events, setEvents] = useState([]);
    const [participations, setParticipations] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [eventFormData, setEventFormData] = useState(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deletingEventId, setDeletingEventId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [eventToDelete, setEventToDelete] = useState(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const [groupsData, eventsData, participationsData] = await Promise.all([
                UserGroup.list(),
                GroupEvent.list('-start_datetime'),
                EventParticipation.list()
            ]);
            
            groupsData.sort((a, b) => a.name.localeCompare(b.name));
            setGroups(groupsData);
            setEvents(eventsData);
            setParticipations(participationsData);
        } catch (err) {
            console.error("Failed to load group calendar data:", err);
            setError("שגיאה בטעינת נתוני היומן. אנא נסה שוב.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredEvents = useMemo(() => {
        return selectedGroup === 'all'
            ? events
            : events.filter(event => event.group_name === selectedGroup);
    }, [events, selectedGroup]);

    const getEventsByDate = (date) => {
        try {
            // First validate the input date parameter
            if (!date) {
                console.warn('getEventsByDate called with null/undefined date');
                return [];
            }

            let inputDate;
            try {
                inputDate = new Date(date);
                if (isNaN(inputDate.getTime())) {
                    console.warn('Invalid input date provided to getEventsByDate:', date);
                    return [];
                }
            } catch (e) {
                console.warn('Could not convert input to date:', date, e);
                return [];
            }

            // Format the date string safely
            let dateStr;
            try {
                dateStr = format(inputDate, 'yyyy-MM-dd');
            } catch (formatError) {
                console.warn('Could not format input date:', inputDate, formatError);
                return [];
            }

            // Filter events safely
            const validEvents = [];
            
            for (const event of filteredEvents) {
                if (!event || !event.start_datetime) {
                    continue;
                }
                
                try {
                    let eventDateTime;
                    
                    // Handle different possible date formats
                    if (typeof event.start_datetime === 'string') {
                        if (event.start_datetime.includes('T')) {
                            eventDateTime = parseISO(event.start_datetime);
                        } else if (event.start_datetime.includes('/')) {
                            // Handle DD/MM/YYYY format
                            const parts = event.start_datetime.split('/');
                            if (parts.length === 3) {
                                const year = parts[2];
                                const month = parts[1].padStart(2, '0');
                                const day = parts[0].padStart(2, '0');
                                eventDateTime = new Date(`${year}-${month}-${day}`);
                            } else {
                                continue;
                            }
                        } else {
                            eventDateTime = new Date(event.start_datetime);
                        }
                    } else {
                        eventDateTime = new Date(event.start_datetime);
                    }
                    
                    // Validate the parsed event date
                    if (!eventDateTime || isNaN(eventDateTime.getTime())) {
                        console.warn(`Skipping event ${event.id} with invalid date: "${event.start_datetime}"`);
                        continue;
                    }
                    
                    // Format the event date safely
                    let eventDateStr;
                    try {
                        eventDateStr = format(eventDateTime, 'yyyy-MM-dd');
                    } catch (eventFormatError) {
                        console.warn(`Could not format event date for event ${event.id}:`, eventDateTime, eventFormatError);
                        continue;
                    }
                    
                    if (eventDateStr === dateStr) {
                        validEvents.push(event);
                    }
                    
                } catch (parseError) {
                    console.warn(`Error processing event ${event.id}:`, parseError.message, event.start_datetime);
                    continue;
                }
            }
            
            return validEvents;
            
        } catch (generalError) {
            console.error('General error in getEventsByDate:', generalError);
            return [];
        }
    };

    const formatEventTime = (startDateTime, endDateTime) => {
        try {
            if (!startDateTime || !endDateTime) return 'זמן לא זמין';
            
            let startDate, endDate;
            
            // Parse start date
            if (typeof startDateTime === 'string' && startDateTime.includes('T')) {
                startDate = parseISO(startDateTime);
            } else {
                startDate = new Date(startDateTime);
            }
            
            // Parse end date  
            if (typeof endDateTime === 'string' && endDateTime.includes('T')) {
                endDate = parseISO(endDateTime);
            } else {
                endDate = new Date(endDateTime);
            }
            
            if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                return <span className="text-red-600">זמן שגוי</span>;
            }
            
            try {
                const startTime = format(startDate, 'HH:mm');
                const endTime = format(endDate, 'HH:mm');
                return `${startTime} - ${endTime}`;
            } catch (formatError) {
                return <span className="text-red-600">זמן שגוי</span>;
            }
            
        } catch (error) {
            console.warn('Error formatting event time:', error);
            return <span className="text-red-600">זמן שגוי</span>;
        }
    };

    const getParticipationCount = (eventId) => {
        return participations.filter(p => p.event_id === eventId && p.status === 'participating').length;
    };

    const handleOpenDialog = (event = null) => {
        setEditingEvent(event);
        if (event) {
            setEventFormData({
                group_name: event.group_name,
                event_title: event.event_title,
                event_description: event.event_description || '',
                event_type: event.event_type,
                start_datetime: format(parseISO(event.start_datetime), "yyyy-MM-dd'T'HH:mm"),
                end_datetime: format(parseISO(event.end_datetime), "yyyy-MM-dd'T'HH:mm"),
                location: event.location || ''
            });
        } else {
            const defaultStartDate = new Date(selectedDate);
            defaultStartDate.setHours(19, 0);
            const defaultEndDate = new Date(defaultStartDate);
            defaultEndDate.setHours(20, 0);

            setEventFormData({
                ...initialFormState,
                start_datetime: format(defaultStartDate, "yyyy-MM-dd'T'HH:mm"),
                end_datetime: format(defaultEndDate, "yyyy-MM-dd'T'HH:mm"),
            });
        }
        setIsDialogOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setEventFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setEventFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveEvent = async () => {
        if (!eventFormData.event_title || !eventFormData.group_name || !eventFormData.start_datetime || !eventFormData.end_datetime) {
            alert("יש למלא את כל שדות החובה: כותרת, קבוצה, ותאריכי התחלה וסיום.");
            return;
        }
        setIsSubmitting(true);
        try {
            const dataToSave = {
                ...eventFormData,
                start_datetime: new Date(eventFormData.start_datetime).toISOString(),
                end_datetime: new Date(eventFormData.end_datetime).toISOString(),
            };

            if (editingEvent) {
                await GroupEvent.update(editingEvent.id, dataToSave);
            } else {
                const currentUser = await User.me();
                await GroupEvent.create({ ...dataToSave, created_by: currentUser.email });
            }
            setIsDialogOpen(false);
            setEditingEvent(null);
            loadData(); // Refresh data
        } catch (err) {
            console.error("Error saving event:", err);
            alert("שגיאה בשמירת האירוע.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleDeleteEvent = async (event) => {
        setEventToDelete(event);
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!eventToDelete) return;
        
        setDeletingEventId(eventToDelete.id);
        try {
            await GroupEvent.delete(eventToDelete.id);
            
            // Also delete related participations
            const relatedParticipations = participations.filter(p => p.event_id === eventToDelete.id);
            await Promise.all(relatedParticipations.map(p => EventParticipation.delete(p.id)));
            
            // Update local state
            setEvents(events.filter(e => e.id !== eventToDelete.id));
            setParticipations(participations.filter(p => p.event_id !== eventToDelete.id));
            
            setShowDeleteConfirm(false);
            setEventToDelete(null);
            
        } catch (err) {
            console.error("Failed to delete event:", err);
            alert("שגיאה במחיקת האירוע. נסה שוב.");
        } finally {
            setDeletingEventId(null);
        }
    };

    // Safe date selection handler
    const handleDateSelect = (newDate) => {
        try {
            if (newDate && !isNaN(new Date(newDate).getTime())) {
                setSelectedDate(newDate);
            }
        } catch (e) {
            console.warn('Invalid date selected:', newDate, e);
        }
    };


    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <Card className="border-red-200">
                <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2"><AlertTriangle /> שגיאה</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-slate-700 mb-4">{error}</p>
                    <Button onClick={loadData} variant="outline">
                        <RefreshCw className="w-4 h-4 ml-2" />
                        נסה שוב
                    </Button>
                </CardContent>
            </Card>
        );
    }
    
    const eventsForSelectedDate = getEventsByDate(selectedDate);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="w-5 h-5" />
                        יומן קבוצתי
                    </CardTitle>
                    <div className="flex gap-4">
                        <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                            <SelectTrigger className="w-full sm:w-[200px]">
                                <SelectValue placeholder="סינון לפי קבוצה" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">כל הקבוצות</SelectItem>
                                {groups.map(group => (
                                    <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={() => handleOpenDialog()}>
                            <PlusCircle className="w-4 h-4 ml-2" />
                            אירוע חדש
                        </Button>
                        <Button variant="outline" onClick={loadData} disabled={isLoading}>
                            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
                            רענן
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Calendar */}
                    <div>
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            locale={he}
                            className="w-full border rounded-md"
                            components={{
                                DayContent: ({ date }) => {
                                    const dayEvents = getEventsByDate(date);
                                    return (
                                        <div className="relative w-full h-full flex items-center justify-center">
                                            <span>
                                                {(() => {
                                                    try {
                                                        return format(date, 'd');
                                                    } catch {
                                                        return '?';
                                                    }
                                                })()}
                                            </span>
                                            {dayEvents.length > 0 && (
                                                <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                                            )}
                                        </div>
                                    );
                                }
                            }}
                        />
                    </div>

                    {/* Events for selected date */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">
                            אירועים עבור {(() => {
                                    try {
                                        return format(selectedDate, 'dd/MM/yyyy', { locale: he });
                                    } catch {
                                        return 'תאריך שגוי';
                                    }
                                })()}
                        </h3>
                        <ScrollArea className="h-80">
                            <div className="space-y-3">
                                {(() => {
                                    try {
                                        const eventsForDate = getEventsByDate(selectedDate);
                                        
                                        if (eventsForDate.length === 0) {
                                            return (
                                                <div className="text-center text-gray-500 py-8">
                                                    <p>אין אירועים לתאריך זה</p>
                                                </div>
                                            );
                                        }
                                        
                                        return eventsForDate.map(event => {
                                            if (!event || !event.id) {
                                                return (
                                                    <Card key={Math.random()} className="p-4 border-red-500 bg-red-50">
                                                        <p className="text-red-700">נתוני אירוע פגומים</p>
                                                    </Card>
                                                );
                                            }

                                            const participationCount = getParticipationCount(event.id);
                                            const eventTypeLabel = eventTypeOptions.find(opt => opt.value === event.event_type)?.label || event.event_type;
                                            const timeDisplay = formatEventTime(event.start_datetime, event.end_datetime);

                                            return (
                                                <Card key={event.id} className="p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-semibold">{event.event_title || 'אירוע ללא כותרת'}</h4>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleOpenDialog(event)}
                                                                className="text-blue-600 hover:text-blue-800"
                                                            >
                                                                ערוך
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteEvent(event)}
                                                                disabled={deletingEventId === event.id}
                                                                className="text-red-600 hover:text-red-800"
                                                            >
                                                                {deletingEventId === event.id ? (
                                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                                ) : (
                                                                    'מחק'
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                    
                                                    <p className="text-sm text-gray-600 mb-2">{event.event_description || 'אין תיאור לאירוע.'}</p>
                                                    
                                                    <div className="flex flex-wrap gap-2 text-xs">
                                                        <Badge variant="outline">{eventTypeLabel}</Badge>
                                                        <Badge variant="outline">
                                                            <Clock className="w-3 h-3 ml-1" />
                                                            {timeDisplay}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            <Users className="w-3 h-3 ml-1" />
                                                            {participationCount} משתתפים
                                                        </Badge>
                                                        {event.location && (
                                                            <Badge variant="outline">{event.location}</Badge>
                                                        )}
                                                    </div>
                                                </Card>
                                            );
                                        });
                                    } catch (displayError) {
                                        console.error('Error displaying events:', displayError);
                                        return (
                                            <div className="text-center text-red-500 py-8">
                                                <p>שגיאה בהצגת האירועים</p>
                                            </div>
                                        );
                                    }
                                })()}
                            </div>
                        </ScrollArea>
                    </div>
                </CardContent>
            </Card>

            {/* Upcoming Events Section */}
            <Card>
                <CardHeader>
                    <CardTitle>אירועים קרובים</CardTitle>
                    <CardDescription>האירועים הבאים המתוכננים ביומן.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {filteredEvents.filter(event => {
                            try {
                                return isFuture(parseISO(event.start_datetime)) || isToday(parseISO(event.start_datetime));
                            } catch {
                                return false;
                            }
                        })
                        .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
                        .slice(0, 5).length > 0 ? (
                            filteredEvents.filter(event => {
                                try {
                                    return isFuture(parseISO(event.start_datetime)) || isToday(parseISO(event.start_datetime));
                                } catch {
                                    return false;
                                }
                            })
                            .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
                            .slice(0, 5).map(event => {
                                const participationCount = getParticipationCount(event.id);
                                return (
                                    <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg bg-slate-50">
                                        <div>
                                            <h4 className="font-medium">{event.event_title} ({event.group_name})</h4>
                                            <p className="text-sm text-gray-600">
                                                {format(parseISO(event.start_datetime), 'dd/MM/yyyy HH:mm', { locale: he })}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                                            <Badge variant="outline">
                                                <Users className="w-3 h-3 ml-1" />
                                                {participationCount}
                                            </Badge>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleOpenDialog(event)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    ערוך
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteEvent(event)}
                                                    disabled={deletingEventId === event.id}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    {deletingEventId === event.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        'מחק'
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-gray-500 text-center py-4">אין אירועים קרובים מתוכננים.</p>
                        )}
                    </div>
                </CardContent>
            </Card>


            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>{editingEvent ? 'עריכת אירוע' : 'יצירת אירוע חדש'}</DialogTitle>
                        <DialogDescription>
                            {editingEvent ? 'עדכן את פרטי האירוע.' : 'מלא את פרטי האירוע החדש.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="event_title">כותרת האירוע *</Label>
                                <Input id="event_title" name="event_title" value={eventFormData.event_title} onChange={handleFormChange} />
                            </div>
                            <div>
                                <Label htmlFor="group_name">קבוצה *</Label>
                                <Select value={eventFormData.group_name} onValueChange={(value) => handleSelectChange('group_name', value)}>
                                    <SelectTrigger><SelectValue placeholder="בחר קבוצה" /></SelectTrigger>
                                    <SelectContent>
                                        {groups.map(group => (
                                            <SelectItem key={group.id} value={group.name}>{group.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="event_type">סוג האירוע</Label>
                            <Select value={eventFormData.event_type} onValueChange={(value) => handleSelectChange('event_type', value)}>
                                <SelectTrigger><SelectValue/></SelectTrigger>
                                <SelectContent>
                                    {eventTypeOptions.map(option => (
                                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="event_description">תיאור</Label>
                            <Textarea id="event_description" name="event_description" value={eventFormData.event_description} onChange={handleFormChange} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="start_datetime">שעת התחלה *</Label>
                                <Input id="start_datetime" name="start_datetime" type="datetime-local" value={eventFormData.start_datetime} onChange={handleFormChange} />
                            </div>
                            <div>
                                <Label htmlFor="end_datetime">שעת סיום *</Label>
                                <Input id="end_datetime" name="end_datetime" type="datetime-local" value={eventFormData.end_datetime} onChange={handleFormChange} />
                            </div>
                        </div>
                         <div>
                            <Label htmlFor="location">מיקום</Label>
                            <Input id="location" name="location" value={eventFormData.location} onChange={handleFormChange} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>ביטול</Button>
                        <Button onClick={handleSaveEvent} disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : null}
                            {isSubmitting ? 'שומר...' : 'שמור אירוע'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>האם אתה בטוח שברצונך למחוק את האירוע?</DialogTitle>
                        <DialogDescription>
                            פעולה זו תמחק את האירוע "{eventToDelete?.event_title}" באופן סופי ולא ניתן יהיה לשחזר אותו.
                            כל ההרשמות לאירוע זה יימחקו גם כן.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2">
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={deletingEventId}>
                            ביטול
                        </Button>
                        <Button 
                            variant="destructive" 
                            onClick={confirmDelete}
                            disabled={deletingEventId}
                        >
                            {deletingEventId ? (
                                <>
                                    <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                                    מוחק...
                                </>
                            ) : (
                                'מחק אירוע'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
