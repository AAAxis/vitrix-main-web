import React, { useState, useEffect } from 'react';
import { User, CoachMenu } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UploadCloud, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function UploadCoachMenu() {
  const [file, setFile] = useState(null);
  const [instructions, setInstructions] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const users = await User.list();
            setAllUsers(users);
        } catch (error) {
            console.error("Failed to fetch users:", error);
        }
    };
    fetchUsers();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setSuccessMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      alert("יש לבחור קובץ להעלאה.");
      return;
    }
    if (!selectedUserEmail) {
        alert("יש לבחור מתאמן מהרשימה.");
        return;
    }

    setIsUploading(true);
    setSuccessMessage("");
    try {
      const { file_url } = await UploadFile({ file });

      const menuData = {
        user_email: selectedUserEmail,
        upload_date: format(new Date(), "yyyy-MM-dd"),
        menu_file_url: file_url,
        instructions: instructions
      };

      await CoachMenu.create(menuData);
      
      const selectedUserName = allUsers.find(u => u.email === selectedUserEmail)?.name || selectedUserEmail;
      setSuccessMessage(`התפריט הועלה ונקשר ל${selectedUserName} בהצלחה!`);
      setFile(null);
      setInstructions("");
      setSelectedUserEmail("");
      if (document.getElementById('menu-file-input')) {
        document.getElementById('menu-file-input').value = "";
      }

    } catch (error) {
      console.error("Error uploading menu:", error);
      alert("אירעה שגיאה בהעלאת התפריט.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
       <div className="space-y-2">
          <Label htmlFor="user-select-menu">בחר מתאמן</Label>
          <Select onValueChange={setSelectedUserEmail} value={selectedUserEmail}>
              <SelectTrigger id="user-select-menu">
                  <SelectValue placeholder="בחר מתאמן..." />
              </SelectTrigger>
              <SelectContent>
                  {allUsers.map(user => (
                      <SelectItem key={user.id} value={user.email}>
                          {user.name || user.email}
                      </SelectItem>
                  ))}
              </SelectContent>
          </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="menu-file-input" className="font-semibold text-slate-700">העלאת תפריט חדש</Label>
        <Input 
          id="menu-file-input"
          type="file" 
          accept="image/*,.pdf" 
          onChange={handleFileChange} 
          disabled={isUploading} 
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="instructions">הנחיות נלוות לתפריט</Label>
        <Textarea
          id="instructions"
          placeholder="רשום כאן הנחיות כלליות, דגשים, או כל מידע רלוונטי לתפריט..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          disabled={isUploading}
          className="h-24"
        />
      </div>
      <Button onClick={handleUpload} disabled={isUploading || !file || !selectedUserEmail} className="w-full muscle-primary-gradient text-white">
        {isUploading ? (
          <>
            <Loader2 className="me-2 h-4 w-4 animate-spin" />
            מעלה...
          </>
        ) : (
          <>
            <UploadCloud className="me-2 h-4 w-4" />
            העלה וקשר למתאמן
          </>
        )}
      </Button>
      {successMessage && (
        <div className="flex items-center gap-2 text-sm text-green-600 p-3 bg-green-50 rounded-lg mt-4">
          <CheckCircle className="w-4 h-4" />
          {successMessage}
        </div>
      )}
    </div>
  );
}