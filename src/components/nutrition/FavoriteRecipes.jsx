import React, { useState, useEffect } from 'react';
import { Recipe, FavoriteRecipe, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  Loader2,
  Search,
  Heart,
  Clock,
  Users,
  Zap,
  Utensils,
  Video,
  ChefHat,
  Globe,
  Cookie,
  GlassWater,
  Salad,
  ListChecks,
  HeartOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const RecipeCard = ({ recipe, onRemoveFavorite, user }) => {
    const isCreator = user?.email === recipe.creator_email;
    const isGlutenFree = recipe.tags?.includes('ללא גלוטן') || 
                        (recipe.ingredients && recipe.ingredients.some(ing => 
                            ing.includes('קמח שקדים') || ing.includes('קמח קוקוס') || 
                            ing.includes('אבקת חלבון') && !ing.includes('לחם') && !ing.includes('פירורי לחם')
                        ));

    return (
        <Dialog>
            <DialogTrigger asChild>
                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="cursor-pointer bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300 relative"
                >
                    <div className="relative">
                        <img
                            src={recipe.image_url || "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=800"}
                            alt={recipe.name}
                            className="w-full h-48 object-cover"
                        />
                        <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 end-2 bg-white/70 hover:bg-white rounded-full h-9 w-9 z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemoveFavorite(recipe.id);
                            }}
                        >
                            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                        </Button>
                        <div className="absolute bottom-2 start-2 flex items-center gap-2 flex-wrap">
                            <Badge className="bg-green-600 text-white">{recipe.category}</Badge>
                            {isGlutenFree && <Badge className="bg-orange-500 text-white">ללא גלוטן</Badge>}
                            {isCreator && <Badge className="bg-blue-500 text-white">שלי</Badge>}
                        </div>
                    </div>
                    <div className="p-4">
                        <h3 className="font-bold text-lg text-slate-800 mb-2">{recipe.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                            {recipe.prep_time && (
                                <div className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    <span>{recipe.prep_time} דק'</span>
                                </div>
                            )}
                            {recipe.servings && (
                                <div className="flex items-center gap-1">
                                    <Users className="w-4 h-4" />
                                    <span>{recipe.servings} מנות</span>
                                </div>
                            )}
                            {recipe.difficulty && (
                                <div className="flex items-center gap-1">
                                    <Zap className="w-4 h-4" />
                                    <span>{recipe.difficulty}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                           {recipe.calories_per_serving && <Badge variant="outline">📊 {recipe.calories_per_serving} קל'</Badge>}
                           {recipe.protein_grams && <Badge variant="outline">🥩 {recipe.protein_grams}g חלבון</Badge>}
                        </div>
                    </div>
                </motion.div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <ChefHat className="w-6 h-6 text-orange-500" />
                        {recipe.name}
                        {isGlutenFree && <Badge className="bg-orange-500 text-white">ללא גלוטן</Badge>}
                    </DialogTitle>
                    <DialogDescription className="text-lg">{recipe.category}</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Image and Info */}
                    <div className="space-y-4">
                        <img
                            src={recipe.image_url || "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&q=80&w=800"}
                            alt={recipe.name}
                            className="rounded-lg w-full h-64 object-cover shadow-md"
                        />

                        {recipe.video_url && (
                            <Button asChild className="w-full bg-red-600 hover:bg-red-700">
                                <a href={recipe.video_url} target="_blank" rel="noopener noreferrer">
                                    <Video className="w-4 h-4 ms-2" />
                                    צפה בסרטון הדרכה
                                </a>
                            </Button>
                        )}

                        <div className="grid grid-cols-3 gap-4 text-center bg-slate-50 p-4 rounded-lg">
                            {recipe.prep_time && (
                                <div>
                                    <Clock className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                                    <p className="text-sm font-medium">⏱ זמן הכנה</p>
                                    <p className="text-lg font-bold text-blue-600">{recipe.prep_time} דקות</p>
                                </div>
                            )}
                            {recipe.servings && (
                                <div>
                                    <Users className="w-6 h-6 mx-auto mb-1 text-green-500" />
                                    <p className="text-sm font-medium">👥 מנות</p>
                                    <p className="text-lg font-bold text-green-600">{recipe.servings}</p>
                                </div>
                            )}
                            {recipe.difficulty && (
                                <div>
                                    <Zap className="w-6 h-6 mx-auto mb-1 text-purple-500" />
                                    <p className="text-sm font-medium">🔥 קושי</p>
                                    <p className="text-lg font-bold text-purple-600">{recipe.difficulty}</p>
                                </div>
                            )}
                        </div>

                        {recipe.equipment && (
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2 text-blue-800">🛠 ציוד דרוש:</h4>
                                <p className="text-sm text-blue-700">{recipe.equipment}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Details */}
                    <div className="space-y-4">
                        {/* Nutritional Info */}
                        <div className="bg-green-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-3 text-green-800">📊 מידע תזונתי (למנה):</h4>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {recipe.calories_per_serving && <div><strong>קלוריות:</strong> {recipe.calories_per_serving}</div>}
                                {recipe.protein_grams && <div><strong>חלבון:</strong> {recipe.protein_grams} גרם</div>}
                                {recipe.carbs_grams && <div><strong>פחמימות:</strong> {recipe.carbs_grams} גרם</div>}
                                {recipe.fat_grams && <div><strong>שומן:</strong> {recipe.fat_grams} גרם</div>}
                            </div>
                        </div>

                        {/* Ingredients */}
                        <div className="bg-orange-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-3 text-orange-800">🥣 רשימת מרכיבים:</h4>
                            <ul className="list-disc list-inside text-sm space-y-1 text-orange-700">
                                {recipe.ingredients && recipe.ingredients.map((ing, i) => (
                                    <li key={i}>{ing}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Instructions */}
                        <div className="bg-purple-50 p-4 rounded-lg">
                            <h4 className="font-semibold mb-3 text-purple-800">👨‍🍳 אופן ההכנה:</h4>
                            <div className="text-sm text-purple-700 whitespace-pre-wrap">{recipe.instructions}</div>
                        </div>

                        {/* Tips */}
                        {recipe.tips && (
                            <div className="bg-yellow-50 p-4 rounded-lg">
                                <h4 className="font-semibold mb-2 text-yellow-800">💡 טיפים נוספים:</h4>
                                <p className="text-sm text-yellow-700">{recipe.tips}</p>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="pt-4 border-t mt-4">
                    <Button 
                        variant="outline" 
                        onClick={() => onRemoveFavorite(recipe.id)}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                    >
                        <HeartOff className="w-4 h-4 ms-2" />
                        הסר מהמועדפים
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function FavoriteRecipes() {
    const [favoriteRecipes, setFavoriteRecipes] = useState([]);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');

    const filters = [
      { key: 'all', label: 'הכל', icon: Globe },
      { key: 'ארוחות עיקריות', label: 'ארוחות עיקריות', icon: Utensils },
      { key: 'נשנושים בריאים', label: 'נשנושים בריאים', icon: Cookie },
      { key: 'שייקים וחטיפי חלבון', label: 'שייקים וחטיפים', icon: GlassWater },
      { key: 'תוספות וסלטים', label: 'תוספות וסלטים', icon: Salad },
      { key: 'תפריטים לפי מטרה', label: 'תפריטים', icon: ListChecks },
      { key: 'gluten_free', label: 'ללא גלוטן', icon: Cookie }
    ];

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            const [favs] = await Promise.all([
                currentUser ? FavoriteRecipe.filter({ user_email: currentUser.email }) : []
            ]);

            if (favs.length > 0) {
                const recipeIds = favs.map(f => f.recipe_id);
                const recipes = [];
                
                for (const recipeId of recipeIds) {
                    try {
                        const recipe = await Recipe.filter({ id: recipeId });
                        if (recipe.length > 0) {
                            recipes.push(recipe[0]);
                        }
                    } catch (error) {
                        console.warn(`Could not load recipe ${recipeId}:`, error);
                    }
                }
                
                setFavoriteRecipes(recipes);
            } else {
                setFavoriteRecipes([]);
            }
        } catch (error) {
            console.error("Error loading favorite recipes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveFavorite = async (recipeId) => {
        if (!user) return;
        
        try {
            const favs = await FavoriteRecipe.filter({ 
                user_email: user.email, 
                recipe_id: recipeId 
            });
            
            if (favs.length > 0) {
                await FavoriteRecipe.delete(favs[0].id);
                // Remove from local state
                setFavoriteRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
            }
        } catch (error) {
            console.error("Error removing favorite:", error);
        }
    };

    const filteredRecipes = React.useMemo(() => {
        let results = favoriteRecipes;

        if (selectedFilter === 'gluten_free') {
            results = favoriteRecipes.filter(recipe => 
                recipe.tags?.includes('ללא גלוטן') || 
                (recipe.ingredients && recipe.ingredients.some(ing => 
                    ing.includes('קמח שקדים') || ing.includes('קמח קוקוס') || 
                    (ing.includes('אבקת חלבון') && !ing.includes('לחם') && !ing.includes('פירורי לחם'))
                ))
            );
        } else if (selectedFilter !== 'all') {
            results = favoriteRecipes.filter(r => r.category === selectedFilter);
        }

        if (searchTerm) {
            results = results.filter(recipe =>
                recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (recipe.ingredients && recipe.ingredients.join(' ').toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        return results.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    }, [favoriteRecipes, selectedFilter, searchTerm]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin w-8 h-8 text-orange-500" />
                <p className="me-2 text-slate-600">טוען מתכונים מועדפים...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <Card className="muscle-glass border-0 shadow-lg">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute end-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="חפש במתכונים המועדפים..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pe-10 text-lg h-12"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Category Filters */}
            <Card className="muscle-glass border-0 shadow-lg">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-2">
                        {filters.map(({ key, label, icon: Icon }) => (
                          <Button
                              key={key}
                              variant={selectedFilter === key ? 'default' : 'outline'}
                              onClick={() => setSelectedFilter(key)}
                              className={`transition-all duration-200 ${selectedFilter === key ? 'bg-orange-500 hover:bg-orange-600 text-white' : ''}`}
                          >
                              <Icon className="w-4 h-4 ms-2" />
                              {label}
                          </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Results Count */}
            <div className="text-center text-slate-600">
                <p>נמצאו {filteredRecipes.length} מתכונים מועדפים</p>
            </div>

            {/* Recipe Grid or Empty State */}
            {filteredRecipes.length === 0 ? (
                <div className="text-center py-20">
                    <Heart className="w-24 h-24 mx-auto text-slate-300 mb-6" />
                    <h3 className="text-2xl font-semibold text-slate-600 mb-4">עדיין אין מתכונים מועדפים</h3>
                    <p className="text-slate-500 text-lg mb-6">התחל לשמור מתכונים במועדפים!</p>
                    <div className="bg-pink-50 border border-pink-200 rounded-lg p-6 max-w-md mx-auto">
                        <p className="text-pink-800 font-medium">💡 עצה:</p>
                        <p className="text-pink-700 mt-2">בקר במאגר המתכונים או צור מתכון חדש עם ה-AI ושמור אותו במועדפים!</p>
                    </div>
                </div>
            ) : (
                <AnimatePresence>
                    <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredRecipes.map(recipe => (
                            <RecipeCard
                                key={recipe.id}
                                recipe={recipe}
                                user={user}
                                onRemoveFavorite={handleRemoveFavorite}
                            />
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}
        </div>
    );
}