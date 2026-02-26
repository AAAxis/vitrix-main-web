import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, X } from 'lucide-react';

export default function WeightEntryForm({ 
  user, 
  formData, 
  handleInputChange, 
  handleSaveEntry, 
  onCancel, 
  isSaving 
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="date">תאריך המדידה</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={handleInputChange}
          disabled={isSaving}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="weight">משקל (ק״ג)</Label>
        <Input
          id="weight"
          type="number"
          step="0.1"
          min="20"
          max="300"
          placeholder="לדוגמה: 75.5"
          value={formData.weight}
          onChange={handleInputChange}
          disabled={isSaving}
          autoComplete="off"
        />
        <p className="text-xs text-slate-500">
          ניתן להזין משקל עם נקודה עשרונית (למשל: 75.5)
        </p>
      </div>

      <div className="md:col-span-2 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
        >
          <X className="w-4 h-4 me-2" />
          בטל
        </Button>
        <Button
          type="button"
          onClick={handleSaveEntry}
          disabled={isSaving || !formData.weight || !formData.date}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isSaving ? (
            <>שומר...</>
          ) : (
            <>
              <Save className="w-4 h-4 me-2" />
              שמור מדידה
            </>
          )}
        </Button>
      </div>
    </div>
  );
}