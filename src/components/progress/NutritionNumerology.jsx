
import React, { useState, useEffect } from 'react';
import { CalorieTracking, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Droplets, Flame, Wheat, Fish } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// Helper function for current date string, used in handleSaveMeal
const getCurrentDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export default function NutritionNumerology({ user }) {
    const [isLoading, setIsLoading] = useState(true);
    const [numerologyData, setNumerologyData] = useState(null);

    // This handleSaveMeal function is added as per the provided outline,
    // although its direct usage within this specific component (NutritionNumerology)
    // is not implicitly defined by the current component's purpose (displaying stats).
    // It is included to fulfill the request of implementing the given code outline.
    const handleSaveMeal = async (mealData, shareWithCoach = false) => {
        if (!mealData.meal_description?.trim()) {
            throw new Error('יש למלא תיאור הארוחה');
        }

        try {
            const mealEntry = {
                user_email: user.email,
                date: mealData.date || getCurrentDateString(),
                meal_type: mealData.meal_type || 'ארוחת בוקר',
                meal_description: mealData.meal_description,
                meal_timestamp: new Date().toISOString(),
                estimated_calories: mealData.estimated_calories || 0,
                protein_grams: mealData.protein_grams || 0,
                carbs_grams: mealData.carbs_grams || 0,
                fat_grams: mealData.fat_grams || 0,
                meal_image: mealData.meal_image || '',
                shared_with_coach: shareWithCoach,
                coach_note: mealData.coach_note || '',
                ai_assisted: true // Since this component uses AI analysis
            };

            const savedMeal = await CalorieTracking.create(mealEntry);

            // Note: No email notification sent - sharing is app-only
            console.log('Meal saved and shared with coach via app only');

            return savedMeal;

        } catch (error) {
            console.error('Error saving meal:', error);
            throw error;
        }
    };


    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Ensure user prop is available, if not, fetch User.me() (fallback if component is used without user prop)
                const currentUser = user || await User.me();
                if (!currentUser) {
                    console.error("User not found for data fetching.");
                    setNumerologyData(null);
                    return;
                }

                const entries = await CalorieTracking.filter({ created_by: currentUser.email });

                if (entries.length > 0) {
                    const totals = entries.reduce((acc, entry) => {
                        acc.calories += entry.estimated_calories || 0;
                        acc.protein += entry.protein_grams || 0;
                        acc.carbs += entry.carbs_grams || 0;
                        acc.fat += entry.fat_grams || 0;
                        return acc;
                    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

                    const numEntries = entries.length;
                    const avgCalories = totals.calories / numEntries;
                    const avgProtein = totals.protein / numEntries;
                    const avgCarbs = totals.carbs / numEntries;
                    const avgFat = totals.fat / numEntries;

                    const proteinCalories = avgProtein * 4;
                    const carbsCalories = avgCarbs * 4;
                    const fatCalories = avgFat * 9;
                    const totalMacroCalories = proteinCalories + carbsCalories + fatCalories;

                    const chartData = [
                        { name: 'חלבון', value: proteinCalories, color: '#EF4444' },
                        { name: 'פחמימות', value: carbsCalories, color: '#F59E0B' },
                        { name: 'שומנים', value: fatCalories, color: '#6B7280' },
                    ];

                    setNumerologyData({
                        avgCalories,
                        avgProtein,
                        avgCarbs,
                        avgFat,
                        chartData,
                        totalMacroCalories,
                    });
                } else {
                    setNumerologyData(null);
                }
            } catch (error) {
                console.error("Error fetching numerology data:", error);
                setNumerologyData(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user]); // Re-run effect if user prop changes

    if (isLoading) {
        return (
            <Card className="muscle-glass border-0 shadow-lg">
                <CardContent className="flex justify-center items-center p-8">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
                    <p className="me-4 text-slate-600">טוען נתונים תזונתיים...</p>
                </CardContent>
            </Card>
        );
    }

    if (!numerologyData) {
        return (
            <Card className="muscle-glass border-0 shadow-lg border-dashed border-slate-300">
                <CardContent className="text-center py-10">
                    <h3 className="text-lg font-semibold text-slate-600">אין מספיק נתונים</h3>
                    <p className="text-slate-500">התחל להוסיף ארוחות כדי לראות ניתוח תזונתי.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="muscle-glass border-0 shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                    <Droplets className="w-6 h-6 text-green-600" />
                    נומרולוגיה תזונתית
                </CardTitle>
                <CardDescription>ממוצע יומי של כלל הארוחות שהוזנו</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg">
                            <Flame className="w-8 h-8 text-blue-500" />
                            <div>
                                <p className="text-sm text-blue-700">ממוצע קלוריות יומי</p>
                                <p className="text-2xl font-bold text-blue-800">{Math.round(numerologyData.avgCalories)} קק"ל</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center p-3 bg-red-50 rounded-lg">
                                <Fish className="w-6 h-6 text-red-500 mx-auto mb-1" />
                                <p className="text-sm font-medium text-red-700">{Math.round(numerologyData.avgProtein)}g</p>
                                <p className="text-xs text-red-600">חלבון</p>
                            </div>
                            <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                <Wheat className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
                                <p className="text-sm font-medium text-yellow-700">{Math.round(numerologyData.avgCarbs)}g</p>
                                <p className="text-xs text-yellow-600">פחמימות</p>
                            </div>
                            <div className="text-center p-3 bg-gray-100 rounded-lg">
                                <div className="w-6 h-6 bg-gray-400 rounded-full mx-auto mb-1 flex items-center justify-center text-white text-xs font-bold">ש</div>
                                <p className="text-sm font-medium text-gray-700">{Math.round(numerologyData.avgFat)}g</p>
                                <p className="text-xs text-gray-600">שומנים</p>
                            </div>
                        </div>
                    </div>
                    <div>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={numerologyData.chartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                >
                                    {numerologyData.chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [`${Math.round(value / numerologyData.totalMacroCalories * 100)}%`, name]} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="flex justify-center gap-4 text-xs mt-2">
                            {numerologyData.chartData.map(entry => (
                                <div key={entry.name} className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                                    <span>{entry.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
