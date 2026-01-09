import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { FoodItem, UserMeal, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, Plus, Trash2, Target, Utensils } from 'lucide-react';
import { calculateNutrition, getProgressColor } from '@/components/utils/nutritionCalculations';
import { getCurrentISOString, getCurrentDateString } from '@/components/utils/timeUtils';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { foodCategories } from '@/data/initialFoodDatabase';

const mealTypeOptions = ["ארוחת בוקר", "ארוחת ביניים", "ארוחת צהריים", "ארוחת ערב", "חטיף"];

export default function MealPlanner({ user, onUpdateMeals }) {
    const { toast } = useToast();
    const [foodItems, setFoodItems] = useState([]);
    const [userMeals, setUserMeals] = useState([]);
    const [isLoadingFoods, setIsLoadingFoods] = useState(true);
    const [isLoadingMeals, setIsLoadingMeals] = useState(true);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Selected food and portion states
    const [selectedFood, setSelectedFood] = useState(null);
    const [portionSize, setPortionSize] = useState('');
    const [mealType, setMealType] = useState(mealTypeOptions[0]);
    const [notes, setNotes] = useState('');

    // Calculated nutrition
    const [calculatedNutrition, setCalculatedNutrition] = useState(null);

    const [isSaving, setIsSaving] = useState(false);

    // Load food items
    const loadFoodItems = useCallback(async () => {
        setIsLoadingFoods(true);
        try {
            const items = await FoodItem.filter({ is_active: true }, 'name_he');
            setFoodItems(items || []);
        } catch (error) {
            console.error('Error loading food items:', error);
            toast({
                title: 'שגיאה',
                description: 'לא ניתן לטעון את רשימת המזונות',
                variant: 'destructive'
            });
        } finally {
            setIsLoadingFoods(false);
        }
    }, [toast]);

    // Load user meals for today
    const loadUserMeals = useCallback(async () => {
        if (!user?.email) return;

        setIsLoadingMeals(true);
        try {
            const today = getCurrentDateString();
            const meals = await UserMeal.filter({
                user_email: user.email,
                date: today
            }, '-meal_timestamp');
            setUserMeals(meals || []);

            if (onUpdateMeals) {
                onUpdateMeals(meals);
            }
        } catch (error) {
            console.error('Error loading user meals:', error);
            toast({
                title: 'שגיאה',
                description: 'לא ניתן לטעון את הארוחות',
                variant: 'destructive'
            });
        } finally {
            setIsLoadingMeals(false);
        }
    }, [user?.email, toast, onUpdateMeals]);

    useEffect(() => {
        loadFoodItems();
    }, [loadFoodItems]);

    useEffect(() => {
        loadUserMeals();
    }, [loadUserMeals]);

    // Filter food items
    const filteredFoods = useMemo(() => {
        return foodItems.filter(food => {
            const matchesSearch = !searchQuery ||
                food.name_he?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                food.name_en?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || food.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [foodItems, searchQuery, selectedCategory]);

    // Calculate nutrition when portion changes
    useEffect(() => {
        if (selectedFood && portionSize && Number(portionSize) > 0) {
            const nutrition = calculateNutrition(selectedFood, Number(portionSize));
            setCalculatedNutrition(nutrition);
        } else {
            setCalculatedNutrition(null);
        }
    }, [selectedFood, portionSize]);

    // Calculate daily totals
    const dailyTotals = useMemo(() => {
        return userMeals.reduce((acc, meal) => ({
            calories: acc.calories + (meal.calories || 0),
            protein: acc.protein + (meal.protein_grams || 0),
            carbs: acc.carbs + (meal.carbs_grams || 0),
            fat: acc.fat + (meal.fat_grams || 0)
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [userMeals]);

    const calorieGoal = user?.calorie_target || 2000;
    const progressPercentage = (dailyTotals.calories / calorieGoal) * 100;

    // Group meals by type
    const mealsByType = useMemo(() => {
        const grouped = {};
        mealTypeOptions.forEach(type => {
            grouped[type] = userMeals.filter(meal => meal.meal_type === type);
        });
        return grouped;
    }, [userMeals]);

    // Select food item
    const handleSelectFood = (food) => {
        setSelectedFood(food);
        setPortionSize(food.serving_size?.toString() || '100');
        setNotes('');
    };

    // Add meal to daily menu
    const handleAddMeal = async () => {
        if (!selectedFood || !portionSize || !calculatedNutrition) {
            toast({
                title: 'שגיאה',
                description: 'יש לבחור מזון ולהזין כמות',
                variant: 'destructive'
            });
            return;
        }

        setIsSaving(true);
        try {
            const currentUser = await User.me();
            const now = getCurrentISOString();

            const mealData = {
                user_email: currentUser.email,
                date: getCurrentDateString(),
                meal_timestamp: now,
                meal_type: mealType,
                food_item_id: selectedFood.id,
                food_name: selectedFood.name_he,
                portion_size: Number(portionSize),
                portion_unit: selectedFood.serving_unit,
                calories: calculatedNutrition.calories,
                protein_grams: calculatedNutrition.protein,
                carbs_grams: calculatedNutrition.carbs,
                fat_grams: calculatedNutrition.fat,
                fiber_grams: calculatedNutrition.fiber,
                notes: notes || null,
                created_date: now
            };

            await UserMeal.create(mealData);

            toast({
                title: 'הצלחה',
                description: `${selectedFood.name_he} נוסף לתפריט היומי`
            });

            // Reset form
            setSelectedFood(null);
            setPortionSize('');
            setNotes('');
            setCalculatedNutrition(null);

            // Reload meals
            loadUserMeals();
        } catch (error) {
            console.error('Error adding meal:', error);
            toast({
                title: 'שגיאה',
                description: 'לא ניתן להוסיף את הארוחה',
                variant: 'destructive'
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Delete meal
    const handleDeleteMeal = async (mealId) => {
        if (!window.confirm('האם אתה בטוח שברצונך למחוק פריט זה מהתפריט?')) {
            return;
        }

        try {
            await UserMeal.delete(mealId);
            toast({
                title: 'הצלחה',
                description: 'הפריט נמחק מהתפריט'
            });
            loadUserMeals();
        } catch (error) {
            console.error('Error deleting meal:', error);
            toast({
                title: 'שגיאה',
                description: 'לא ניתן למחוק את הפריט',
                variant: 'destructive'
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Daily Progress */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border shadow-lg"
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                        <Target className="w-5 h-5 text-green-600" />
                        התקדמות יומית
                    </h3>
                    <div className="text-right">
                        <p className="text-2xl font-bold text-slate-900">
                            {dailyTotals.calories.toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-600">
                            מתוך {calorieGoal.toLocaleString()} קק"ל
                        </p>
                    </div>
                </div>
                <Progress
                    value={Math.min(progressPercentage, 100)}
                    className={`w-full bg-gray-200 rounded-full h-3 mb-2 [&>div]:${getProgressColor(progressPercentage)} [&>div]:rounded-full`}
                />
                <div className="flex justify-between text-sm text-slate-600 mt-2">
                    <span>{progressPercentage.toFixed(1)}% מהיעד</span>
                    <span>נשארו: {Math.max(calorieGoal - dailyTotals.calories, 0).toLocaleString()} קק"ל</span>
                </div>

                {/* Macros Summary */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                    <div className="text-center">
                        <p className="text-xs text-gray-600">חלבון</p>
                        <p className="text-lg font-semibold text-blue-600">{dailyTotals.protein.toFixed(1)}g</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-600">פחמימות</p>
                        <p className="text-lg font-semibold text-orange-600">{dailyTotals.carbs.toFixed(1)}g</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-600">שומן</p>
                        <p className="text-lg font-semibold text-yellow-600">{dailyTotals.fat.toFixed(1)}g</p>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Food Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            חיפוש מזון
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {/* Search and Filter */}
                        <div className="space-y-4 mb-4">
                            <div>
                                <Label>חיפוש</Label>
                                <div className="relative">
                                    <Search className="absolute right-3 top-3 w-4 h-4 text-gray-400" />
                                    <Input
                                        placeholder="חפש מזון..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pr-10"
                                    />
                                </div>
                            </div>

                            {/* Category Pills */}
                            <div className="flex flex-wrap gap-2">
                                <Badge
                                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                                    className="cursor-pointer"
                                    onClick={() => setSelectedCategory('all')}
                                >
                                    הכל
                                </Badge>
                                {foodCategories.map(cat => (
                                    <Badge
                                        key={cat}
                                        variant={selectedCategory === cat ? 'default' : 'outline'}
                                        className="cursor-pointer"
                                        onClick={() => setSelectedCategory(cat)}
                                    >
                                        {cat}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Food Items List */}
                        <div className="max-h-96 overflow-y-auto space-y-2">
                            {isLoadingFoods ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                </div>
                            ) : filteredFoods.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">לא נמצאו מזונות</p>
                            ) : (
                                filteredFoods.map(food => (
                                    <div
                                        key={food.id}
                                        onClick={() => handleSelectFood(food)}
                                        className={`p-3 border rounded-lg cursor-pointer transition-all ${selectedFood?.id === food.id
                                                ? 'border-green-500 bg-green-50'
                                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{food.name_he}</p>
                                                {food.name_en && (
                                                    <p className="text-xs text-gray-500">{food.name_en}</p>
                                                )}
                                            </div>
                                            <Badge variant="secondary" className="text-xs">
                                                {food.category}
                                            </Badge>
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 mt-2 text-xs text-gray-600">
                                            <div>
                                                <span className="font-medium">{food.calories_per_100g}</span> קק"ל
                                            </div>
                                            <div>
                                                <span className="font-medium">{food.protein_per_100g}g</span> חלבון
                                            </div>
                                            <div>
                                                <span className="font-medium">{food.carbs_per_100g}g</span> פחמ'
                                            </div>
                                            <div>
                                                <span className="font-medium">{food.fat_per_100g}g</span> שומן
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Portion Calculator & Add */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5" />
                            הוספה לתפריט
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedFood ? (
                            <div className="space-y-4">
                                {/* Selected Food Info */}
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="font-semibold text-lg">{selectedFood.name_he}</p>
                                    <p className="text-sm text-gray-600">
                                        ערכים תזונתיים ל-100 {selectedFood.serving_unit}
                                    </p>
                                </div>

                                {/* Portion Size */}
                                <div>
                                    <Label>כמות ({selectedFood.serving_unit})</Label>
                                    <Input
                                        type="number"
                                        value={portionSize}
                                        onChange={(e) => setPortionSize(e.target.value)}
                                        placeholder="100"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        מנה מומלצת: {selectedFood.serving_size} {selectedFood.serving_unit}
                                    </p>
                                </div>

                                {/* Calculated Nutrition */}
                                {calculatedNutrition && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="p-4 bg-green-50 rounded-lg border border-green-200"
                                    >
                                        <p className="font-semibold mb-3">ערכים תזונתיים מחושבים:</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="text-center p-2 bg-white rounded">
                                                <p className="text-2xl font-bold text-green-600">
                                                    {calculatedNutrition.calories}
                                                </p>
                                                <p className="text-xs text-gray-600">קק"ל</p>
                                            </div>
                                            <div className="text-center p-2 bg-white rounded">
                                                <p className="text-lg font-semibold text-blue-600">
                                                    {calculatedNutrition.protein}g
                                                </p>
                                                <p className="text-xs text-gray-600">חלבון</p>
                                            </div>
                                            <div className="text-center p-2 bg-white rounded">
                                                <p className="text-lg font-semibold text-orange-600">
                                                    {calculatedNutrition.carbs}g
                                                </p>
                                                <p className="text-xs text-gray-600">פחמימות</p>
                                            </div>
                                            <div className="text-center p-2 bg-white rounded">
                                                <p className="text-lg font-semibold text-yellow-600">
                                                    {calculatedNutrition.fat}g
                                                </p>
                                                <p className="text-xs text-gray-600">שומן</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* Meal Type */}
                                <div>
                                    <Label>סוג ארוחה</Label>
                                    <Select value={mealType} onValueChange={setMealType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {mealTypeOptions.map(type => (
                                                <SelectItem key={type} value={type}>{type}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Notes */}
                                <div>
                                    <Label>הערות (אופציונלי)</Label>
                                    <Input
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="לדוגמה: צלוי, מבושל, עם רוטב..."
                                    />
                                </div>

                                {/* Add Button */}
                                <Button
                                    onClick={handleAddMeal}
                                    disabled={isSaving || !calculatedNutrition}
                                    className="w-full"
                                >
                                    {isSaving ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            מוסיף...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-2" />
                                            הוסף לתפריט
                                        </>
                                    )}
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setSelectedFood(null);
                                        setPortionSize('');
                                        setNotes('');
                                        setCalculatedNutrition(null);
                                    }}
                                    className="w-full"
                                >
                                    בטל
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <Utensils className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>בחר מזון מהרשימה כדי להתחיל</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Daily Menu */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Utensils className="w-5 h-5" />
                        התפריט היומי שלי
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoadingMeals ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : userMeals.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            עדיין לא הוספת ארוחות להיום. התחל על ידי בחירת מזון מהרשימה למעלה.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {mealTypeOptions.map(type => {
                                const meals = mealsByType[type];
                                if (meals.length === 0) return null;

                                const typeTotals = meals.reduce((acc, meal) => ({
                                    calories: acc.calories + (meal.calories || 0),
                                    protein: acc.protein + (meal.protein_grams || 0),
                                    carbs: acc.carbs + (meal.carbs_grams || 0),
                                    fat: acc.fat + (meal.fat_grams || 0)
                                }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

                                return (
                                    <div key={type} className="border rounded-lg p-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="font-semibold">{type}</h4>
                                            <Badge>{typeTotals.calories} קק"ל</Badge>
                                        </div>
                                        <div className="space-y-2">
                                            {meals.map(meal => (
                                                <div
                                                    key={meal.id}
                                                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                                                >
                                                    <div className="flex-1">
                                                        <p className="font-medium">{meal.food_name}</p>
                                                        <p className="text-sm text-gray-600">
                                                            {meal.portion_size} {meal.portion_unit}
                                                            {meal.notes && ` • ${meal.notes}`}
                                                        </p>
                                                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                                                            <span>{meal.calories} קק"ל</span>
                                                            <span>{meal.protein_grams}g חלבון</span>
                                                            <span>{meal.carbs_grams}g פחמ'</span>
                                                            <span>{meal.fat_grams}g שומן</span>
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleDeleteMeal(meal.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
