
import React, { useState, useEffect, useCallback } from 'react';
import { GeneratedReport } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, Clock, User, FileText, Loader2, Bell, Users, RefreshCw, Trash2, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { getRelativeTime } from '@/components/utils/timeUtils';
import { Input } from '@/components/ui/input'; // Added Input component for search functionality

export default function TraineeReportsViewer() {
    const [groupedReports, setGroupedReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [deletingReportId, setDeletingReportId] = useState(null);
    const [searchTerm, setSearchTerm] = useState(''); // New state for search term

    const loadReports = useCallback(async () => {
        console.log('Loading trainee reports...'); // Debug log
        setIsLoading(true);
        try {
            const allReports = await GeneratedReport.list('-generated_at');
            console.log('Loaded reports:', allReports.length); // Debug log
            
            if (allReports.length === 0) {
                console.log('No reports found in database'); // Debug log
                setGroupedReports([]);
                return;
            }
            
            const reportsByUser = allReports.reduce((acc, report) => {
                const email = report.user_email;
                if (!acc[email]) {
                    acc[email] = {
                        userName: report.user_name,
                        userEmail: report.user_email,
                        reports: [],
                        hasUnread: false,
                        latestReportDate: '1970-01-01T00:00:00.000Z'
                    };
                }
                acc[email].reports.push(report);
                if (!report.viewed_by_coach) {
                    acc[email].hasUnread = true;
                }
                if (new Date(report.generated_at) > new Date(acc[email].latestReportDate)) {
                    acc[email].latestReportDate = report.generated_at;
                }
                return acc;
            }, {});

            const sortedUserGroups = Object.values(reportsByUser)
                .sort((a, b) => new Date(b.latestReportDate) - new Date(a.latestReportDate));
            
            console.log('Grouped reports:', sortedUserGroups.length); // Debug log
            setGroupedReports(sortedUserGroups);

        } catch (error) {
            console.error('Error loading trainee reports:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadReports();
        // Auto-refresh every 30 seconds to pick up new reports
        const interval = setInterval(loadReports, 30000);
        return () => clearInterval(interval);
    }, [loadReports]);

    const handleViewReport = async (report) => {
        console.log('Viewing report:', report.id); // Debug log
        setSelectedReport(report);
        if (!report.viewed_by_coach) {
            try {
                await GeneratedReport.update(report.id, { viewed_by_coach: true });
                console.log('Marked report as viewed:', report.id); // Debug log
                // Optimistically update the UI
                setGroupedReports(prevGroups => {
                    return prevGroups.map(group => {
                        if (group.userEmail === report.user_email) {
                            const updatedReports = group.reports.map(r => 
                                r.id === report.id ? { ...r, viewed_by_coach: true } : r
                            );
                            const stillHasUnread = updatedReports.some(r => !r.viewed_by_coach);
                            return { ...group, reports: updatedReports, hasUnread: stillHasUnread };
                        }
                        return group;
                    });
                });
            } catch (error) {
                console.error('Failed to mark report as viewed:', error);
            }
        }
    };

    const handleDeleteReport = async (reportId, reportUserName) => {
        setDeletingReportId(reportId);
        try {
            await GeneratedReport.delete(reportId);
            console.log('Deleted report:', reportId); // Debug log
            
            // Update the UI by removing the deleted report
            setGroupedReports(prevGroups => {
                const updatedGroups = prevGroups.map(group => {
                    const updatedReports = group.reports.filter(r => r.id !== reportId);
                    const stillHasUnread = updatedReports.some(r => !r.viewed_by_coach);
                    return { ...group, reports: updatedReports, hasUnread: stillHasUnread };
                }).filter(group => group.reports.length > 0); // Remove groups with no reports
                
                return updatedGroups;
            });

            // Close the report dialog if the deleted report was being viewed
            if (selectedReport && selectedReport.id === reportId) {
                setSelectedReport(null);
            }
            
        } catch (error) {
            console.error('Failed to delete report:', error);
            alert('שגיאה במחיקת הדוח. נסה שוב.');
        } finally {
            setDeletingReportId(null);
        }
    };

    const handleDeleteAllReportsForUser = async (userEmail, userName) => {
        const userGroup = groupedReports.find(group => group.userEmail === userEmail);
        if (!userGroup || userGroup.reports.length === 0) return;

        try {
            // Delete all reports for this user
            await Promise.all(userGroup.reports.map(report => GeneratedReport.delete(report.id)));
            console.log('Deleted all reports for user:', userEmail); // Debug log
            
            // Update the UI by removing the entire user group
            setGroupedReports(prevGroups => prevGroups.filter(group => group.userEmail !== userEmail));
            
        } catch (error) {
            console.error('Failed to delete all reports for user:', error);
            alert('שגיאה במחיקת הדוחות. נסה שוב.');
        }
    };

    const reportTypeLabels = {
        custom: 'מותאם אישית',
        monthly: 'חודשי',
        booster: 'בוסטר'
    };

    // Apply the filtering logic based on the outline, adapted for groupedReports structure
    const filteredGroupedReports = groupedReports.filter(group => {
        // Add safety checks for group object (equivalent to 'user' in the outline)
        if (!group || typeof group !== 'object') return false;
        
        const userName = group.userName || ''; // In groupedReports, it's 'userName'
        const userEmail = group.userEmail || ''; // In groupedReports, it's 'userEmail'
        
        return searchTerm === '' || 
          userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
        <div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <CardTitle>דוחות מתאמנים</CardTitle>
                            <CardDescription>כל הדוחות שנשלחו מהמתאמנים, מקובצים לפי שם.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={loadReports} disabled={isLoading}>
                            <RefreshCw className={`w-4 h-4 ml-2 ${isLoading ? 'animate-spin' : ''}`} />
                            רענן
                        </Button>
                    </div>
                    {/* Add search input field */}
                    <Input
                        type="text"
                        placeholder="חפש מתאמנים לפי שם או מייל..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-4"
                    />
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                            <span className="mr-3 text-slate-600">טוען דוחות...</span>
                        </div>
                    ) : (
                        <ScrollArea className="h-[60vh] pr-4">
                            {filteredGroupedReports.length > 0 ? (
                                 <Accordion type="single" collapsible className="w-full space-y-3">
                                    {filteredGroupedReports.map(group => ( // Use filteredGroupedReports here
                                        <AccordionItem key={group.userEmail} value={group.userEmail} className="border rounded-lg bg-white shadow-sm">
                                            <AccordionTrigger className="p-4 hover:no-underline hover:bg-slate-50 rounded-t-lg">
                                                <div className="flex justify-between items-center w-full">
                                                    <div className="flex items-center gap-3">
                                                        <div className="bg-blue-100 p-2 rounded-full"><Users className="w-5 h-5 text-blue-600" /></div>
                                                        <div>
                                                            <h3 className="font-semibold text-slate-800 text-right">{group.userName}</h3>
                                                            <p className="text-xs text-slate-500 text-right">סה"כ {group.reports.length} דוחות</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {group.hasUnread && (
                                                            <Badge className="bg-red-500 hover:bg-red-600 animate-pulse"><Bell className="w-3 h-3 ml-1"/>חדש</Badge>
                                                        )}
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="sm" 
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent dir="rtl">
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>מחיקת כל הדוחות</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        האם אתה בטוח שברצונך למחוק את כל הדוחות של {group.userName}?
                                                                        פעולה זו אינה הפיכה ותמחק {group.reports.length} דוחות.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>ביטול</AlertDialogCancel>
                                                                    <AlertDialogAction 
                                                                        onClick={() => handleDeleteAllReportsForUser(group.userEmail, group.userName)}
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                    >
                                                                        מחק הכל
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className="p-4 border-t">
                                                <div className="space-y-3">
                                                    {group.reports.map(report => (
                                                         <div key={report.id} className="border p-3 rounded-md flex flex-col sm:flex-row justify-between items-start gap-3 bg-slate-50/50">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    {!report.viewed_by_coach && (
                                                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                                    )}
                                                                    <h4 className="font-medium text-slate-700">דוח {reportTypeLabels[report.report_type]}</h4>
                                                                </div>
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                                    <span>
                                                                        תקופה: {format(parseISO(report.start_date), 'dd/MM/yy')} - {format(parseISO(report.end_date), 'dd/MM/yy')}
                                                                    </span>
                                                                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {getRelativeTime(report.generated_at)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-2 w-full sm:w-auto">
                                                                <Button variant="outline" size="sm" onClick={() => handleViewReport(report)} className="flex-1 sm:flex-none bg-white">
                                                                    <Eye className="w-4 h-4 ml-2" />
                                                                    צפה בדוח
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button 
                                                                            variant="outline" 
                                                                            size="sm" 
                                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                                            disabled={deletingReportId === report.id}
                                                                        >
                                                                            {deletingReportId === report.id ? (
                                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                            ) : (
                                                                                <Trash2 className="w-4 h-4" />
                                                                            )}
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent dir="rtl">
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>מחיקת דוח</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                האם אתה בטוח שברצונך למחוק את הדוח של {group.userName} מתאריך {format(parseISO(report.generated_at), 'dd/MM/yyyy')}?
                                                                                פעולה זו אינה הפיכה.
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                                                                            <AlertDialogAction 
                                                                                onClick={() => handleDeleteReport(report.id, group.userName)}
                                                                                className="bg-red-600 hover:bg-red-700"
                                                                            >
                                                                                מחק דוח
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                 </Accordion>
                            ) : (
                                <div className="text-center py-16 text-slate-500">
                                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium">
                                        {searchTerm ? "לא נמצאו מתאמנים התואמים לחיפוש שלך." : "עדיין לא נשלחו דוחות על ידי מתאמנים."}
                                    </p>
                                    {searchTerm ? null : <p className="text-sm mt-2">דוחות ששולחים מתאמנים יופיעו כאן אוטומטית.</p>}
                                </div>
                            )}
                        </ScrollArea>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!selectedReport} onOpenChange={(isOpen) => !isOpen && setSelectedReport(null)}>
                <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col" dir="rtl">
                    <DialogHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <DialogTitle>
                                    דוח עבור {selectedReport?.user_name} ({reportTypeLabels[selectedReport?.report_type]})
                                </DialogTitle>
                                <DialogDescription>
                                    תקופה: {selectedReport ? `${format(parseISO(selectedReport.start_date), 'dd/MM/yyyy')} - ${format(parseISO(selectedReport.end_date), 'dd/MM/yyyy')}` : ''} |
                                    נשלח: {selectedReport ? getRelativeTime(selectedReport.generated_at) : ''}
                                </DialogDescription>
                            </div>
                            <div className="flex gap-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                            <Trash2 className="w-4 h-4 ml-2" />
                                            מחק דוח
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent dir="rtl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>מחיקת דוח</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                האם אתה בטוח שברצונך למחוק דוח זה? פעולה זו אינה הפיכה.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>ביטול</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={() => selectedReport && handleDeleteReport(selectedReport.id, selectedReport.user_name)}
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                מחק דוח
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                <Button variant="outline" size="sm" onClick={() => setSelectedReport(null)}>
                                    <X className="w-4 h-4 ml-2" />
                                    סגור
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="flex-grow overflow-hidden border-t mt-4 pt-4">
                        <ScrollArea className="h-full pr-2">
                            {selectedReport?.report_html && (
                                <div 
                                    dangerouslySetInnerHTML={{ __html: selectedReport.report_html }} 
                                    className="prose prose-sm max-w-none"
                                />
                            )}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
