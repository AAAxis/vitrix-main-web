import React, { useState, useRef } from 'react';
import { UploadFile } from '@/api/integrations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Upload, Loader2, CheckCircle, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

export default function ProfileCamera({ user, onProfileImageUpdate }) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef(null);

  const handleCameraCapture = () => {
    // Trigger camera input with front-facing camera preference
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target.result);
        setIsCameraOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadProfileImage = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    setUploadSuccess(false);

    try {
      // Convert base64 to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      // Create file object
      const file = new File([blob], 'profile-image.jpg', { type: 'image/jpeg' });
      
      // Upload file
      const { file_url } = await UploadFile({ file });
      
      // Update user profile with new image
      await onProfileImageUpdate(file_url);
      
      setUploadSuccess(true);
      setTimeout(() => {
        setIsCameraOpen(false);
        setCapturedImage(null);
        setUploadSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error uploading profile image:', error);
      alert('שגיאה בהעלאת התמונה. אנא נסה שוב.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setIsCameraOpen(false);
    setCapturedImage(null);
    setUploadSuccess(false);
  };

  // If user already has a profile image, only show the camera button
  if (user?.profile_image_url) {
    return (
      <>
        <div className="text-center mb-6">
          <Button
            onClick={handleCameraCapture}
            className="muscle-primary-gradient text-white flex items-center gap-2"
          >
            <Camera className="w-4 h-4" />
            צלם תמונת פרופיל חדשה
          </Button>
        </div>

        {/* Hidden file input for camera */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="user"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />

        {/* Preview Dialog */}
        <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
          <DialogContent className="muscle-glass max-w-md" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-600" />
                תצוגה מקדימה - תמונת פרופיל
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {capturedImage && (
                <div className="w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <img 
                    src={capturedImage} 
                    alt="תצוגה מקדימה" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              {uploadSuccess && (
                <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                  <CheckCircle className="w-5 h-5" />
                  תמונת הפרופיל עודכנה בהצלחה!
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                disabled={isUploading}
              >
                <X className="w-4 h-4 mr-2" />
                ביטול
              </Button>
              <Button 
                onClick={handleUploadProfileImage}
                disabled={isUploading || uploadSuccess}
                className="muscle-primary-gradient text-white"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    מעלה...
                  </>
                ) : uploadSuccess ? (
                  'הושלם!'
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    שמור כתמונת פרופיל
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // If user doesn't have a profile image, show the full card
  return (
    <>
      <Card className="muscle-glass border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Camera className="w-5 h-5 text-purple-600" />
            תמונת פרופיל
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {/* Current Profile Image */}
          <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-slate-100 border-4 border-white shadow-lg">
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-blue-500">
              <span className="text-white text-4xl font-bold">
                {user?.name?.charAt(0) || '👤'}
              </span>
            </div>
          </div>

          {/* Camera Button */}
          <Button
            onClick={handleCameraCapture}
            className="muscle-primary-gradient text-white flex items-center gap-2 mx-auto"
          >
            <Camera className="w-4 h-4" />
            צלם סלפי חדש
          </Button>

          <p className="text-xs text-slate-500">
            לחץ כדי לצלם תמונת פרופיל חדשה מהמצלמה הקדמית
          </p>
        </CardContent>
      </Card>

      {/* Hidden file input for camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Preview Dialog */}
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="muscle-glass max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-purple-600" />
              תצוגה מקדימה - תמונת פרופיל
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {capturedImage && (
              <div className="w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg">
                <img 
                  src={capturedImage} 
                  alt="תצוגה מקדימה" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            {uploadSuccess && (
              <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-5 h-5" />
                תמונת הפרופיל עודכנה בהצלחה!
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={isUploading}
            >
              <X className="w-4 h-4 mr-2" />
              ביטול
            </Button>
            <Button 
              onClick={handleUploadProfileImage}
              disabled={isUploading || uploadSuccess}
              className="muscle-primary-gradient text-white"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  מעלה...
                </>
              ) : uploadSuccess ? (
                'הושלם!'
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  שמור כתמונת פרופיל
                </>
              )}
            </Button>
          </DialogFooter>
        </Dialog>
      </Dialog>
    </>
  );
}