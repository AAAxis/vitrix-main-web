
import React, { useState, useEffect } from 'react';
import { CalorieTracking, WaterTracking, ProgressPicture, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
    Image as ImageIcon,
    Utensils,
    Droplets,
    Camera,
    Calendar,
    Clock,
    User as UserIcon,
    Eye,
    MessageSquare
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { formatDateTime, getRelativeTime } from '@/components/utils/timeUtils';
import { motion, AnimatePresence } from 'framer-motion';

export default function SharedImagesViewer() {
    const [mealImages, setMealImages] = useState([]);
    const [waterImages, setWaterImages] = useState([]);
    const [progressImages, setProgressImages] = useState([]);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedModal, setSelectedModal] = useState(null);
    const [modalData, setModalData] = useState([]);

    useEffect(() => {
        loadAllSharedImages();
    }, []);

    const loadAllSharedImages = async () => {
        setIsLoading(true);
        try {
            const [allUsers, calorieEntries, waterEntries, progressPics] = await Promise.all([
                User.filter({}),
                CalorieTracking.filter({ shared_with_coach: true }, '-created_date'),
                WaterTracking.filter({ shared_with_coach: true }, '-created_date'),
                ProgressPicture.list('-photo_date')
            ]);

            setUsers(allUsers);

            // Filter entries with images
            const mealEntriesWithImages = calorieEntries.filter(entry => entry.meal_image);
            const waterEntriesWithImages = waterEntries.filter(entry => entry.photo_url);

            setMealImages(mealEntriesWithImages);
            setWaterImages(waterEntriesWithImages);
            setProgressImages(progressPics);

        } catch (error) {
            console.error('Error loading shared images:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getUserName = (email) => {
        const user = users.find(u => u.email === email);
        return user?.name || email;
    };

    const groupImagesByUser = (images, imageKey) => {
        const grouped = {};
        images.forEach(image => {
            const userEmail = image.user_email;
            if (!grouped[userEmail]) {
                grouped[userEmail] = [];
            }
            grouped[userEmail].push({
                ...image,
                imageUrl: image[imageKey],
                type: imageKey === 'meal_image' ? 'meal' : imageKey === 'photo_url' ? 'water' : 'progress'
            });
        });
        return grouped;
    };

    const openModal = (userEmail, images, type) => {
        setSelectedModal({ userEmail, type });
        setModalData(images.sort((a, b) => new Date(b.created_date || b.photo_date) - new Date(a.created_date || a.photo_date)));
    };

    const renderImageCard = (userEmail, images, type) => {
        const userName = getUserName(userEmail);
        const latestImage = images[0];
        const imageCount = images.length;

        return (
            <motion.div
                key={userEmail}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
            >
                <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer"
                      onClick={() => openModal(userEmail, images, type)}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <UserIcon className="w-5 h-5 text-slate-600" />
                                <div>
                                    <CardTitle className="text-lg">{userName}</CardTitle>
                                    <p className="text-sm text-slate-500">{userEmail}</p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="flex items-center gap-1">
                                <ImageIcon className="w-3 h-3" />
                                {imageCount} תמונות
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="relative">
                                <img
                                    src={latestImage.imageUrl}
                                    alt="Latest shared image"
                                    className="w-full h-48 object-cover rounded-lg"
                                />
                                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                                    {formatDateTime(latestImage.created_date || latestImage.photo_date)}
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-sm text-slate-600">
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {getRelativeTime(latestImage.created_date || latestImage.photo_date)}
                                </span>
                                <Button variant="outline" size="sm" className="flex items-center gap-1">
                                    <Eye className="w-4 h-4" />
                                    צפה בהכל
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        );
    };

    const renderMealAndWaterTab = () => {
        const mealsByUser = groupImagesByUser(mealImages, 'meal_image');
        const watersByUser = groupImagesByUser(waterImages, 'photo_url');

        // Combine and deduplicate users
        const allUserEmails = [...new Set([...Object.keys(mealsByUser), ...Object.keys(watersByUser)])];

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">ארוחות ומעקב מים</h3>
                    <Badge variant="outline">
                        {allUserEmails.length} משתמשים פעילים
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allUserEmails.map(userEmail => {
                        const userMeals = mealsByUser[userEmail] || [];
                        const userWater = watersByUser[userEmail] || [];
                        const allUserImages = [...userMeals, ...userWater].sort(
                            (a, b) => new Date(b.created_date || b.photo_date) - new Date(a.created_date || a.photo_date)
                        );

                        if (allUserImages.length === 0) return null;

                        return renderImageCard(userEmail, allUserImages, 'nutrition');
                    })}
                </div>

                {allUserEmails.length === 0 && (
                    <Card className="text-center py-12 text-slate-500">
                        <CardContent className="flex flex-col items-center justify-center">
                            <Utensils className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg font-medium">אין תמונות ארוחות ומים ששותפו עם המאמן</p>
                            <p className="text-sm mt-1">כאשר מתאמנים ישתפו, הן יופיעו כאן.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    const renderProgressTab = () => {
        const progressByUser = groupImagesByUser(progressImages, 'image_url');

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">תמונות התקדמות</h3>
                    <Badge variant="outline">
                        {Object.keys(progressByUser).length} משתמשים
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.entries(progressByUser).map(([userEmail, images]) =>
                        renderImageCard(userEmail, images, 'progress')
                    )}
                </div>

                {Object.keys(progressByUser).length === 0 && (
                    <Card className="text-center py-12 text-slate-500">
                        <CardContent className="flex flex-col items-center justify-center">
                            <Camera className="w-16 h-16 mb-4 opacity-50" />
                            <p className="text-lg font-medium">אין תמונות התקדמות</p>
                            <p className="text-sm mt-1">כאשר מתאמנים ישתפו, הן יופיעו כאן.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <Card>
                <CardContent className="p-6 text-center">
                    <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p>טוען תמונות משותפות...</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ImageIcon className="w-6 h-6 text-purple-600" />
                        תמונות משותפות
                    </CardTitle>
                    <CardDescription>
                        צפיה בתמונות שהמתאמנים שיתפו - ארוחות, מעקב מים ותמונות התקדמות
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="nutrition" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="nutrition" className="flex items-center gap-2">
                                <Utensils className="w-4 h-4" />
                                ארוחות ומים
                            </TabsTrigger>
                            <TabsTrigger value="progress" className="flex items-center gap-2">
                                <Camera className="w-4 h-4" />
                                תמונות התקדמות
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="nutrition" className="mt-6">
                            {renderMealAndWaterTab()}
                        </TabsContent>

                        <TabsContent value="progress" className="mt-6">
                            {renderProgressTab()}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Image Detail Modal */}
            <Dialog open={!!selectedModal} onOpenChange={() => setSelectedModal(null)}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserIcon className="w-5 h-5" />
                            {selectedModal && getUserName(selectedModal.userEmail)} -
                            {selectedModal?.type === 'progress' ? 'תמונות התקדמות' : 'ארוחות ומעקב מים'}
                        </DialogTitle>
                    </DialogHeader>

                    <ScrollArea className="h-[70vh] pr-4">
                        <div className="space-y-4">
                            <AnimatePresence>
                                {modalData.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ delay: index * 0.1 }}
                                    >
                                        <Card>
                                            <CardContent className="p-4">
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div>
                                                        <img
                                                            src={item.imageUrl}
                                                            alt="Shared content"
                                                            className="w-full h-64 object-cover rounded-lg"
                                                        />
                                                    </div>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                                            <Calendar className="w-4 h-4" />
                                                            {formatDateTime(item.created_date || item.photo_date)}
                                                        </div>

                                                        {item.type === 'meal' && (
                                                            <>
                                                                <div>
                                                                    <Label className="text-sm font-semibold">ארוחה:</Label>
                                                                    <p className="text-sm">{item.meal_type}</p>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-sm font-semibold">תיאור:</Label>
                                                                    <p className="text-sm">{item.meal_description}</p>
                                                                </div>
                                                                {item.estimated_calories && (
                                                                    <div>
                                                                        <Label className="text-sm font-semibold">קלוריות:</Label>
                                                                        <p className="text-sm">{item.estimated_calories}</p>
                                                                    </div>
                                                                )}
                                                                {item.coach_note && (
                                                                    <div>
                                                                        <Label className="text-sm font-semibold flex items-center gap-1">
                                                                            <MessageSquare className="w-3 h-3" />
                                                                            הערה למאמן:
                                                                        </Label>
                                                                        <p className="text-sm bg-blue-50 p-2 rounded">{item.coach_note}</p>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}

                                                        {item.type === 'water' && (
                                                            <>
                                                                <div>
                                                                    <Label className="text-sm font-semibold">כמות:</Label>
                                                                    <p className="text-sm">{item.amount_ml} מ"ל</p>
                                                                </div>
                                                                <div>
                                                                    <Label className="text-sm font-semibold">סוג כלי:</Label>
                                                                    <p className="text-sm">{item.container_type}</p>
                                                                </div>
                                                                {item.coach_note && (
                                                                    <div>
                                                                        <Label className="text-sm font-semibold flex items-center gap-1">
                                                                            <MessageSquare className="w-3 h-3" />
                                                                            הערה למאמן:
                                                                        </Label>
                                                                        <p className="text-sm bg-blue-50 p-2 rounded">{item.coach_note}</p>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}

                                                        {item.type === 'progress' && (
                                                            <>
                                                                <div>
                                                                    <Label className="text-sm font-semibold">סוג תמונה:</Label>
                                                                    <Badge className="mr-2">{item.photo_type}</Badge>
                                                                </div>
                                                                {item.description && (
                                                                    <div>
                                                                        <Label className="text-sm font-semibold">תיאור:</Label>
                                                                        <p className="text-sm">{item.description}</p>
                                                                    </div>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
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
        </div>
    );
}
