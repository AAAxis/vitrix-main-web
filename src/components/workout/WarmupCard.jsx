
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Flame } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export default function WarmupCard({ warmup, onUpdate }) {
  // Initialize states based on the 'warmup' prop, or sensible defaults
  const [warmupCompleted, setWarmupCompleted] = useState(warmup?.completed || false);
  const [description, setDescription] = useState(warmup?.description || '');
  // Duration should be a string for the input field to prevent uncontrolled component warnings,
  // but parsed to number when passed to parent.
  const [duration, setDuration] = useState(warmup?.duration?.toString() || '');

  // Use useEffect to call onUpdate whenever local states change
  useEffect(() => {
    onUpdate({
      completed: warmupCompleted,
      description: description,
      // Convert duration string to a number for the parent component, default to 0 if invalid
      duration: parseInt(duration) || 0,
    });
  }, [warmupCompleted, description, duration, onUpdate]);

  // Sync local state when the 'warmup' prop changes from the parent
  useEffect(() => {
    setWarmupCompleted(warmup?.completed || false);
    setDescription(warmup?.description || '');
    setDuration(warmup?.duration?.toString() || '');
  }, [warmup]);

  return (
    <Card className="muscle-glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <Flame className="w-6 h-6 text-orange-500"/>
          חימום
        </CardTitle>
        <CardDescription>
          סמן אם בצעת חימום ותאר מה הוא כלל
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Switch id="warmup-completed" checked={warmupCompleted} onCheckedChange={setWarmupCompleted}/>
            <Label htmlFor="warmup-completed" className="text-base">ביצעתי חימום</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="warmup-description">תיאור החימום</Label>
              <Textarea
                id="warmup-description"
                placeholder="לדוגמה: 5 דקות ריצה קלה, מתיחות דינמיות..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warmup-duration">משך החימום (דקות)</Label>
              <Input
                id="warmup-duration"
                type="number"
                placeholder="10"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
