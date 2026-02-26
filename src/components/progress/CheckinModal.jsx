import React, { useState } from 'react';
import { WeeklyCheckin } from '@/api/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { getCurrentISOString } from '@/components/utils/timeUtils';

export default function CheckinModal({ isOpen, onClose, question, weekNumber, user }) {
  const [answer, setAnswer] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (!answer.trim()) {
      return; // Don't close if no answer provided
    }
    
    setIsSaving(true);
    try {
      await WeeklyCheckin.create({
        user_email: user.email,
        user_name: user.name,
        week_number: weekNumber,
        question_text: question,
        answer_text: answer.trim(),
        submitted_at: getCurrentISOString()
      });
      onClose(); // Only close after successful save
    } catch (error) {
      console.error("Error saving weekly check-in:", error);
      // Could show error message to user here
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} dir="rtl">
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">שאלת ליווי שבועית</DialogTitle>
          <DialogDescription className="text-center text-slate-600">
            {question}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="שתף אותנו במחשבות שלך..."
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={4}
            className="resize-none"
          />
        </div>
        <div className="flex justify-center">
          <Button 
            onClick={handleSubmit} 
            disabled={isSaving || !answer.trim()}
            className="w-full max-w-xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 me-2 animate-spin"/>
                שולח...
              </>
            ) : (
              'שלח תשובה'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}