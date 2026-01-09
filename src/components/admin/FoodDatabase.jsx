import React, { useState, useEffect, useCallback } from 'react';
import { FoodItem } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { getCurrentISOString } from '@/components/utils/timeUtils';

const foodCategories = ["חלבונים", "פחמימות", "ירקות", "פירות", "שומנים", "מוצרי חלב", "אחר"];

export default function FoodDatabase() {
    const { toast } = useToast();
    const [foodItems, setFoodItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name_he: '',
        name_en: '',
        category: foodCategories[0],
        calories_per_100g: '',
        protein_per_100g: '',
        carbs_per_100g: '',
        fat_per_100g: '',
        fiber_per_100g: '',
        serving_size: '',
        serving_unit: 'גרם',
        image_url: '',
        is_active: true
    });

    // Load food items
    const loadFoodItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const items = await FoodItem.list('-created_date');
            setFoodItems(items || []);
        } catch (error) {
            console.error('Error loading food items:', error);
            toast({
                title: 'שגיאה',
                description: 'לא ניתן לטעון את רשימת המזונות',
                variant: 'destructive'
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadFoodItems();
    }, [loadFoodItems]);

    // Auto-import basic foods if database is empty
    useEffect(() => {
        const autoImportFoods = async () => {
            if (foodItems.length === 0 && !isLoading) {
                try {
                    const response = await fetch('/data/foods.json');
                    const basicFoods = await response.json();

                    let successCount = 0;
                    for (const item of basicFoods) {
                        try {
                            await FoodItem.create({
                                ...item,
                                created_date: getCurrentISOString(),
                                updated_date: getCurrentISOString()
                            });
                            successCount++;
                        } catch (error) {
                            console.error('Error auto-importing:', item.name_he, error);
                        }
                    }

                    if (successCount > 0) {
                        loadFoodItems();
                        toast({
                            title: 'מאגר מזונות הוקם',
                            description: `${successCount} מזונות בסיסיים נוספו אוטומטית`
                        });
                    }
                } catch (error) {
                    console.error('Error auto-importing foods:', error);
                }
            }
        };

        autoImportFoods();
    }, [foodItems.length, isLoading, toast]);

    // Filter food items
    const filteredItems = foodItems.filter(item => {
        const matchesSearch = !searchQuery ||
            item.name_he?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.name_en?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // Reset form
    const resetForm = () => {
        setFormData({
            name_he: '',
            name_en: '',
            category: foodCategories[0],
            calories_per_100g: '',
            protein_per_100g: '',
            carbs_per_100g: '',
            fat_per_100g: '',
            fiber_per_100g: '',
            serving_size: '',
            serving_unit: 'גרם',
            image_url: '',
            is_active: true
        });
        setEditingItem(null);
    };

    // Open dialog for add/edit
    const handleOpenDialog = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData({
                name_he: item.name_he || '',
                name_en: item.name_en || '',
                category: item.category || foodCategories[0],
                calories_per_100g: item.calories_per_100g?.toString() || '',
                protein_per_100g: item.protein_per_100g?.toString() || '',
                carbs_per_100g: item.carbs_per_100g?.toString() || '',
                fat_per_100g: item.fat_per_100g?.toString() || '',
                fiber_per_100g: item.fiber_per_100g?.toString() || '',
                serving_size: item.serving_size?.toString() || '',
                serving_unit: item.serving_unit || 'גרם',
                image_url: item.image_url || '',
                is_active: item.is_active !== false
            });
        } else {
            resetForm();
        }
        setIsDialogOpen(true);
    };

    // Save food item
    const handleSave = async () => {
        if (!formData.name_he || !formData.category) {
            toast({
                title: 'שגיאה',
                description: 'יש למלא לפחות שם בעברית וקטגוריה',
                variant: 'destructive'
            });
            return;
        }

        setIsSaving(true);
        try {
            const dataToSave = {
                name_he: formData.name_he,
                name_en: formData.name_en,
                category: formData.category,
                calories_per_100g: Number(formData.calories_per_100g) || 0,
                protein_per_100g: Number(formData.protein_per_100g) || 0,
                carbs_per_100g: Number(formData.carbs_per_100g) || 0,
                fat_per_100g: Number(formData.fat_per_100g) || 0,
                fiber_per_100g: Number(formData.fiber_per_100g) || 0,
                serving_size: Number(formData.serving_size) || 100,
                serving_unit: formData.serving_unit,
                image_url: formData.image_url || null,
                is_active: formData.is_active,
                updated_date: getCurrentISOString()
            };

            if (editingItem) {
                await FoodItem.update(editingItem.id, dataToSave);
                toast({
                    title: 'הצלחה',
                    description: 'המזון עודכן בהצלחה'
                });
            } else {
                await FoodItem.create({
                    ...dataToSave,
                    created_date: getCurrentISOString()
                });
                toast({
                    title: 'הצלחה',
                    description: 'המזון נוסף בהצלחה'
                });
            }

            setIsDialogOpen(false);
            resetForm();
            loadFoodItems();
        } catch (error) {
            console.error('Error saving food item:', error);
            toast({
                title: 'שגיאה',
                description: 'לא ניתן לשמור את המזון',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Delete food item
    const handleDelete = async (item) => {
        if (!window.confirm(`האם אתה בטוח שברצונך למחוק את "${item.name_he}"?`)) {
            return;
        }

        try {
            await FoodItem.delete(item.id);
            toast({
                title: 'הצלחה',
                description: 'המזון נמחק בהצלחה'
            });
            loadFoodItems();
        } catch (error) {
            console.error('Error deleting food item:', error);
            toast({
                title: 'שגיאה',
                description: 'לא ניתן למחוק את המזון',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Search className="w-5 h-5" />
                                מאגר מזונות
                            </CardTitle>
                            <CardDescription>ניהול בסיס הנתונים של מזונות וערכים תזונתיים</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={() => handleOpenDialog()}>
                                <Plus className="w-4 h-4 mr-2" />
                                הוסף מזון
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Search and Filter */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <Label>חיפוש</Label>
                            <div className="relative">
                                <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="חפש לפי שם..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pr-10"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>קטגוריה</Label>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">כל הקטגוריות</SelectItem>
                                    {foodCategories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Food Items List */}
                    {isLoading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <Alert>
                            <AlertDescription>
                                {foodItems.length === 0
                                    ? 'אין מזונות במאגר. לחץ על "ייבוא מזונות ראשוניים" להתחיל.'
                                    : 'לא נמצאו מזונות התואמים את החיפוש.'}
                            </AlertDescription>
                        </Alert>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredItems.map(item => (
                                <Card key={item.id} className="relative">
                                    <CardHeader className="pb-3">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <CardTitle className="text-lg">{item.name_he}</CardTitle>
                                                {item.name_en && (
                                                    <p className="text-sm text-gray-500">{item.name_en}</p>
                                                )}
                                            </div>
                                            {!item.is_active && (
                                                <Badge variant="secondary">לא פעיל</Badge>
                                            )}
                                        </div>
                                        <Badge className="w-fit">{item.category}</Badge>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                                            <div>
                                                <span className="text-gray-600">קלוריות:</span>
                                                <span className="font-semibold mr-1">{item.calories_per_100g}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">חלבון:</span>
                                                <span className="font-semibold mr-1">{item.protein_per_100g}g</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">פחמימות:</span>
                                                <span className="font-semibold mr-1">{item.carbs_per_100g}g</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">שומן:</span>
                                                <span className="font-semibold mr-1">{item.fat_per_100g}g</span>
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 mb-3">
                                            מנה: {item.serving_size} {item.serving_unit}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleOpenDialog(item)}
                                                className="flex-1"
                                            >
                                                <Edit className="w-3 h-3 mr-1" />
                                                ערוך
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDelete(item)}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem ? 'עריכת מזון' : 'הוספת מזון חדש'}
                        </DialogTitle>
                        <DialogDescription>
                            מלא את הפרטים התזונתיים עבור 100 גרם מהמזון
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>שם בעברית *</Label>
                            <Input
                                value={formData.name_he}
                                onChange={(e) => setFormData({ ...formData, name_he: e.target.value })}
                                placeholder="לדוגמה: חזה עוף"
                            />
                        </div>
                        <div>
                            <Label>שם באנגלית</Label>
                            <Input
                                value={formData.name_en}
                                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                                placeholder="Example: Chicken Breast"
                            />
                        </div>
                        <div>
                            <Label>קטגוריה *</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {foodCategories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>קלוריות (ל-100 גרם)</Label>
                            <Input
                                type="number"
                                value={formData.calories_per_100g}
                                onChange={(e) => setFormData({ ...formData, calories_per_100g: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <Label>חלבון (גרם ל-100 גרם)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.protein_per_100g}
                                onChange={(e) => setFormData({ ...formData, protein_per_100g: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <Label>פחמימות (גרם ל-100 גרם)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.carbs_per_100g}
                                onChange={(e) => setFormData({ ...formData, carbs_per_100g: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <Label>שומן (גרם ל-100 גרם)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.fat_per_100g}
                                onChange={(e) => setFormData({ ...formData, fat_per_100g: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <Label>סיבים תזונתיים (גרם ל-100 גרם)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                value={formData.fiber_per_100g}
                                onChange={(e) => setFormData({ ...formData, fiber_per_100g: e.target.value })}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <Label>גודל מנה</Label>
                            <Input
                                type="number"
                                value={formData.serving_size}
                                onChange={(e) => setFormData({ ...formData, serving_size: e.target.value })}
                                placeholder="100"
                            />
                        </div>
                        <div>
                            <Label>יחידת מנה</Label>
                            <Select
                                value={formData.serving_unit}
                                onValueChange={(val) => setFormData({ ...formData, serving_unit: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="גרם">גרם</SelectItem>
                                    <SelectItem value="יחידה">יחידה</SelectItem>
                                    <SelectItem value="כף">כף</SelectItem>
                                    <SelectItem value="כוס">כוס</SelectItem>
                                    <SelectItem value='מ"ל'>מ"ל</SelectItem>
                                    <SelectItem value="פרוסה">פרוסה</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Label>קישור לתמונה (אופציונלי)</Label>
                            <Input
                                value={formData.image_url}
                                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active}
                                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                className="w-4 h-4"
                            />
                            <Label htmlFor="is_active" className="cursor-pointer">
                                פעיל (מוצג למשתמשים)
                            </Label>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                            ביטול
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    שומר...
                                </>
                            ) : (
                                'שמור'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
