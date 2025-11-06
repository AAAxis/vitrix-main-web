
import React, { useState, useEffect, useMemo } from 'react';
import { TerminationFeedback, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Search, MessageSquare, Star, User as UserIcon, Calendar, Image, CheckCircle, XCircle, ChevronLeft, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Button } from '@/components/ui/button';

const processText = (text = '', gender) => {
    if (!text) return '';
    const genderKey = gender === 'female' ? 'female' : 'male';
    return text.replace(/\[MALE\](.*?)\[FEMALE\](.*?)\[\/MALE\]/gs, (match, maleText, femaleText) => {
        return genderKey === 'male' ? maleText : femaleText;
    });
};

const weeklyQuestions = [
    { week: 1, topic: 'מים', question: 'עד כמה שמירה על שתייה מספקת ביום השפיעה [MALE]עליך[FEMALE]עלייך[/MALE] במהלך התהליך?\u200e', icon: '💧', options: ['מאוד השפיעה', 'במידה מסוימת', 'כמעט שלא', 'אחר'] },
    { week: 2, topic: 'תיעוד ארוחות', question: 'עד כמה תיעוד הארוחות והמודעות למה [MALE]שאתה[FEMALE]שאת[/MALE] אוכל שינו את הדרך שבה [MALE]אתה[FEMALE]את[/MALE] מתנהל?\u200e', icon: '🍽️', options: ['מאוד', 'חלקית', 'כמעט שלא', 'אחר'] },
    { week: 3, topic: 'פיתויים', question: 'עד כמה [MALE]למדת[FEMALE]למדת[/MALE] לזהות פיתויים ולהתמודד איתם אחרת מבעבר?\u200e', icon: '🍭', options: ['במידה רבה', 'במידה בינונית', 'כמעט שלא', 'אחר'] },
    { week: 4, topic: 'בחירה בעצמך', question: 'עד כמה [MALE]מצאת[FEMALE]מצאת[/MALE] זמן [MALE]לעצמך[FEMALE]לעצמך[/MALE] ולחיזוק עצמי מחוץ לאוכל והשפעתו [MALE]עליך[FEMALE]עלייך[/MALE]?\u200e', icon: '👁️', options: ['מאוד', 'חלקית', 'כמעט שלא', 'אחר'] },
    { week: 5, topic: 'עשייה', question: 'עד כמה היכולת [MALE]שלך[FEMALE]שלך[/MALE] לפעול גם כשאין חשק השתפרה במהלך התהליך?\u200e', icon: '🔥', options: ['מאוד', 'חלקית', 'כמעט שלא', 'אחר'] },
    { week: 6, topic: 'כוח', question: 'עד כמה [MALE]אתה מרגיש[FEMALE]את מרגישה[/MALE] שהתחזקת — פיזית או מנטלית — בעקבות התהליך?\u200e', icon: '💪', options: ['מאוד', 'חלקית', 'כמעט שלא', 'אחר'] },
    { week: 7, topic: 'סטרס', question: 'עד כמה [MALE]הצלחת[FEMALE]הצלחת[/MALE] לפתח כלים או הרגלים להפחתת מתח ולניהול רגשות?\u200e', icon: '🧘', options: ['מאוד', 'חלקית', 'כמעט שלא', 'אחר'] },
    { week: 8, topic: 'עקביות', question: 'עד כמה [MALE]הצלחת[FEMALE]הצלחת[/MALE] לשמור על עקביות בבחירות ובהרגלים החדשים [MALE]שלך[FEMALE]שלך[/MALE]?\u200e', icon: '🛠️', options: ['מאוד', 'חלקית', 'כמעט שלא', 'אחר'] },
    { week: 9, topic: 'הצלחה', question: 'עד כמה [MALE]אתה מרגיש שאתה[FEMALE]את מרגישה שאת[/MALE] פועל כיום כמו אדם שהצליח?\u200e', icon: '🆕', options: ['מאוד', 'חלקית', 'כמעט שלא', 'אחר'] },
    { week: 10, topic: 'דיבור פנימי', question: 'עד כמה השתנתה הדרך שבה [MALE]אתה[FEMALE]את[/MALE] מדבר [MALE]לעצמך[FEMALE]לעצמך[/MALE] ומעודד את [MALE]עצמך[FEMALE]עצמך[/MALE]?\u200e', icon: '💬', options: ['מאוד', 'חלקית', 'כמעט שלא', 'אחר'] },
    { week: 11, topic: 'חיבור', question: 'עד כמה [MALE]אתה מרגיש[FEMALE]את מרגישה[/MALE] שכל חלקי התהליך התחברו לתמונה אחת שלמה?\u200e', icon: '🧩', options: ['מאוד', 'חלקית', 'כמעט שלא', 'אחר'] },
    { week: 12, topic: 'זהות חדשה', question: 'עד כמה [MALE]אתה מרגיש[FEMALE]את מרגישה[/MALE] שנוצר שינוי אמיתי בזהות [MALE]שלך[FEMALE]שלך[/MALE] ובדרך שבה [MALE]אתה[FEMALE]את[/MALE] רואה את [MALE]עצמך[FEMALE]עצמך[/MALE]?\u200e', icon: '🌟', options: ['מאוד', 'חלקית', 'כמעט שלא', 'אחר'] }
];

const StarRatingDisplay = ({ rating, size = 'w-5 h-5' }) => (
    <div className="flex gap-1" dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                className={`${size} ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
            />
        ))}
    </div>
);

const FeedbackListItem = ({ feedback, onSelect, onDeleteRequest }) => {
    return (
        <div className="w-full text-right p-4 rounded-lg bg-white hover:bg-slate-50 transition-all duration-200 border shadow-sm group relative">
            <DialogTrigger asChild>
                <div onClick={() => onSelect(feedback)} className="cursor-pointer">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <img 
                                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(feedback.user_name || 'U')}&background=random&size=96`} 
                                alt={feedback.user_name}
                                className="w-12 h-12 rounded-full"
                            />
                            <div>
                                <p className="font-bold text-slate-800 text-base">{feedback.user_name}</p>
                                <p className="text-sm text-slate-500">{feedback.user_email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <span className="text-xs text-slate-400">פרטים נוספים</span>
                            <ChevronLeft className="w-4 h-4 text-slate-400"/>
                        </div>
                    </div>
                    <Separator className="my-3"/>
                    <div className="flex justify-between items-center text-sm">
                         <div className="flex items-center gap-2 text-slate-600">
                            <Calendar className="w-4 h-4 ml-1"/>
                            <span>{format(new Date(feedback.submitted_at), 'dd/MM/yy HH:mm')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-600">שביעות רצון:</span>
                            <StarRatingDisplay rating={feedback.process_satisfaction_rating} size="w-4 h-4" />
                        </div>
                    </div>
                </div>
            </DialogTrigger>
            <div className="absolute top-2 left-2">
                <Button variant="ghost" size="icon" className="w-8 h-8 text-slate-400 hover:text-red-500 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); onDeleteRequest(feedback); }}>
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
};


export default function TerminationFeedbackViewer() {
    const [feedbacks, setFeedbacks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [selectedUserDetails, setSelectedUserDetails] = useState(null);
    const [isFetchingDetails, setIsFetchingDetails] = useState(false);
    const [feedbackToDelete, setFeedbackToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const loadFeedbacks = async () => {
            setIsLoading(true);
            try {
                const allFeedbacks = await TerminationFeedback.list('-submitted_at');
                setFeedbacks(allFeedbacks);
            } catch (err) {
                console.error("Error loading feedbacks:", err);
                setError('שגיאה בטעינת משובי הסיום.');
            } finally {
                setIsLoading(false);
            }
        };
        loadFeedbacks();
    }, []);

    useEffect(() => {
        if (selectedFeedback) {
            const fetchUserDetails = async () => {
                setIsFetchingDetails(true);
                try {
                    const users = await User.filter({ email: selectedFeedback.user_email }, '', 1);
                    if (users.length > 0) {
                        setSelectedUserDetails(users[0]);
                    } else {
                        setSelectedUserDetails({ gender: 'male' }); // Fallback
                    }
                } catch (err) {
                    console.error("Error fetching user details for feedback:", err);
                    setSelectedUserDetails({ gender: 'male' }); // Fallback on error
                } finally {
                    setIsFetchingDetails(false);
                }
            };
            fetchUserDetails();
        } else {
            setSelectedUserDetails(null);
        }
    }, [selectedFeedback]);

    const filteredFeedbacks = useMemo(() => {
        if (!searchTerm) return feedbacks;
        return feedbacks.filter(fb =>
            fb.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            fb.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm, feedbacks]);

    const handleDeleteRequest = async (feedback) => {
        let gender = 'male'; // Default gender
        try {
            // Check if user details for this feedback are already available (e.g., if dialog was open)
            if (selectedFeedback?.id === feedback.id && selectedUserDetails) {
                gender = selectedUserDetails.gender;
            } else {
                // Otherwise, fetch user gender specifically for this delete confirmation
                const users = await User.filter({ email: feedback.user_email }, '', 1);
                if (users.length > 0) {
                    gender = users[0].gender;
                }
            }
        } catch (err) {
            console.error("Error fetching user gender for delete confirmation:", err);
            // Will fallback to 'male'
        }
        setFeedbackToDelete({ ...feedback, user_gender: gender });
    };


    const handleDelete = async () => {
        if (!feedbackToDelete) return;
        setIsDeleting(true);
        try {
            await TerminationFeedback.delete(feedbackToDelete.id);
            setFeedbacks(prev => prev.filter(fb => fb.id !== feedbackToDelete.id));
            setFeedbackToDelete(null); // Close the dialog
            if (selectedFeedback?.id === feedbackToDelete.id) {
                setSelectedFeedback(null); // Close details dialog if open
            }
            // Optionally show a success toast here
        } catch (err) {
            console.error("Error deleting feedback:", err);
            // Optionally show an error toast to the user
        } finally {
            setIsDeleting(false);
        }
    };

    const renderDetail = (label, value, isQuote = false) => {
        if (!value && typeof value !== 'number') return null;
        return (
            <div className="py-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
                {isQuote ? (
                     <p className="text-slate-800 italic border-l-4 border-slate-200 pl-3 mt-1">"{value}"</p>
                ) : (
                    <p className="text-slate-800">{Array.isArray(value) ? value.join(', ') : value}</p>
                )}
            </div>
        );
    };
    
    if (isLoading) {
        return <div className="flex justify-center items-center h-60"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>;
    }

    if (error) {
        return <div className="text-red-600 bg-red-50 p-4 rounded-lg text-center">{error}</div>;
    }

    return (
        <Card className="shadow-lg border-t-4 border-blue-500" dir="rtl">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <CardTitle>משובי סיום תהליך</CardTitle>
                        <CardDescription>צפייה וניתוח משובים שנשלחו על ידי מתאמנים בסיום התהליך.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-4 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="חיפוש לפי שם או אימייל..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Dialog onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setSelectedFeedback(null);
                        setSelectedUserDetails(null);
                    }
                }}>
                    <ScrollArea className="h-[60vh]">
                        <div className="p-1 space-y-3">
                            {filteredFeedbacks.length > 0 ? (
                                filteredFeedbacks.map(fb => (
                                    <FeedbackListItem 
                                        key={fb.id} 
                                        feedback={fb} 
                                        onSelect={setSelectedFeedback}
                                        onDeleteRequest={handleDeleteRequest}
                                    />
                                ))
                            ) : (
                                <div className="text-center py-16 text-slate-500">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                                    <p className="font-semibold">לא נמצאו משובי סיום</p>
                                    <p className="text-sm">כאשר משתמשים ישלחו משוב, הוא יופיע כאן.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                    {selectedFeedback && (
                        <DialogContent className="max-w-3xl max-h-[90vh]" dir="rtl">
                            <DialogHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <DialogTitle className="text-2xl">משוב סיום של {selectedFeedback.user_name}</DialogTitle>
                                        <DialogDescription>
                                            נשלח בתאריך: {format(new Date(selectedFeedback.submitted_at), 'dd/MM/yyyy HH:mm')}
                                        </DialogDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600" onClick={() => handleDeleteRequest(selectedFeedback)}>
                                        <Trash2 className="w-5 h-5"/>
                                    </Button>
                                </div>
                            </DialogHeader>
                            <ScrollArea className="h-[70vh] -mx-6 px-6">
                                {isFetchingDetails ? (
                                    <div className="flex justify-center items-center h-full">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        
                                        <Card>
                                            <CardHeader><CardTitle className="text-base">סיכום ודירוגים</CardTitle></CardHeader>
                                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                                                <div className="p-2 rounded-lg bg-slate-50">
                                                    <p className="text-sm font-semibold">שביעות רצון מהתהליך</p>
                                                    <StarRatingDisplay rating={selectedFeedback.process_satisfaction_rating} />
                                                </div>
                                                <div className="p-2 rounded-lg bg-slate-50">
                                                    <p className="text-sm font-semibold">תמיכת המאמן/ת</p>
                                                    <StarRatingDisplay rating={selectedFeedback.coach_support_rating} />
                                                </div>
                                                <div className="p-2 rounded-lg bg-slate-50">
                                                    <p className="text-sm font-semibold">בהירות ההנחיות</p>
                                                    <StarRatingDisplay rating={selectedFeedback.coach_clarity_rating} />
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader><CardTitle className="text-base">חוות דעת על התהליך</CardTitle></CardHeader>
                                            <CardContent className="space-y-2">
                                                {renderDetail("השינוי הגדול ביותר", selectedFeedback.biggest_change)}
                                                {renderDetail("פירוט על השינוי", selectedFeedback.biggest_change_details)}
                                                {renderDetail("החלק המשמעותי ביותר", selectedFeedback.most_significant_part)}
                                                {renderDetail("הצעות לשיפור", selectedFeedback.improvement_suggestions)}
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader><CardTitle className="text-base">חוות דעת על המאמן/ת</CardTitle></CardHeader>
                                            <CardContent className="space-y-2">
                                                {renderDetail("הקשר עם המאמן/ת", selectedFeedback.coach_relationship)}
                                                {renderDetail("פירוט על הקשר", selectedFeedback.coach_relationship_details)}
                                                {renderDetail("ציון לשבח", selectedFeedback.coach_praise)}
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader><CardTitle className="text-base">משוב שבועי</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                {selectedFeedback.weekly_feedback?.sort((a, b) => a.week - b.week).map(w => {
                                                    const questionDef = weeklyQuestions.find(q => q.week === w.week);
                                                    const gender = selectedUserDetails?.gender || 'male';
                                                    return (
                                                        <div key={w.week} className="p-4 rounded-lg bg-slate-50 border transition-all hover:shadow-sm">
                                                            <div className="flex items-start gap-4">
                                                                <span className="text-2xl mt-1">{questionDef?.icon || '❓'}</span>
                                                                <div className="flex-1">
                                                                    <p className="font-bold text-slate-800">{w.topic}</p>
                                                                    <p className="text-sm text-slate-600 mb-2">{processText(questionDef?.question, gender)}</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-semibold text-blue-600">{w.answer}</span>
                                                                    </div>
                                                                    {w.details && (
                                                                        <div className="mt-2 text-sm text-slate-500 italic p-2 bg-slate-100 rounded-md border-r-4 border-slate-300 pr-3">
                                                                            <strong>פירוט:</strong> {w.details}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </CardContent>
                                        </Card>

                                        <Card>
                                            <CardHeader><CardTitle className="text-base">סיכום ופרסום</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                {renderDetail("משפט סיכום אישי", selectedFeedback.personal_summary, true)}
                                                {selectedFeedback.before_after_image_url && (
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-600 mb-2">תמונת לפני/אחרי:</p>
                                                        <a href={selectedFeedback.before_after_image_url} target="_blank" rel="noopener noreferrer" className="block w-full max-w-sm mx-auto">
                                                            <img src={selectedFeedback.before_after_image_url} alt="Before/After" className="rounded-lg shadow-md w-full" />
                                                        </a>
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-600 mb-1">אישור פרסום:</p>
                                                    <Badge variant={selectedFeedback.publish_permission ? 'default' : 'destructive'} className={selectedFeedback.publish_permission ? 'bg-green-100 border-green-300 text-green-700' : 'bg-red-100 border-red-300 text-red-700'}>
                                                        {selectedFeedback.publish_permission ? <><CheckCircle className="w-4 h-4 ml-1" /> ניתן לפרסום</> : <><XCircle className="w-4 h-4 ml-1" /> לא לפרסום</>}
                                                    </Badge>
                                                </div>
                                            </CardContent>
                                        </Card>

                                    </div>
                                )}
                            </ScrollArea>
                        </DialogContent>
                    )}
                </Dialog>

                {/* AlertDialog for Delete Confirmation */}
                <AlertDialog open={!!feedbackToDelete} onOpenChange={(isOpen) => !isOpen && setFeedbackToDelete(null)}>
                    <AlertDialogContent dir="rtl">
                        <AlertDialogHeader>
                            <AlertDialogTitle>אישור מחיקת משוב</AlertDialogTitle>
                            <AlertDialogDescription
                                dangerouslySetInnerHTML={{
                                    __html: processText(
                                        `האם [MALE]אתה בטוח שאתה רוצה[FEMALE]את בטוחה שאת רוצה[/MALE] למחוק לצמיתות את המשוב של <span class="font-bold">${feedbackToDelete?.user_name}</span>? לא ניתן לשחזר פעולה זו.`,
                                        feedbackToDelete?.user_gender
                                    )
                                }}
                            />
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>ביטול</AlertDialogCancel>
                            <Button
                                variant="destructive"
                                onClick={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : 'מחק'}
                            </Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

            </CardContent>
        </Card>
    );
}
