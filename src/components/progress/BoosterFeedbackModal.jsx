
import React, { useState, useMemo } from 'react';
import { User, TerminationFeedback, CoachNotification } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Loader2, Star, Upload, Trash2, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

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

const biggestChangeOptions = ['גוף', 'תזונה', 'מיינדסט', 'ביטחון עצמי'];
const coachRelationshipOptions = ['מעולה', 'טוב', 'צריך שיפור'];

const StarRating = ({ rating, setRating, disabled }) => (
    <div className="flex gap-2" dir="ltr">
        {[1, 2, 3, 4, 5].map((star) => (
            <Star
                key={star}
                className={`w-10 h-10 cursor-pointer transition-all duration-200 ${rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300 hover:text-yellow-200'}`}
                onClick={() => !disabled && setRating(star)}
            />
        ))}
    </div>
);

export default function BoosterFeedbackModal({ user, isOpen, onFinish, reportId, onClose }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [currentPart, setCurrentPart] = useState(1);
    const gender = user?.gender === 'female' ? 'female' : 'male';

    const [feedback, setFeedback] = useState({
        weekly: weeklyQuestions.map(q => ({ week: q.week, topic: q.topic, question: q.question, answer: '', details: '' })),
        processSatisfaction: 0,
        biggestChange: [],
        biggestChangeDetails: '',
        mostSignificantPart: '',
        improvementSuggestions: '',
        coachSupport: 0,
        coachClarity: 0,
        coachRelationship: '',
        coachRelationshipDetails: '',
        coachPraise: '',
        personalSummary: '',
        publishPermission: false,
        beforeAfterImage: null,
        beforeAfterImageUrl: ''
    });

    const handleWeeklyChange = (week, key, value) => {
        setFeedback(prev => ({
            ...prev,
            weekly: prev.weekly.map(w => w.week === week ? { ...w, [key]: value } : w)
        }));
    };

    const handleBiggestChange = (option) => {
        setFeedback(prev => {
            const newSelection = prev.biggestChange.includes(option)
                ? prev.biggestChange.filter(item => item !== option)
                : [...prev.biggestChange, option];
            return { ...prev, biggestChange: newSelection };
        });
    };
    
    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setFeedback(prev => ({...prev, beforeAfterImage: file}));
        setIsSubmitting(true);
        try {
            const { file_url } = await UploadFile({ file });
            setFeedback(prev => ({...prev, beforeAfterImageUrl: file_url}));
        } catch (uploadError) {
            console.error("Image upload error", uploadError);
            setError("שגיאה בהעלאת התמונה. ניתן להמשיך ללא תמונה.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < weeklyQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const prevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const validateForm = () => {
        if (!feedback.personalSummary.trim()) return "יש למלא את משפט הסיכום האישי.";
        return '';
    };
    
    const handleNextPart = () => {
        setError('');
        let validationError = '';
        if (currentPart === 1) {
             for (const weekly of feedback.weekly) {
                if (!weekly.answer) {
                    validationError = `יש לענות על כל השאלות השבועיות. חסרה תשובה בנושא: ${weekly.topic}.`;
                    break;
                }
                if (weekly.answer === 'אחר' && !weekly.details.trim()) {
                     validationError = `יש למלא פרטים עבור "אחר" בשאלה על ${weekly.topic}.`;
                     break;
                }
            }
        } else if (currentPart === 2) {
            if (feedback.processSatisfaction === 0) validationError = "יש לדרג את שביעות הרצון מהתהליך.";
            else if (feedback.biggestChange.length === 0) validationError = "יש לבחור לפחות שינוי אחד שהתרחש.";
            else if (!feedback.mostSignificantPart.trim()) validationError = "יש למלא מה היה החלק הכי משמעותי עבורך בתהליך.";
        } else if (currentPart === 3) {
            if (feedback.coachSupport === 0) validationError = "יש לדרג את התמיכה מהמאמן.";
            else if (feedback.coachClarity === 0) validationError = "יש לדרג את בהירות ההנחיות מהמאמן.";
            else if (!feedback.coachRelationship) validationError = "יש לתאר את הקשר עם המאמן.";
        }

        if (validationError) {
            setError(validationError);
            return;
        }

        if (currentPart < 4) {
            setCurrentPart(prev => prev + 1);
        } else {
            handleSubmit();
        }
    };
    
    const handlePrevPart = () => {
        if (currentPart > 1) {
            setError('');
            setCurrentPart(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const payload = {
                user_email: user.email,
                user_name: user.name || user.full_name,
                coach_email: user.coach_email,
                booster_cycle_id: user.current_booster_cycle_id || new Date().getFullYear().toString(),
                submitted_at: new Date().toISOString(),
                final_report_id: reportId,
                weekly_feedback: feedback.weekly,
                process_satisfaction_rating: feedback.processSatisfaction,
                biggest_change: feedback.biggestChange,
                biggest_change_details: feedback.biggestChangeDetails,
                most_significant_part: feedback.mostSignificantPart,
                improvement_suggestions: feedback.improvementSuggestions,
                coach_support_rating: feedback.coachSupport,
                coach_clarity_rating: feedback.coachClarity,
                coach_relationship: feedback.coachRelationship,
                coach_relationship_details: feedback.coachRelationshipDetails,
                coach_praise: feedback.coachPraise,
                personal_summary: feedback.personalSummary,
                publish_permission: feedback.publishPermission,
                before_after_image_url: feedback.beforeAfterImageUrl,
            };

            await TerminationFeedback.create(payload);

            await CoachNotification.create({
                user_email: user.email,
                user_name: user.name,
                notification_type: 'goal_achieved',
                details: `המתאמן/ת ${user.name} השלים/ה את הבוסטר ומילא/ה משוב סיום.`,
            });
            
            await User.updateMyUserData({ 
                needs_final_feedback: false,
                booster_feedback_completed: true,
                booster_status: 'completed'
            });

            onFinish();
            navigate(createPageUrl('Maintenance'));

        } catch (e) {
            console.error("Error submitting feedback:", e);
            setError("שגיאה בשליחת המשוב. אנא נסה שוב.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const currentQ = weeklyQuestions[currentQuestionIndex];
    const weeklyAnswer = feedback.weekly.find(w => w.week === currentQ.week);

    const parts = [
        {
            id: 1,
            title: "🔹 חלק 1 – המשוב האישי שלך",
            content: (
                <div>
                    <div className="text-center text-sm text-slate-500 mb-4">עבור בין השאלות בעזרת החצים.</div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 mb-4">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${((currentQuestionIndex + 1) / weeklyQuestions.length) * 100}%` }}></div>
                    </div>
                    <div className="relative h-72 flex items-center justify-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentQuestionIndex}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.3 }}
                                className="w-full"
                            >
                                <div className="p-6 rounded-xl bg-slate-50 border text-center">
                                    <div className="text-5xl mb-4">{currentQ.icon}</div>
                                    <p className="font-bold text-xl text-slate-800 mb-2">{currentQ.topic}</p>
                                    <p className="text-slate-700 mb-6 min-h-[40px]">{processText(currentQ.question, gender)}</p>
                                    <RadioGroup
                                        value={weeklyAnswer.answer}
                                        onValueChange={(value) => handleWeeklyChange(currentQ.week, 'answer', value)}
                                        className="flex flex-wrap gap-4 justify-center"
                                    >
                                        {currentQ.options.map(opt => (
                                            <div key={opt} className="flex items-center space-x-2 space-x-reverse">
                                                <RadioGroupItem value={opt} id={`q${currentQ.week}-${opt}`} />
                                                <Label htmlFor={`q${currentQ.week}-${opt}`} className="text-base">{opt}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                    {weeklyAnswer?.answer === 'אחר' && (
                                        <Textarea
                                            placeholder="פרט/י כאן..."
                                            className="mt-4"
                                            value={weeklyAnswer.details}
                                            onChange={(e) => handleWeeklyChange(currentQ.week, 'details', e.target.value)}
                                        />
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                        <Button onClick={prevQuestion} variant="outline" disabled={currentQuestionIndex === 0}>
                            <ArrowRight className="w-4 h-4 ml-2" />
                            הקודם
                        </Button>
                        <span className="text-sm font-medium text-slate-500">{currentQuestionIndex + 1} / {weeklyQuestions.length}</span>
                        <Button onClick={nextQuestion} variant="outline" disabled={currentQuestionIndex === weeklyQuestions.length - 1}>
                            הבא
                            <ArrowLeft className="w-4 h-4 mr-2" />
                        </Button>
                    </div>
                </div>
            )
        },
        {
            id: 2,
            title: "🔹 חלק 2 – חוות דעת על התהליך",
            content: (
                <ScrollArea className="h-full">
                    <div className="space-y-6 pr-4">
                        <div className="p-6 rounded-xl bg-slate-50 border space-y-3">
                            <Label className="font-bold text-lg text-slate-800">{processText('1. עד כמה [MALE]אתה[FEMALE]את[/MALE] מרוצה מהתהליך?‎', gender)}</Label>
                            <StarRating rating={feedback.processSatisfaction} setRating={(r) => setFeedback(p => ({ ...p, processSatisfaction: r }))} />
                        </div>
                        <div className="p-6 rounded-xl bg-slate-50 border space-y-3">
                            <Label className="font-bold text-lg text-slate-800">{processText('2. מה השתנה [MALE]אצלך[FEMALE]אצלך[/MALE] הכי הרבה?‎', gender)}</Label>
                            <div className="grid grid-cols-2 gap-4 pt-2">
                                {biggestChangeOptions.map(opt => (
                                    <div key={opt} className="flex items-center space-x-2 space-x-reverse">
                                        <Checkbox id={`bc-${opt}`} checked={feedback.biggestChange.includes(opt)} onCheckedChange={() => handleBiggestChange(opt)} />
                                        <Label htmlFor={`bc-${opt}`} className="text-base">{opt}</Label>
                                    </div>
                                ))}
                            </div>
                            <Textarea placeholder={processText('פרט/י אם [MALE]תרצה[FEMALE]תרצי[/MALE] להוסיף', gender)} className="mt-2" value={feedback.biggestChangeDetails} onChange={e => setFeedback(p => ({...p, biggestChangeDetails: e.target.value}))}/>
                        </div>
                        <div className="p-6 rounded-xl bg-slate-50 border space-y-3">
                            <Label className="font-bold text-lg text-slate-800">{processText('3. מה היה החלק הכי משמעותי [MALE]עבורך[FEMALE]עבורך[/MALE] בתהליך?‎', gender)}</Label>
                            <Textarea className="mt-2" value={feedback.mostSignificantPart} onChange={e => setFeedback(p => ({...p, mostSignificantPart: e.target.value}))} />
                        </div>
                        <div className="p-6 rounded-xl bg-slate-50 border space-y-3">
                            <Label className="font-bold text-lg text-slate-800">{processText('4. מה [MALE]היית[FEMALE]היית[/MALE] רוצה לשפר בתהליך הבא (אופציונלי)?‎', gender)}</Label>
                            <Textarea className="mt-2" value={feedback.improvementSuggestions} onChange={e => setFeedback(p => ({...p, improvementSuggestions: e.target.value}))} />
                        </div>
                    </div>
                </ScrollArea>
            )
        },
        {
            id: 3,
            title: "🔹 חלק 3 – חוות דעת על המאמן/ת",
            content: (
                 <ScrollArea className="h-full">
                    <div className="space-y-6 pr-4">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl"><p className="text-center font-semibold text-blue-800">{processText('[MALE]מאמן מלווה[FEMALE]מאמנת מלווה[/MALE]', gender)}: <strong>{user?.coach_name || 'לא שויך'}</strong></p></div>
                        <div className="p-6 rounded-xl bg-slate-50 border space-y-3">
                            <Label className="font-bold text-lg text-slate-800">{processText('1. עד כמה [MALE]הרגשת[FEMALE]הרגשת[/MALE] תמיכה וליווי אישי?‎', gender)}</Label>
                            <StarRating rating={feedback.coachSupport} setRating={(r) => setFeedback(p => ({ ...p, coachSupport: r }))} />
                        </div>
                        <div className="p-6 rounded-xl bg-slate-50 border space-y-3">
                            <Label className="font-bold text-lg text-slate-800">{processText('2. עד כמה ההנחיות היו ברורות?‎', gender)}</Label>
                            <StarRating rating={feedback.coachClarity} setRating={(r) => setFeedback(p => ({ ...p, coachClarity: r }))} />
                        </div>
                        <div className="p-6 rounded-xl bg-slate-50 border space-y-3">
                             <Label className="font-bold text-lg text-slate-800">{processText('3. איך [MALE]היית מתאר[FEMALE]היית מתארת[/MALE] את הקשר עם המאמן?‎', gender)}</Label>
                             <RadioGroup onValueChange={v => setFeedback(p => ({...p, coachRelationship: v}))} value={feedback.coachRelationship} className="flex flex-wrap gap-4 mt-2">
                                {coachRelationshipOptions.map(opt => (
                                     <div key={opt} className="flex items-center space-x-2 space-x-reverse">
                                        <RadioGroupItem value={opt} id={`cr-${opt}`} />
                                        <Label htmlFor={`cr-${opt}`} className="text-base">{opt}</Label>
                                    </div>
                                ))}
                             </RadioGroup>
                             <Textarea placeholder={processText('פרט/י אם [MALE]תרצה[FEMALE]תרצי[/MALE]', gender)} className="mt-2" value={feedback.coachRelationshipDetails} onChange={e => setFeedback(p => ({...p, coachRelationshipDetails: e.target.value}))}/>
                        </div>
                         <div className="p-6 rounded-xl bg-slate-50 border space-y-3">
                            <Label className="font-bold text-lg text-slate-800">{processText('4. מה [MALE]היית[FEMALE]היית[/MALE] רוצה לציין לטובה (אופציונלי)?‎', gender)}</Label>
                            <Textarea className="mt-2" value={feedback.coachPraise} onChange={e => setFeedback(p => ({...p, coachPraise: e.target.value}))} />
                        </div>
                    </div>
                </ScrollArea>
            )
        },
        {
            id: 4,
            title: "🔹 חלק 4 – סיכום והמלצה אישית",
            content: (
                <ScrollArea className="h-full">
                    <div className="space-y-6 pr-4">
                        <div className="p-6 rounded-xl bg-slate-50 border space-y-3">
                             <Label className="font-bold text-lg text-slate-800">{processText('🗣️ משפט סיכום אישי: “[MALE]ב־12 השבועות של הבוסטר למדתי[FEMALE]ב־12 השבועות של הבוסטר למדתי[/MALE] ש…”', gender)}</Label>
                            <Textarea
                                placeholder={processText('זה המקום [MALE]שלך[FEMALE]שלך[/MALE] לסכם את התובנות [MALE]שלך[FEMALE]שלך[/MALE] מהתהליך...')}
                                className="mt-2 h-32"
                                value={feedback.personalSummary}
                                onChange={(e) => setFeedback(p => ({ ...p, personalSummary: e.target.value }))}
                            />
                        </div>
                        <div className="p-6 rounded-xl bg-slate-50 border space-y-3">
                            <Label className="font-bold text-lg text-slate-800">📸 העלאת תמונת לפני/אחרי (לא חובה)</Label>
                            <div className="mt-2 flex items-center gap-4">
                                <div className="flex-grow">
                                    <Input id="image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={isSubmitting} />
                                    <Label htmlFor="image-upload" className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                                        <Upload className="w-4 h-4 ml-2" />
                                        {processText('[MALE]בחר[FEMALE]בחרי[/MALE] תמונה', gender)}
                                    </Label>
                                </div>
                            </div>
                            {feedback.beforeAfterImage && (
                                <div className="mt-2 flex items-center gap-2">
                                    <img src={URL.createObjectURL(feedback.beforeAfterImage)} alt="Preview" className="w-20 h-20 object-cover rounded-md" />
                                    <span className="text-sm text-slate-500">{feedback.beforeAfterImage.name}</span>
                                     <Button variant="ghost" size="icon" onClick={() => setFeedback(p => ({...p, beforeAfterImage: null, beforeAfterImageUrl: ''}))}><X className="w-4 h-4 text-red-500"/></Button>
                                </div>
                            )}
                        </div>
                         <div className="p-6 rounded-xl bg-slate-50 border">
                            <div className="flex items-start space-x-2 space-x-reverse">
                                <Checkbox id="publish-permission" checked={feedback.publishPermission} onCheckedChange={(checked) => setFeedback(p => ({...p, publishPermission: checked}))} />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="publish-permission" className="cursor-pointer font-semibold">{processText('[MALE]מאשר[FEMALE]מאשרת[/MALE] לפרסם חוות דעת (שם פרטי בלבד)', gender)}</Label>
                                    <p className="text-sm text-slate-500">
                                       התוכן והתמונות עשויים לשמש אותנו לצרכי שיווק ופרסום.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            )
        }
    ];

    const activePart = parts.find(p => p.id === currentPart);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-2xl">משוב סיום תהליך הבוסטר</DialogTitle>
                    <DialogDescription className="text-lg font-semibold text-slate-700">
                        {activePart.title}
                    </DialogDescription>
                    <div className="w-full bg-slate-200 rounded-full h-2.5 my-2">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(currentPart / parts.length) * 100}%` }}></div>
                    </div>
                    <DialogClose asChild>
                        <button className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                            <X className="h-5 w-5" />
                            <span className="sr-only">Close</span>
                        </button>
                    </DialogClose>
                </DialogHeader>

                <div className="flex-grow py-4 overflow-y-auto">
                    <AnimatePresence mode="wait">
                         <motion.div
                            key={currentPart}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="h-full"
                        >
                            {activePart.content}
                        </motion.div>
                    </AnimatePresence>
                </div>
                
                <DialogFooter className="pt-4 border-t flex-col sm:flex-row sm:justify-between w-full">
                     {error && <p className="text-sm text-red-500 text-center sm:text-right w-full mb-2 sm:mb-0">{error}</p>}
                    <div className="flex gap-2 w-full justify-between">
                         <Button onClick={handlePrevPart} variant="outline" disabled={isSubmitting || currentPart === 1}>
                             <ArrowRight className="w-4 h-4 ml-2" />
                            הקודם
                        </Button>
                        <Button onClick={handleNextPart} disabled={isSubmitting} className="muscle-primary-gradient text-white flex-grow">
                            {isSubmitting && currentPart === parts.length ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                            {currentPart === parts.length ? 'שליחת משוב וסיום' : 'הבא'}
                            {currentPart < parts.length && <ArrowLeft className="w-4 h-4 mr-2" />}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
