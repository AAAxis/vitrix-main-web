
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ExerciseDefinition } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Search, Plus, Edit, Trash2, X, FileUp, Download, ChevronsRight, FileCheck2 } from 'lucide-react';
import { UploadFile, ExtractDataFromUploadedFile } from '@/api/integrations';

export default function ExerciseLibraryManager() {
    const [exercises, setExercises] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentExercise, setCurrentExercise] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // State for import functionality
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importedExercises, setImportedExercises] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState('');
    const [importSuccess, setImportSuccess] = useState('');

    const muscleGroups = ["Chest", "Back", "Legs", "Shoulders", "Biceps", "Triceps", "Core", "Full Body", "Cardio"];
    const categories = ["Strength", "Hypertrophy", "Cardio", "Mobility", "Functional", "Olympic Weightlifting"];
    const equipmentList = ["Bodyweight", "Barbell", "Dumbbell", "Kettlebell", "Machine", "Cable", "Resistance Band", "Medicine Ball", "TRX", "Box", "Pull-up Bar", "Rower", "Bike", "Treadmill", "Sled", "Rings"];

    const loadExercises = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await ExerciseDefinition.list('-created_date');
            setExercises(data);
        } catch (err) {
            setError('שגיאה בטעינת מאגר התרגילים.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadExercises();
    }, [loadExercises]);

    const filteredExercises = useMemo(() => {
        if (!searchTerm) return exercises;
        return exercises.filter(ex =>
            ex.name_he.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ex.name_en.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ex.muscle_group.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [exercises, searchTerm]);

    const handleOpenForm = (exercise = null) => {
        if (exercise) {
            setIsEditing(true);
            setCurrentExercise(exercise);
        } else {
            setIsEditing(false);
            setCurrentExercise({
                name_en: '',
                name_he: '',
                muscle_group: '',
                category: '',
                equipment: '',
                description: '',
                default_weight: 0,
                video_url: ''
            });
        }
        setIsFormOpen(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setCurrentExercise(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name, value) => {
        setCurrentExercise(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!currentExercise.name_he || !currentExercise.name_en || !currentExercise.muscle_group || !currentExercise.category || !currentExercise.equipment) {
            alert('נא למלא את כל שדות החובה.');
            return;
        }
        setIsSaving(true);
        try {
            if (isEditing) {
                await ExerciseDefinition.update(currentExercise.id, currentExercise);
            } else {
                await ExerciseDefinition.create(currentExercise);
            }
            setIsFormOpen(false);
            loadExercises();
        } catch (err) {
            alert('שגיאה בשמירת התרגיל.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('האם למחוק את התרגיל? לא ניתן לשחזר פעולה זו.')) {
            try {
                await ExerciseDefinition.delete(id);
                loadExercises();
            } catch (err) {
                alert('שגיאה במחיקת התרגיל.');
                console.error(err);
            }
        }
    };

    const handleExport = () => {
        if (exercises.length === 0) {
            alert('אין תרגילים לייצא.');
            return;
        }

        const headers = ["name_he", "name_en", "muscle_group", "category", "equipment", "description", "video_url", "default_weight"];
        
        const formatCsvValue = (value) => {
            if (value === null || value === undefined) {
                return '';
            }
            const strValue = String(value);
            // Check if the value contains a comma, newline, or double quote
            if (strValue.includes(',') || strValue.includes('\n') || strValue.includes('"')) {
                // Escape double quotes by doubling them, then enclose the whole string in double quotes
                return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
        };

        const csvRows = [
            headers.join(','), // Header row
            ...exercises.map(ex => 
                headers.map(header => formatCsvValue(ex[header])).join(',')
            ) // Data rows
        ];
        
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join('\n'));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `muscle_up_exercise_library_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadTemplate = () => {
        const headers = "name_he,name_en,muscle_group,category,equipment,description,video_url,default_weight\n";
        const example = "סקווט,Squat,Legs,Strength,Barbell,תרגיל לחיזוק שרירי הרגליים והישבן,https://youtube.com/watch?v=123,20\n";
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers + example);
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", "exercise_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportError('');
        setImportSuccess('');
        setImportedExercises([]);
        setIsUploading(true);

        try {
            const { file_url } = await UploadFile({ file });
            setIsUploading(false);
            setIsParsing(true);

            const schema = await ExerciseDefinition.schema();
            const extractionSchema = {
                type: "object",
                properties: {
                    exercises: { type: "array", items: schema }
                },
                required: ["exercises"]
            };

            const result = await ExtractDataFromUploadedFile({
                file_url: file_url,
                json_schema: extractionSchema
            });

            if (result.status === 'success' && result.output?.exercises) {
                const validExercises = result.output.exercises.filter(ex => ex.name_he && ex.name_en && ex.muscle_group && ex.category && ex.equipment);
                if (validExercises.length !== result.output.exercises.length) {
                    setImportError(`זוהו ${result.output.exercises.length} שורות, מתוכן ${validExercises.length} תקינות. שורות לא תקינות לא יובאו.`);
                }
                setImportedExercises(validExercises);
                if(validExercises.length > 0) setImportSuccess(`נמצאו ${validExercises.length} תרגילים תקינים לייבוא.`);

            } else {
                setImportError(result.details || 'שגיאה בעיבוד הקובץ. ודא שהכותרות תקינות ושהקובץ בפורמט CSV או Excel.');
            }
        } catch (err) {
            setImportError('אירעה שגיאה בתהליך העלאת וניתוח הקובץ.');
            console.error(err);
        } finally {
            setIsUploading(false);
            setIsParsing(false);
            e.target.value = ''; // Reset file input
        }
    };

    const handleConfirmImport = async () => {
        if (importedExercises.length === 0) return;
        setIsImporting(true);
        setImportError('');
        setImportSuccess('');
        try {
            await ExerciseDefinition.bulkCreate(importedExercises);
            setImportSuccess(`${importedExercises.length} תרגילים יובאו בהצלחה!`);
            setImportedExercises([]);
            setTimeout(() => {
                setIsImportModalOpen(false);
                loadExercises();
            }, 2000);
        } catch (err) {
            setImportError('שגיאה בייבוא הנתונים למאגר.');
            console.error(err);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div dir="rtl">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">ניהול מאגר תרגילים</h2>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 ml-2"/>ייצוא מאגר</Button>
                    <Button variant="outline" onClick={() => setIsImportModalOpen(true)}><FileUp className="w-4 h-4 ml-2"/>ייבוא מקובץ</Button>
                    <Button onClick={() => handleOpenForm()}><Plus className="w-4 h-4 ml-2" />הוסף תרגיל</Button>
                </div>
            </div>

            <div className="mb-4 relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="חיפוש תרגיל..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                />
            </div>
            
            {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : error ? (
                <div className="text-red-500 text-center p-8">{error}</div>
            ) : (
                <ScrollArea className="h-[60vh] border rounded-lg p-2">
                    <div className="space-y-2">
                        {filteredExercises.map(ex => (
                            <div key={ex.id} className="flex items-center justify-between p-3 bg-white rounded-md shadow-sm">
                                <div>
                                    <p className="font-bold">{ex.name_he} <span className="text-slate-500 text-sm">({ex.name_en})</span></p>
                                    <p className="text-sm text-slate-600">{ex.muscle_group} | {ex.equipment}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => handleOpenForm(ex)}><Edit className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(ex.id)} className="text-red-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            )}

            {/* Form Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'עריכת תרגיל' : 'הוספת תרגיל חדש'}</DialogTitle>
                    </DialogHeader>
                    {currentExercise && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input name="name_he" placeholder="שם בעברית" value={currentExercise.name_he} onChange={handleFormChange} />
                                <Input name="name_en" placeholder="שם באנגלית" value={currentExercise.name_en} onChange={handleFormChange} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Select onValueChange={(v) => handleSelectChange('muscle_group', v)} value={currentExercise.muscle_group}>
                                    <SelectTrigger><SelectValue placeholder="קבוצת שריר" /></SelectTrigger>
                                    <SelectContent>{muscleGroups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select onValueChange={(v) => handleSelectChange('category', v)} value={currentExercise.category}>
                                    <SelectTrigger><SelectValue placeholder="קטגוריה" /></SelectTrigger>
                                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                </Select>
                                <Select onValueChange={(v) => handleSelectChange('equipment', v)} value={currentExercise.equipment}>
                                    <SelectTrigger><SelectValue placeholder="ציוד נדרש" /></SelectTrigger>
                                    <SelectContent>{equipmentList.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <Textarea name="description" placeholder="תיאור התרגיל" value={currentExercise.description} onChange={handleFormChange} />
                            <Input name="video_url" placeholder="קישור לסרטון (YouTube)" value={currentExercise.video_url} onChange={handleFormChange} />
                            <div>
                                <label className="text-sm font-medium">משקל ברירת מחדל (ק"ג)</label>
                                <Input type="number" name="default_weight" value={currentExercise.default_weight} onChange={handleFormChange} />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>ביטול</Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                            {isEditing ? 'שמור שינויים' : 'הוסף תרגיל'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Import Dialog */}
            <Dialog open={isImportModalOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setImportedExercises([]);
                    setImportError('');
                    setImportSuccess('');
                }
                setIsImportModalOpen(isOpen);
            }}>
                <DialogContent className="max-w-3xl" dir="rtl">
                    <DialogHeader>
                        <DialogTitle>ייבוא תרגילים מקובץ</DialogTitle>
                        <DialogDescription>
                            העלה קובץ CSV או Excel עם רשימת התרגילים. ודא שהעמודות תואמות לתבנית.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-6">
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-bold mb-2">שלב 1: הכנת הקובץ</h4>
                            <p className="text-sm text-blue-800">ודא שהקובץ שלך כולל את העמודות הבאות (הסדר לא משנה): <code className="text-xs bg-blue-100 p-1 rounded">name_he, name_en, muscle_group, category, equipment, description, video_url, default_weight</code>.</p>
                             <Button variant="link" onClick={handleDownloadTemplate} className="p-0 h-auto mt-2">
                                <Download className="w-4 h-4 ml-2"/>
                                הורד קובץ תבנית (CSV)
                            </Button>
                        </div>

                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                             <h4 className="font-bold mb-2">שלב 2: העלאת הקובץ</h4>
                             <Input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileChange} disabled={isUploading || isParsing} />
                             {(isUploading || isParsing) && <div className="flex items-center gap-2 mt-2 text-sm text-green-800"><Loader2 className="w-4 h-4 animate-spin"/> {isUploading ? 'מעלה קובץ...' : 'מעבד נתונים...'}</div>}
                        </div>
                        
                        {importError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{importError}</p>}
                        {importSuccess && <p className="text-sm text-green-600 bg-green-50 p-2 rounded-md">{importSuccess}</p>}

                        {importedExercises.length > 0 && (
                            <div>
                                <h4 className="font-bold mb-2">שלב 3: תצוגה מקדימה ואישור</h4>
                                <ScrollArea className="h-60 border rounded-md p-2">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-right border-b">
                                                <th className="p-2">שם (עברית)</th>
                                                <th className="p-2">שם (אנגלית)</th>
                                                <th className="p-2">קבוצת שריר</th>
                                                <th className="p-2">ציוד</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {importedExercises.map((ex, i) => (
                                                <tr key={i} className="border-b">
                                                    <td className="p-2 font-medium">{ex.name_he}</td>
                                                    <td className="p-2">{ex.name_en}</td>
                                                    <td className="p-2">{ex.muscle_group}</td>
                                                    <td className="p-2">{ex.equipment}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImportModalOpen(false)}>סגור</Button>
                        <Button onClick={handleConfirmImport} disabled={isImporting || importedExercises.length === 0}>
                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin ml-2"/> : <FileCheck2 className="w-4 h-4 ml-2"/>}
                            אישור וייבוא נתונים
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
}
