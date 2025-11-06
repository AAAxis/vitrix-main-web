import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BoosterPlusTaskTemplate } from '@/api/entities';
import { exportBoosterPlusTaskTemplates, importBoosterPlusTaskTemplates } from '@/api/functions';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { Loader2, PlusCircle, Trash2, Edit, Save, Upload, Download, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const TemplateForm = ({ template, onSave, onCancel, isSaving }) => {
    const [formData, setFormData] = useState(template || { week: '', title: '', details: '', insight: '' });

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
            <div><Label htmlFor="week">שבוע</Label><Input id="week" type="number" value={formData.week} onChange={handleChange} required /></div>
            <div><Label htmlFor="title">כותרת</Label><Input id="title" value={formData.title} onChange={handleChange} required /></div>
            <div><Label htmlFor="details">פירוט</Label><Textarea id="details" value={formData.details} onChange={handleChange} rows={4} required /></div>
            <div><Label htmlFor="insight">תובנה</Label><Textarea id="insight" value={formData.insight} onChange={handleChange} rows={3} required /></div>
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>ביטול</Button>
                <Button type="submit" disabled={isSaving}>
                    {isSaving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />} שמור
                </Button>
            </DialogFooter>
        </form>
    );
};

export default function BoosterPlusTemplateManager() {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [deletingTemplate, setDeletingTemplate] = useState(null);
    const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef(null);
    const { toast } = useToast();

    const loadTemplates = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await BoosterPlusTaskTemplate.list('week');
            setTemplates(data);
        } catch (error) {
            toast({ title: "שגיאה", description: "טעינת התבניות נכשלה.", variant: "destructive" });
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
                await BoosterPlusTaskTemplate.update(editingTemplate.id, formData);
                toast({ title: "הצלחה", description: "התבנית עודכנה." });
            } else {
                await BoosterPlusTaskTemplate.create(formData);
                toast({ title: "הצלחה", description: "תבנית חדשה נוצרה." });
            }
            setIsDialogOpen(false);
            setEditingTemplate(null);
            loadTemplates();
        } catch (error) {
            toast({ title: "שגיאה", description: "שמירת התבנית נכשלה.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingTemplate) return;
        setIsSaving(true);
        try {
            await BoosterPlusTaskTemplate.delete(deletingTemplate.id);
            toast({ title: "הצלחה", description: "התבנית נמחקה." });
            setDeletingTemplate(null);
            loadTemplates();
        } catch (error) {
            toast({ title: "שגיאה", description: "מחיקת התבנית נכשלה.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteAll = async () => {
        setIsSaving(true);
        try {
            const allTemplates = await BoosterPlusTaskTemplate.list();
            for (const template of allTemplates) {
                await BoosterPlusTaskTemplate.delete(template.id);
            }
            toast({ title: "הצלחה", description: "כל התבניות נמחקו." });
            loadTemplates();
        } catch (error) {
            toast({ title: "שגיאה", description: "מחיקת כל התבניות נכשלה.", variant: "destructive" });
        } finally {
            setIsSaving(false);
            setIsDeleteAllDialogOpen(false);
        }
    };

    const handleExport = async () => {
        try {
            const csvData = await exportBoosterPlusTaskTemplates();
            const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `booster_plus_templates_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast({ title: "הצלחה", description: "הייצוא החל." });
        } catch (error) {
            toast({ title: "שגיאה", description: "ייצוא התבניות נכשל.", variant: "destructive" });
        }
    };

    const handleImport = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsImporting(true);
        try {
            const { file_url } = await UploadFile({ file });
            await importBoosterPlusTaskTemplates({ fileUrl: file_url });
            toast({ title: "הצלחה", description: "הייבוא הושלם בהצלחה." });
            loadTemplates();
        } catch (error) {
            toast({ title: "שגיאה", description: `ייבוא התבניות נכשל: ${error.message}`, variant: "destructive" });
        } finally {
            setIsImporting(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    if (isLoading) return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;

    return (
        <Card dir="rtl">
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>תבניות משימה - בוסטר פלוס</CardTitle>
                    </div>
                    <div className="flex gap-2">
                        <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".csv"/>
                        <Button variant="outline" onClick={() => fileInputRef.current.click()} disabled={isImporting}>
                            {isImporting ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Upload className="w-4 h-4 ml-2" />} ייבוא מ-Excel
                        </Button>
                        <Button variant="outline" onClick={handleExport}><Download className="w-4 h-4 ml-2" />ייצוא ל-Excel</Button>
                        <Button onClick={() => { setEditingTemplate(null); setIsDialogOpen(true); }}><PlusCircle className="w-4 h-4 ml-2" />הוסף</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    <div className="space-y-2">
                        {templates.map(t => (
                            <div key={t.id} className="flex items-center justify-between p-2 border rounded-md">
                                <div><span className="font-semibold">שבוע {t.week}:</span> {t.title}</div>
                                <div className="flex gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => { setEditingTemplate(t); setIsDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setDeletingTemplate(t)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </CardContent>
             <CardFooter className="flex justify-end">
                <Button variant="destructive" onClick={() => setIsDeleteAllDialogOpen(true)} disabled={templates.length === 0}>
                    <Trash2 className="w-4 h-4 ml-2" /> מחק הכל
                </Button>
            </CardFooter>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>{editingTemplate ? 'עריכת' : 'הוספת'} תבנית</DialogTitle></DialogHeader>
                    <TemplateForm template={editingTemplate} onSave={handleSave} onCancel={() => setIsDialogOpen(false)} isSaving={isSaving} />
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingTemplate} onOpenChange={() => setDeletingTemplate(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>אישור מחיקה</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogDescription>האם למחוק את התבנית "{deletingTemplate?.title}"?</AlertDialogDescription>
                    <AlertDialogFooter><AlertDialogCancel>ביטול</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>מחק</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <AlertDialog open={isDeleteAllDialogOpen} onOpenChange={setIsDeleteAllDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="text-red-500 w-6 h-6" />
                            <AlertDialogTitle>אישור מחיקה גורפת</AlertDialogTitle>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogDescription>
                        פעולה זו תמחק את **כל** תבניות המשימה של בוסטר פלוס לצמיתות. לא ניתן לשחזר פעולה זו. האם להמשיך?
                    </AlertDialogDescription>
                    <AlertDialogFooter>
                        <AlertDialogCancel>ביטול</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAll} className="bg-red-500 hover:bg-red-600">כן, מחק הכל</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}