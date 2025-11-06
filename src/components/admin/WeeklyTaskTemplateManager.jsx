
import React, { useState, useEffect, useCallback } from 'react';
import { WeeklyTaskTemplate } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, PlusCircle, Trash2, Edit, Save, FileDown, FileUp, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { exportTaskTemplates, importTaskTemplates } from '@/api/functions';
import { UploadFile } from '@/api/integrations';

const TemplateForm = ({ template, onSave, onCancel, isSaving }) => {
    const [formData, setFormData] = useState(template || { week: '', title: '', mission_text: '', tip_text: '', booster_text: '' });

    const handleChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: id === 'week' ? (value ? parseInt(value, 10) : '') : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
            <div>
                <Label htmlFor="week">שבוע</Label>
                <Input id="week" type="number" value={formData.week} onChange={handleChange} required />
            </div>
            <div>
                <Label htmlFor="title">כותרת</Label>
                <Input id="title" value={formData.title} onChange={handleChange} required />
            </div>
            <div>
                <Label htmlFor="mission_text">משימה</Label>
                <Textarea id="mission_text" value={formData.mission_text} onChange={handleChange} rows={4} required />
            </div>
            <div>
                <Label htmlFor="tip_text">טיפ</Label>
                <Textarea id="tip_text" value={formData.tip_text} onChange={handleChange} rows={3} required />
            </div>
            <div>
                <Label htmlFor="booster_text">בוסטר</Label>
                <Textarea id="booster_text" value={formData.booster_text} onChange={handleChange} rows={3} required />
            </div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>ביטול</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
                    שמור תבנית
                </Button>
            </DialogFooter>
        </form>
    );
};

export default function WeeklyTaskTemplateManager() {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [deletingTemplate, setDeletingTemplate] = useState(null);
    const [isDeleteAllAlertOpen, setIsDeleteAllAlertOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();
    const fileInputRef = React.useRef(null);

    const loadTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await WeeklyTaskTemplate.list('week');
            setTemplates(data);
        } catch (error) {
            console.error("Error loading templates:", error);
            toast({ title: "שגיאה בטעינת תבניות", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const handleSave = async (formData) => {
        setIsSaving(true);
        try {
            if (editingTemplate) {
                await WeeklyTaskTemplate.update(editingTemplate.id, formData);
                toast({ title: "הצלחה", description: "התבנית עודכנה." });
            } else {
                await WeeklyTaskTemplate.create(formData);
                toast({ title: "הצלחה", description: "תבנית חדשה נוצרה." });
            }
            setIsDialogOpen(false);
            setEditingTemplate(null);
            loadTemplates();
        } catch (error) {
            console.error("Error saving template:", error);
            toast({ title: "שגיאה בשמירה", description: "לא ניתן היה לשמור את התבנית.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingTemplate) return;
        try {
            await WeeklyTaskTemplate.delete(deletingTemplate.id);
            toast({ title: "הצלחה", description: "התבנית נמחקה." });
            setDeletingTemplate(null);
            loadTemplates();
        } catch (error) {
            console.error("Error deleting template:", error);
            toast({ title: "שגיאה במחיקה", description: "לא ניתן היה למחוק את התבנית.", variant: "destructive" });
        }
    };

    const handleDeleteAll = async () => {
        try {
            // This is a "dangerous" operation, so we'll run deletes one by one to be safe.
            // If templates array is large, consider batching or a dedicated backend endpoint.
            for (const template of templates) {
                await WeeklyTaskTemplate.delete(template.id);
            }
            toast({ title: "הצלחה", description: "כל התבניות נמחקו." });
            loadTemplates(); // Refresh the list
        } catch (error) {
            console.error("Error deleting all templates:", error);
            toast({ title: "שגיאה במחיקה", description: "לא ניתן היה למחוק את כל התבניות.", variant: "destructive" });
        } finally {
            setIsDeleteAllAlertOpen(false);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const csvData = await exportTaskTemplates();
            
            if (!csvData) {
                throw new Error('Failed to get export data from server.');
            }

            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            const filename = `booster_task_templates_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "הצלחה", description: "הייצוא הסתיים בהצלחה." });
        } catch (error) {
            console.error("Error exporting templates:", error);
            toast({ title: "שגיאה בייצוא", description: error.message || "לא ניתן היה לייצא את התבניות.", variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsImporting(true);
        try {
            // 1. Upload the file to get a URL
            const { file_url } = await UploadFile({ file });
            if (!file_url) {
                throw new Error('File upload failed.');
            }

            // 2. Invoke the backend function with the file URL
            await importTaskTemplates({ fileUrl: file_url });

            toast({ title: "הצלחה", description: "הייבוא הושלם. התבניות עודכנו." });
            loadTemplates(); // Refresh data
        } catch (error) {
            console.error("Error importing templates:", error);
            const errorMessage = error.message || "לא ניתן היה לייבא את התבניות.";
            toast({ title: "שגיאה בייבוא", description: errorMessage, variant: "destructive" });
        } finally {
            setIsImporting(false);
            // Reset file input
            if(fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>ניהול תבניות משימות בוסטר</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        <span className="mr-2">טוען תבניות...</span>
                    </div>
                ) : (
                    <ScrollArea className="h-72">
                        <div className="space-y-2 pr-2">
                            {templates.map(template => (
                                <div key={template.id} className="flex items-center justify-between p-2 rounded-md bg-slate-50">
                                    <p className="font-medium text-slate-800">שבוע {template.week}: {template.title}</p>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => { setEditingTemplate(template); setIsDialogOpen(true); }}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => setDeletingTemplate(template)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2 justify-between">
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => setEditingTemplate(null)}>
                            <PlusCircle className="w-4 h-4 ml-2" />
                            הוסף תבנית חדשה
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingTemplate ? 'ערוך תבנית' : 'הוסף תבנית חדשה'}</DialogTitle>
                        </DialogHeader>
                        <TemplateForm
                            template={editingTemplate}
                            onSave={handleSave}
                            onCancel={() => setIsDialogOpen(false)}
                            isSaving={isSaving}
                        />
                    </DialogContent>
                </Dialog>

                <div className="flex gap-2 flex-wrap">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept=".csv"
                    />
                    <Button variant="outline" onClick={triggerFileSelect} disabled={isImporting}>
                        {isImporting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <FileUp className="w-4 h-4 ml-2" />}
                        ייבוא מ-Excel
                    </Button>
                    <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                        {isExporting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <FileDown className="w-4 h-4 ml-2" />}
                        ייצוא ל-Excel
                    </Button>
                     <Button variant="destructive" onClick={() => setIsDeleteAllAlertOpen(true)}>
                        <Trash2 className="w-4 h-4 ml-2" />
                        מחק הכל
                    </Button>
                </div>
            </CardFooter>

            <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>אישור מחיקה</AlertDialogTitle>
                        <AlertDialogDescription>
                            האם אתה בטוח שברצונך למחוק את התבנית "{deletingTemplate?.title}"? לא ניתן לשחזר פעולה זו.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">מחק</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={isDeleteAllAlertOpen} onOpenChange={setIsDeleteAllAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="text-destructive"/>אישור מחיקה מלאה</AlertDialogTitle>
                        <AlertDialogDescription>
                            האם אתה בטוח שברצונך למחוק את **כל** תבניות המשימה? לא ניתן לשחזר פעולה זו.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAll} className="bg-red-600 hover:bg-red-700">כן, מחק הכל</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
