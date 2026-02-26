
import React, { useState, useEffect, useCallback } from 'react';
import { ContractContent } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ContractEditor() {
    const [contract, setContract] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadContract = useCallback(async () => {
        setIsLoading(true);
        try {
            const results = await ContractContent.filter({ key: 'default' });
            if (results.length > 0) {
                const content = results[0];
                // Convert commitments array to a string for textarea
                setContract({ ...content, commitments: content.commitments.join('\n') });
            } else {
                setError('לא נמצא תוכן חוזה. ייתכן שיש צורך ליצור אותו תחילה.');
            }
        } catch (err) {
            setError('שגיאה בטעינת תוכן החוזה.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadContract();
    }, [loadContract]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setContract(prev => ({ ...prev, [id]: value }));
    };

    const handleSave = async () => {
        if (!contract) return;
        setIsSaving(true);
        setError('');
        setSuccess('');
        try {
            // Convert commitments string back to array, filtering out empty lines
            const updatedData = {
                ...contract,
                commitments: (contract.commitments && typeof contract.commitments === 'string' 
                    ? contract.commitments.split('\n').filter(line => line.trim() !== '')
                    : Array.isArray(contract.commitments) 
                        ? contract.commitments 
                        : [])
            };
            await ContractContent.update(contract.id, updatedData);
            setSuccess('החוזה עודכן בהצלחה!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('שגיאה בשמירת החוזה. אנא נסה שוב.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin" /></div>;
    }

    if (error && !contract) {
        return <div className="text-red-500 text-center">{error}</div>;
    }

    return (
        <ScrollArea className="h-[70vh]" dir="rtl">
            <div className="space-y-4 p-1 text-end w-full" dir="rtl">
                <Alert className="text-end title-rtl desc-rtl" dir="rtl">
                    <AlertTitle>הנחיות עריכה</AlertTitle>
                    <AlertDescription className="text-end">
                        כדי להתאים טקסט למין המשתמש, השתמש בתחביר הבא: <strong>[MALE]טקסט לזכר[FEMALE]טקסט לנקבה[/MALE]</strong>.
                        <br/>
                        בתיבת "סעיפי התחייבות", כל שורה חדשה תייצג סעיף נפרד בחוזה.
                    </AlertDescription>
                </Alert>

                {error && <div className="text-sm text-red-500 bg-red-50 p-2 rounded text-end" dir="rtl">{error}</div>}
                {success && <div className="text-sm text-green-500 bg-green-50 p-2 rounded text-end" dir="rtl">{success}</div>}

                <div className="space-y-2">
                    <Label htmlFor="title" className="text-end block title-rtl">כותרת ראשית</Label>
                    <Input id="title" value={contract.title || ''} onChange={handleInputChange} className="text-end" dir="rtl" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="instructions" className="text-end block title-rtl">הוראות פתיחה</Label>
                    <Input id="instructions" value={contract.instructions || ''} onChange={handleInputChange} className="text-end" dir="rtl" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="intro_paragraph" className="text-end block title-rtl">פסקת פתיחה</Label>
                    <Textarea id="intro_paragraph" value={contract.intro_paragraph || ''} onChange={handleInputChange} className="text-end" dir="rtl" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="commitment_header" className="text-end block title-rtl">כותרת סעיפי התחייבות</Label>
                    <Input id="commitment_header" value={contract.commitment_header || ''} onChange={handleInputChange} className="text-end" dir="rtl" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="commitments" className="text-end block title-rtl">סעיפי התחייבות (כל סעיף בשורה)</Label>
                    <Textarea id="commitments" value={contract.commitments || ''} onChange={handleInputChange} rows={8} className="text-end" dir="rtl" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="success_paragraph" className="text-end block title-rtl">פסקת "הצלחה"</Label>
                    <Textarea id="success_paragraph" value={contract.success_paragraph || ''} onChange={handleInputChange} className="text-end" dir="rtl" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="partnership_paragraph" className="text-end block title-rtl">פסקת "שותפות"</Label>
                    <Textarea id="partnership_paragraph" value={contract.partnership_paragraph || ''} onChange={handleInputChange} className="text-end" dir="rtl" />
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="w-full justify-center" dir="rtl">
                    {isSaving ? <><Loader2 className="w-4 h-4 me-2 animate-spin" /> שומר...</> : <><Save className="w-4 h-4 me-2" /> שמור שינויים</>}
                </Button>
            </div>
        </ScrollArea>
    );
}
