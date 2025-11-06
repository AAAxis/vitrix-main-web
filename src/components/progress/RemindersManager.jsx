import React, { useState, useEffect } from "react";
import { Reminder, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Trash2, Edit } from "lucide-react";
import { format } from "date-fns";

const repeatPatterns = ["ללא", "יומי", "שבועי", "מותאם אישית"];

export default function RemindersManager() {
  const [reminders, setReminders] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      const user = await User.me();
      const userReminders = await Reminder.filter({ created_by: user.email }, "-created_date");
      setReminders(userReminders);
    } catch (error) {
      console.error("Error loading reminders:", error);
    }
  };

  const handleOpenDialog = (reminder = null) => {
    setEditingReminder(reminder);
    setFormData(reminder || {
      workout_type: "",
      alert_datetime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      repeat_pattern: "ללא",
      is_active: true
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingReminder) {
        await Reminder.update(editingReminder.id, formData);
      } else {
        await Reminder.create(formData);
      }
      setIsDialogOpen(false);
      setEditingReminder(null);
      loadReminders();
    } catch (error) {
      console.error("Error saving reminder:", error);
    }
  };

  const handleDelete = async (reminderId) => {
    if (window.confirm("האם למחוק את התזכורת?")) {
        try {
            await Reminder.delete(reminderId);
            loadReminders();
        } catch(e) {
            console.error("Error deleting reminder", e);
        }
    }
  };

  const toggleActive = async (reminder) => {
      try {
          await Reminder.update(reminder.id, { is_active: !reminder.is_active });
          loadReminders();
      } catch (e) {
          console.error("Error toggling reminder", e);
      }
  };

  return (
    <div className="space-y-6">
      <Card className="muscle-glass border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Bell className="w-6 h-6 text-blue-600" />
            ניהול תזכורות
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" />
                    הוסף תזכורת
                </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>{editingReminder ? "עריכת תזכורת" : "תזכורת חדשה"}</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                 <div className="space-y-2"><Label>תיאור התזכורת</Label><Input value={formData.workout_type || ''} onChange={e => setFormData({...formData, workout_type: e.target.value})} placeholder="לדוגמה: אימון רגליים"/></div>
                 <div className="space-y-2"><Label>תאריך ושעה</Label><Input type="datetime-local" value={formData.alert_datetime} onChange={e => setFormData({...formData, alert_datetime: e.target.value})} /></div>
                 <div className="space-y-2"><Label>חזרה</Label>
                    <Select value={formData.repeat_pattern} onValueChange={v => setFormData({...formData, repeat_pattern: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{repeatPatterns.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                 </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ביטול</Button>
                <Button onClick={handleSave}>שמור</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4" role="alert">
                <p className="font-bold">הערה חשובה</p>
                <p>שליחת התראות Push/Email דורשת הגדרת Backend Functions בפרויקט. כרגע ניתן רק לנהל את רשימת התזכורות.</p>
            </div>
            <div className="space-y-3">
                {reminders.map(rem => (
                    <div key={rem.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                            <p className="font-medium">{rem.workout_type}</p>
                            <p className="text-sm text-slate-600">{format(new Date(rem.alert_datetime), "dd/MM/yy HH:mm")} • {rem.repeat_pattern}</p>
                        </div>
                        <div className="flex items-center gap-2">
                           <Switch checked={rem.is_active} onCheckedChange={() => toggleActive(rem)} />
                           <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rem)}><Edit className="w-4 h-4"/></Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDelete(rem.id)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                        </div>
                    </div>
                ))}
                 {reminders.length === 0 && <p className="text-center text-slate-500">אין תזכורות פעילות.</p>}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}