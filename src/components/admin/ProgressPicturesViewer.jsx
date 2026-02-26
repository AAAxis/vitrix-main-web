
import React, { useState, useEffect } from 'react';
import { ProgressPicture, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar, User as UserIcon, Image as ImageIcon, Trash2, Eye, Filter, Search,
  ChevronDown, ChevronUp, AlertTriangle, Download, X, Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { formatDateTime } from '@/components/utils/timeUtils'; // Keeping this for potential future use or if still referenced somewhere
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

export default function ProgressPicturesViewer() {
  const [userPictures, setUserPictures] = useState({}); // Stores pictures grouped by user email
  const [users, setUsers] = useState([]); // Stores all users
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUserAlbum, setSelectedUserAlbum] = useState(null); // The album currently open in the dialog
  const [isAlbumOpen, setIsAlbumOpen] = useState(false); // Controls the album dialog visibility
  const [zoomedImage, setZoomedImage] = useState(null); // For the full-screen image zoom dialog

  useEffect(() => {
    loadProgressPictures();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy', { locale: he });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original if parsing fails
    }
  };

  const loadProgressPictures = async () => {
    setIsLoading(true);
    try {
      const [allUsers, progressPics] = await Promise.all([
        User.list(),
        ProgressPicture.list('-photo_date') // Fetching sorted by date descending
      ]);

      setUsers(allUsers); // Store all users in state

      const userMap = new Map(allUsers.map(u => [u.email, u]));

      const grouped = progressPics.reduce((acc, pic) => {
        const userEmail = pic.user_email;
        if (!userEmail || !userMap.has(userEmail)) return acc;

        if (!acc[userEmail]) {
          acc[userEmail] = [];
        }
        acc[userEmail].push(pic);
        return acc;
      }, {});

      // Convert map to object and store
      setUserPictures(grouped);

    } catch (error) {
      console.error('Error loading progress pictures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePicture = async (pictureId) => {
    try {
      await ProgressPicture.delete(pictureId);

      // Update state to remove the deleted picture
      setUserPictures(prevUserPictures => {
        const newUserPictures = { ...prevUserPictures };
        Object.keys(newUserPictures).forEach(userEmail => {
          newUserPictures[userEmail] = newUserPictures[userEmail].filter(pic => pic.id !== pictureId);
          // Remove user entry if no pictures left
          if (newUserPictures[userEmail].length === 0) {
            delete newUserPictures[userEmail];
          }
        });
        return newUserPictures;
      });

      // Update selected user album if it's currently open
      if (selectedUserAlbum && selectedUserAlbum.pictures.some(pic => pic.id === pictureId)) {
        setSelectedUserAlbum(prev => {
          const updatedPictures = prev.pictures.filter(pic => pic.id !== pictureId);
          if (updatedPictures.length === 0) {
            setIsAlbumOpen(false); // Close modal if no pictures left
            return null;
          }
          return {
            ...prev,
            pictures: updatedPictures
          };
        });
      }
      alert('התמונה נמחקה בהצלחה');
    } catch (error) {
      console.error('Error deleting picture:', error);
      alert('שגיאה במחיקת התמונה');
    }
  };

  const handleOpenAlbum = (userEmail) => {
    const user = users.find(u => u.email === userEmail);
    const pictures = userPictures[userEmail] || [];
    if (user && pictures.length > 0) {
      setSelectedUserAlbum({ user, pictures });
      setIsAlbumOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        <p className="me-4 text-slate-600">טוען תמונות התקדמות...</p>
      </div>
    );
  }

  const totalPictures = Object.values(userPictures).reduce((sum, pics) => sum + pics.length, 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main User Albums Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Object.entries(userPictures).map(([userEmail, pictures]) => {
          const user = users.find(u => u.email === userEmail);
          const latestPicture = pictures[0]; // Already sorted by date desc

          if (!user || pictures.length === 0) return null; // Don't render if user or pictures are missing

          return (
            <motion.div
              key={userEmail}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card
                className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-white border-s-4 border-l-purple-500"
              >
                <CardHeader className="p-4 sm:p-6 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      {user?.profile_image_url ? (
                        <img src={user.profile_image_url} alt={user.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-200 flex items-center justify-center">
                          <UserIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg truncate">{user?.name || userEmail}</CardTitle>
                      <p className="text-xs sm:text-sm text-slate-500">{pictures.length} תמונות התקדמות</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {latestPicture && (
                    <div className="mb-4" onClick={() => handleOpenAlbum(userEmail)}>
                      <img
                        src={latestPicture.image_url}
                        alt="תמונת התקדמות אחרונה"
                        className="w-full h-32 sm:h-40 object-cover rounded-lg"
                      />
                      <p className="text-xs text-slate-500 mt-2">
                        תמונה אחרונה: {formatDate(latestPicture.photo_date)}
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={() => handleOpenAlbum(userEmail)}
                    className="w-full text-sm"
                    variant="outline"
                  >
                    <Eye className="w-4 h-4 me-2" />
                    צפה בכל התמונות
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {totalPictures === 0 && !isLoading && (
        <div className="text-center py-12 text-slate-500">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-xl">אין תמונות התקדמות</p>
        </div>
      )}

      {/* Progress Pictures Album Dialog */}
      <Dialog open={isAlbumOpen} onOpenChange={setIsAlbumOpen}>
        <DialogContent className="w-[95vw] max-w-6xl max-h-[95vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader className="p-4 sm:p-6 pb-4">
            <DialogTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-xl">
              <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700" />
              <span className="truncate">אלבום התקדמות - {selectedUserAlbum?.user?.name}</span>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 px-4 sm:px-6 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {selectedUserAlbum?.pictures.map((picture) => (
                  <motion.div
                    key={picture.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="relative group"
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
                      <div className="relative">
                        <img
                          src={picture.image_url}
                          alt="תמונת התקדמות"
                          className="w-full h-48 sm:h-56 object-cover cursor-pointer"
                          onClick={() => setZoomedImage(picture.image_url)}
                        />

                        {/* Delete button overlay */}
                        <div className="absolute top-2 end-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="destructive"
                                className="h-8 w-8 shadow-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="w-5 h-5 text-red-500" />
                                  מחיקת תמונת התקדמות
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  האם אתה בטוח שברצונך למחוק את התמונה הזו? פעולה זו אינה הפיכה.
                                  <br />
                                  <strong>משתמש:</strong> {selectedUserAlbum?.user?.name}
                                  <br />
                                  <strong>תאריך:</strong> {formatDate(picture.photo_date)}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ביטול</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePicture(picture.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  מחק תמונה
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Badge className="bg-purple-100 text-purple-700 text-xs">
                              {picture.photo_type}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {formatDate(picture.photo_date)}
                            </span>
                          </div>

                          {picture.description && (
                            <p className="text-xs text-slate-600 line-clamp-2">
                              {picture.description}
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Dialog */}
      <Dialog open={!!zoomedImage} onOpenChange={() => setZoomedImage(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-4 flex flex-col items-center justify-center" dir="rtl">
          {zoomedImage && (
            <img
              src={zoomedImage}
              alt="תמונת התקדמות מוגדלת"
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
              style={{ cursor: 'zoom-out' }}
              onClick={() => setZoomedImage(null)}
            />
          )}
          <p className="text-center text-sm text-slate-500 mt-4">
            לחץ על התמונה או מחוץ לדיאלוג לסגירה
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
