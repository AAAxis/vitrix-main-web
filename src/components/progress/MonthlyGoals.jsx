
import React, { useState, useEffect } from "react";
import { MonthlyGoal, User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar1, Target, Edit, CheckCircle, AlertTriangle, XCircle } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";

const statusOptions = [
  { value: "לא נקבעה", label: "לא נקבעה", icon: "⚪", color: "bg-gray-100 text-gray-800" },
  { value: "הושגה ✔️", label: "הושגה ✔️", icon: "✔️", color: "bg-green-100 text-green-800" },
  { value: "חלקית ⚠️", label: "חלקית ⚠️", icon: "⚠️", color: "bg-yellow-100 text-yellow-800" },
  { value: "לא הושגה ❌", label: "לא הושגה ❌", icon: "❌", color: "bg-red-100 text-red-800" }
];

export default function MonthlyGoals() {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Added isLoading state
  const [user, setUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadGoals(); // Renamed from loadData
  }, []);

  const loadGoals = async () => { // Renamed from loadData
    setIsLoading(true); // Set loading to true
    try {
      const currentUser = await User.me();
      setUser(currentUser);
      
      // Filter goals by the new 'user_email' field
      // Assuming the `, "month"` parameter is not part of the standard filter and removing it.
      const userGoals = await MonthlyGoal.filter({ user_email: currentUser.email }); 
      
      // Ensure we have goals for months 1, 2, 3 - create if missing in the DB
      const monthsToCreate = [];
      for (let month = 1; month <= 3; month++) {
        const existingGoal = userGoals.find(g => g.month === month);
        if (!existingGoal) {
          monthsToCreate.push({
            month: month,
            goal_text: "",
            set_date: format(new Date(), "yyyy-MM-dd"),
            target_date: "",
            status: "לא נקבעה",
            feedback_notes: "",
            user_email: currentUser.email // Explicitly set user email for new goals
          });
        }
      }
      
      // Create missing goals in the database
      for (const goalData of monthsToCreate) {
        await MonthlyGoal.create(goalData);
      }
      
      // Reload goals after potential creation to get the latest state including new IDs
      const updatedGoals = await MonthlyGoal.filter({ user_email: currentUser.email }); // Filter by 'user_email'
      setGoals(updatedGoals);
      
    } catch (error) {
      console.error("Error loading monthly goals:", error);
    } finally {
      setIsLoading(false); // Set loading to false
    }
  };

  const handleOpenDialog = (goal) => {
    setEditingGoal(goal);
    setFormData({
      goal_text: goal.goal_text || "",
      target_date: goal.target_date || "",
      status: goal.status || "לא נקבעה",
      feedback_notes: goal.feedback_notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user) { // Added user check from outline
      alert("שגיאה: לא נמצא משתמש מחובר.");
      return;
    }

    try {
      // Because `loadGoals` pre-populates goals for months 1-3, `editingGoal` will always have an `id`.
      // Therefore, we will always perform an UPDATE operation.
      const dataToSave = {
        ...formData,
        user_email: user.email, // Explicitly set user email for the goal
        month: editingGoal.month, // Ensure month is preserved
        // Keep existing set_date logic: update if goal_text is being set for the first time
        set_date: formData.goal_text && !editingGoal.goal_text ? format(new Date(), "yyyy-MM-dd") : editingGoal.set_date
      };
      
      await MonthlyGoal.update(editingGoal.id, dataToSave);
      setIsDialogOpen(false);
      setEditingGoal(null);
      loadGoals(); // Reload goals after saving
    } catch (error) {
      console.error("Error saving monthly goal:", error);
      alert('שגיאה בשמירת המטרה'); // Added error alert from outline
    }
  };

  const getStatusIcon = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption ? statusOption.icon : "⚪";
  };

  const getStatusColor = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption ? statusOption.color : "bg-gray-100 text-gray-800";
  };

  const getDaysUntilTarget = (targetDate) => {
    if (!targetDate) return null;
    const days = differenceInDays(parseISO(targetDate), new Date());
    return days;
  };

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-48">
          <p className="text-xl text-gray-500">...טוען מטרות חודשיות</p>
        </div>
      ) : (
        <Card className="muscle-glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-800">
              <Calendar1 className="w-6 h-6 text-purple-600" />
              מטרות חודשיות
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {goals.map(goal => {
                const daysUntilTarget = getDaysUntilTarget(goal.target_date);
                
                return (
                  <Card key={goal.id} className="border-l-4 border-purple-400 bg-gradient-to-r from-purple-50 to-white">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-purple-600">חודש {goal.month}</span>
                          <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(goal.status)}`}>
                            {getStatusIcon(goal.status)} {goal.status}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDialog(goal)}
                          className="flex items-center gap-2"
                        >
                          <Edit className="w-4 h-4" />
                          {goal.goal_text ? 'ערוך' : 'קבע מטרה'}
                        </Button>
                      </div>
                      
                      {goal.goal_text ? (
                        <div className="space-y-2">
                          <div>
                            <h4 className="font-semibold text-slate-800 mb-1">🎯 המטרה:</h4>
                            <p className="text-slate-700">{goal.goal_text}</p>
                          </div>
                          
                          {goal.target_date && (
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span>📅 יעד: {format(parseISO(goal.target_date), "dd/MM/yyyy")}</span>
                              {daysUntilTarget !== null && (
                                <span className={`px-2 py-1 rounded ${
                                  daysUntilTarget > 0 ? 'bg-blue-100 text-blue-800' : 
                                  daysUntilTarget === 0 ? 'bg-orange-100 text-orange-800' : 
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {daysUntilTarget > 0 ? `${daysUntilTarget} ימים נותרו` : 
                                   daysUntilTarget === 0 ? 'היום!' : 
                                   `עבר ${Math.abs(daysUntilTarget)} ימים`}
                                </span>
                              )}
                            </div>
                          )}
                          
                          {goal.feedback_notes && (
                            <div>
                              <h4 className="font-semibold text-slate-800 mb-1">📝 תובנות:</h4>
                              <p className="text-slate-600 text-sm">{goal.feedback_notes}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500">
                          <Target className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                          <p>עדיין לא נקבעה מטרה לחודש זה</p>
                          <p className="text-sm">לחץ על "קבע מטרה" כדי להתחיל</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Goal Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editingGoal ? `מטרה לחודש ${editingGoal.month}` : 'מטרה חודשית חדשה'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>🎯 נסח/י את המטרה לחודש זה</Label>
              <Textarea
                value={formData.goal_text}
                onChange={e => setFormData({...formData, goal_text: e.target.value})}
                placeholder="למשל: לרדת 2 ק״ג ולהתאמן 3 פעמים בשבוע"
                className="h-24"
              />
            </div>
            
            <div className="space-y-2">
              <Label>📅 תאריך יעד</Label>
              <Input
                type="date"
                value={formData.target_date}
                onChange={e => setFormData({...formData, target_date: e.target.value})}
              />
            </div>
            
            <div className="space-y-2">
              <Label>🧭 סטטוס ביצוע</Label>
              <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>📝 הערות / תובנות</Label>
              <Textarea
                value={formData.feedback_notes}
                onChange={e => setFormData({...formData, feedback_notes: e.target.value})}
                placeholder="רשם/י תובנות, קשיים שעלו, או חיזוקים שעזרו..."
                className="h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ביטול</Button>
            <Button onClick={handleSave}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
