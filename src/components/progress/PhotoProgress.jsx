
import React, { useState, useEffect } from "react";
import { ProgressPicture, User } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Camera, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import FatPercentageEstimator from "./FatPercentageEstimator";
import { getCurrentDateString } from "@/components/utils/timeUtils"; // Changed import path

const photoTypes = ["תחילת תהליך", "סיום תהליך", "תמונת התקדמות"];

const getPhotoTypeColor = (type) => {
  switch(type) {
    case "תחילת תהליך": return "bg-blue-100 text-blue-800";
    case "סיום תהליך": return "bg-green-100 text-green-800";
    default: return "bg-purple-100 text-purple-800";
  }
};

export default function PhotoProgress() {
  const [pictures, setPictures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [formData, setFormData] = useState({
    photo_date: getCurrentDateString(), // Changed to use getCurrentDateString
    photo_type: "תמונת התקדמות",
    description: ""
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        loadPictures(currentUser.email);
      } catch (error) {
        console.error("Failed to fetch user:", error);
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const loadPictures = async (userEmail) => {
    setIsLoading(true);
    try {
      const userPictures = await ProgressPicture.filter({ user_email: userEmail }, "-photo_date");
      setPictures(userPictures);
    } catch (error) {
      console.error("Error loading pictures:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError('');
    } else {
      setSelectedFile(null);
      setPreviewUrl('');
    }
  };

  const handleSave = async () => {
    if (!selectedFile) {
        setUploadError("יש לבחור תמונה להעלאה.");
        return;
    }
    if (!formData.photo_date || !formData.photo_type) {
        setUploadError("יש לבחור תאריך וסוג תמונה.");
        return;
    }
    if (!user) {
        setUploadError("שגיאה: לא נמצא משתמש מחובר.");
        return;
    }

    setIsUploading(true);
    setUploadError('');

    try {
        const { file_url } = await UploadFile({ file: selectedFile });
        await ProgressPicture.create({
            user_email: user.email,
            image_url: file_url,
            ...formData,
        });

        setIsDialogOpen(false);
        setFormData({ // Reset form data to defaults with consistent date
            photo_date: getCurrentDateString(), // Changed to use getCurrentDateString
            photo_type: "תמונת התקדמות",
            description: ""
        });
        setSelectedFile(null);
        setPreviewUrl('');
        loadPictures(user.email);
    } catch (error) {
        console.error("Error saving picture:", error);
        setUploadError("שגיאה בשמירת התמונה. אנא נסה שוב.");
    } finally {
        setIsUploading(false);
    }
  };
  
  const handleDelete = async (picId) => {
      if(window.confirm("האם למחוק את התמונה?")) {
          try {
              await ProgressPicture.delete(picId);
              if (user) {
                  loadPictures(user.email);
              }
          } catch(e) {
              console.error("Error deleting picture", e);
          }
      }
  }

  const groupedPictures = pictures.reduce((acc, pic) => {
    (acc[pic.photo_type] = acc[pic.photo_type] || []).push(pic);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {/* AI Fat Estimator */}
      <FatPercentageEstimator />

      {/* Existing Photo Gallery */}
      <Card className="muscle-glass border-0 shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Camera className="w-6 h-6 text-blue-600" />
            תמונות התקדמות
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (open) {
                setFormData({
                    photo_date: getCurrentDateString(), // Changed to use getCurrentDateString
                    photo_type: "תמונת התקדמות",
                    description: ""
                });
                setSelectedFile(null);
                setPreviewUrl('');
                setUploadError('');
            }
          }}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="w-4 h-4 me-2" />
                    הוסף תמונה
                </Button>
            </DialogTrigger>
            <DialogContent dir="rtl">
              <DialogHeader><DialogTitle>הוספת תמונת התקדמות</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                 <div className="space-y-2">
                     <Label>תאריך צילום</Label>
                     <Input type="date" value={formData.photo_date} onChange={e => setFormData({...formData, photo_date: e.target.value})} />
                 </div>
                 
                 <div className="space-y-2">
                     <Label>סוג התמונה</Label>
                     <Select value={formData.photo_type} onValueChange={v => setFormData({...formData, photo_type: v})}>
                       <SelectTrigger>
                         <SelectValue placeholder="בחר סוג תמונה" />
                       </SelectTrigger>
                       <SelectContent>
                         {photoTypes.map(type => (
                           <SelectItem key={type} value={type}>{type}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                 </div>
                 
                 <div className="space-y-2">
                     <Label>העלאת תמונה</Label>
                     <Input type="file" accept="image/*" onChange={handleFileChange} />
                     {isUploading && <div className="flex items-center"><Loader2 className="w-4 h-4 animate-spin me-2" /> <span>מעלה...</span></div>}
                     {previewUrl && <img src={previewUrl} alt="תצוגה מקדימה" className="mt-2 rounded-lg max-h-48" />}
                     {uploadError && <p className="text-red-500 text-sm mt-2">{uploadError}</p>}
                 </div>
                 <div className="space-y-2">
                     <Label>תיאור (אופציונלי)</Label>
                     <Textarea value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                 </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ביטול</Button>
                <Button onClick={handleSave} disabled={isUploading || !selectedFile}>שמור</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
            {isLoading && <p>טוען תמונות...</p>}
            {!isLoading && pictures.length === 0 && <p className="text-center text-slate-500">עדיין לא הועלו תמונות.</p>}
            
            {/* Display photos grouped by type */}
            {!isLoading && Object.entries(groupedPictures).map(([type, pics]) => (
              <div key={type} className="mb-8">
                <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm ${getPhotoTypeColor(type)}`}>{type}</span>
                  <span className="text-sm text-slate-500">({pics.length} תמונות)</span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {pics.map(pic => (
                      <div key={pic.id} className="relative group">
                          <img src={pic.image_url} alt={pic.description || (pic.photo_date ? format(new Date(pic.photo_date), "dd/MM/yy") : type)} className="rounded-lg object-cover aspect-square" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 text-white">
                              <div>
                                  <p className="font-bold">{pic.photo_date ? format(new Date(pic.photo_date), "dd/MM/yyyy") : "תאריך לא זמין"}</p>
                                  <p className="text-sm">{pic.description}</p>
                              </div>
                              <Button variant="destructive" size="sm" onClick={() => handleDelete(pic.id)}><Trash2 className="w-4 h-4" /></Button>
                          </div>
                      </div>
                  ))}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
