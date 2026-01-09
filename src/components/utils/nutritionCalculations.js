// Nutrition calculation utilities for meal planning

/**
 * Calculate nutritional values based on portion size
 * @param {Object} foodItem - Food item with nutritional values per 100g
 * @param {number} portionSize - Portion size in grams
 * @returns {Object} Calculated nutritional values
 */
export const calculateNutrition = (foodItem, portionSize) => {
    const ratio = portionSize / 100;
    return {
        calories: Math.round(foodItem.calories_per_100g * ratio),
        protein: Math.round(foodItem.protein_per_100g * ratio * 10) / 10,
        carbs: Math.round(foodItem.carbs_per_100g * ratio * 10) / 10,
        fat: Math.round(foodItem.fat_per_100g * ratio * 10) / 10,
        fiber: foodItem.fiber_per_100g
            ? Math.round(foodItem.fiber_per_100g * ratio * 10) / 10
            : 0
    };
};

/**
 * Calculate daily totals from multiple meal sources
 * @param {Array} userMeals - Array of UserMeal entries
 * @param {Array} calorieEntries - Array of CalorieTracking entries
 * @returns {Object} Combined daily totals
 */
export const calculateDailyTotals = (userMeals, calorieEntries) => {
    // Sum calories from structured meal planner
    const mealCalories = userMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
    const mealProtein = userMeals.reduce((sum, meal) => sum + (meal.protein_grams || 0), 0);
    const mealCarbs = userMeals.reduce((sum, meal) => sum + (meal.carbs_grams || 0), 0);
    const mealFat = userMeals.reduce((sum, meal) => sum + (meal.fat_grams || 0), 0);

    // Sum calories from free-form entries
    const entryCalories = calorieEntries.reduce((sum, entry) => sum + (entry.estimated_calories || 0), 0);
    const entryProtein = calorieEntries.reduce((sum, entry) => sum + (entry.protein_grams || 0), 0);
    const entryCarbs = calorieEntries.reduce((sum, entry) => sum + (entry.carbs_grams || 0), 0);
    const entryFat = calorieEntries.reduce((sum, entry) => sum + (entry.fat_grams || 0), 0);

    return {
        totalCalories: mealCalories + entryCalories,
        totalProtein: mealProtein + entryProtein,
        totalCarbs: mealCarbs + entryCarbs,
        totalFat: mealFat + entryFat,
        fromMealPlanner: {
            calories: mealCalories,
            protein: mealProtein,
            carbs: mealCarbs,
            fat: mealFat,
            count: userMeals.length
        },
        fromFreeForm: {
            calories: entryCalories,
            protein: entryProtein,
            carbs: entryCarbs,
            fat: entryFat,
            count: calorieEntries.length
        }
    };
};

/**
 * Get progress color based on percentage
 * @param {number} percentage - Progress percentage
 * @returns {string} Tailwind color class
 */
export const getProgressColor = (percentage) => {
    if (percentage > 110) return 'bg-red-500';
    if (percentage > 100) return 'bg-yellow-500';
    if (percentage > 90) return 'bg-green-500';
    return 'bg-blue-500';
};

/**
 * Format nutritional value for display
 * @param {number} value - Nutritional value
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted value
 */
export const formatNutritionValue = (value, decimals = 1) => {
    if (!value && value !== 0) return '0';
    return Number(value).toFixed(decimals);
};

/**
 * Calculate macro percentages
 * @param {number} protein - Protein grams
 * @param {number} carbs - Carbs grams
 * @param {number} fat - Fat grams
 * @returns {Object} Percentage breakdown
 */
export const calculateMacroPercentages = (protein, carbs, fat) => {
    // Calories per gram: Protein=4, Carbs=4, Fat=9
    const proteinCals = protein * 4;
    const carbsCals = carbs * 4;
    const fatCals = fat * 9;
    const total = proteinCals + carbsCals + fatCals;

    if (total === 0) {
        return { protein: 0, carbs: 0, fat: 0 };
    }

    return {
        protein: Math.round((proteinCals / total) * 100),
        carbs: Math.round((carbsCals / total) * 100),
        fat: Math.round((fatCals / total) * 100)
    };
};
