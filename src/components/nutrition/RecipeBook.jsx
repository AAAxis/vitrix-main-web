
import React, { useState, useEffect, useMemo } from 'react';
import { Recipe, FavoriteRecipe, User } from '@/api/entities';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import {
  Loader2,
  Search,
  Star,
  Clock,
  Users,
  Zap,
  Utensils,
  Video,
  ChefHat,
  Edit,
  Trash2,
  Share2,
  Archive,
  Lock,
  Globe,
  Cookie,
  GlassWater,
  Salad,
  ListChecks
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const RecipeCard = ({ recipe, isFavorite, onToggleFavorite, user, onEdit, onDelete, onToggleShare }) => {
    const isCreator = user?.email === recipe.creator_email;

    const isGlutenFree = recipe.tags?.includes('ללא גלוטן') ||
                        (recipe.ingredients && recipe.ingredients.some(ing =>
                            ing.toLowerCase().includes('קמח שקדים') || ing.toLowerCase().includes('קמח קוקוס') ||
                            (ing.toLowerCase().includes('אבקת חלבון') && !ing.toLowerCase().includes('לחם') && !ing.toLowerCase().includes('פירורי לחם'))
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
                    className="cursor-pointer bg-white rounded-xl overflow-hidden shadow-lg border border-slate-100 hover:shadow-xl transition-all duration-300"
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
                                onToggleFavorite(recipe.id);
                            }}
                        >
                            <Star className={`w-5 h-5 transition-colors ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-slate-500'}`} />
                        </Button>
                        <div className="absolute bottom-2 start-2 flex items-center gap-2 flex-wrap">
                            <Badge className="bg-green-600 text-white">{recipe.category}</Badge>
                            {isGlutenFree && <Badge className="bg-orange-500 text-white">ללא גלוטן</Badge>}
                            {!recipe.is_public && isCreator && <Badge variant="secondary" className="bg-purple-100 text-purple-800"><Lock className="w-3 h-3 ms-1" />פרטי</Badge>}
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
                        {isGlutenFree && <Badge className="bg-orange-500 text-white me-2">ללא גלוטן</Badge>}
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

                {isCreator && (
                    <DialogFooter className="pt-4 border-t mt-4 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
                        <div className="flex items-center space-x-2 space-x-reverse">
                            <Switch
                                id={`share-switch-${recipe.id}`}
                                checked={recipe.is_public}
                                onCheckedChange={() => onToggleShare(recipe)}
                                aria-readonly
                            />
                            <Label htmlFor={`share-switch-${recipe.id}`} className="flex items-center gap-2 cursor-pointer">
                                {recipe.is_public ? <Share2 className="w-4 h-4 text-blue-600"/> : <Lock className="w-4 h-4 text-slate-600"/>}
                                {recipe.is_public ? 'מתכון ציבורי (משותף עם כולם)' : 'מתכון פרטי'}
                            </Label>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="outline" onClick={() => onEdit(recipe)}>
                                <Edit className="w-4 h-4 ms-2" />
                                ערוך מתכון
                            </Button>
                            <Button variant="destructive" onClick={() => onDelete(recipe)}>
                                {recipe.is_public ? <Archive className="w-4 h-4 ms-2" /> : <Trash2 className="w-4 h-4 ms-2" />}
                                {recipe.is_public ? 'הפוך לפרטי' : 'מחק לצמיתות'}
                            </Button>
                        </div>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default function RecipeBook() {
    const [recipes, setRecipes] = useState([]);
    const [favorites, setFavorites] = useState(new Map());
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [editingRecipe, setEditingRecipe] = useState(null);

    const filters = [
      { key: 'all', label: 'הכל', icon: Globe },
      { key: 'favorites', label: 'מועדפים', icon: Star },
      { key: 'my_recipes', label: 'המתכונים שלי', icon: ChefHat },
      { key: 'ארוחות עיקריות', label: 'ארוחות עיקריות', icon: Utensils },
      { key: 'נשנושים בריאים', label: 'נשנושים בריאים', icon: Cookie },
      { key: 'שייקים וחטיפי חלבון', label: 'שייקים וחטיפים', icon: GlassWater },
      { key: 'תוספות וסלטים', label: 'תוספות וסלטים', icon: Salad },
      { key: 'תפריטים לפי מטרה', label: 'תפריטים', icon: ListChecks },
      { key: 'gluten_free', label: 'ללא גלוטן', icon: Cookie }
    ];

    const loadData = async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            const [publicRecipes, myRecipes, favs] = await Promise.all([
                Recipe.filter({ is_public: true }),
                currentUser ? Recipe.filter({ creator_email: currentUser.email }) : [],
                currentUser ? FavoriteRecipe.filter({ user_email: currentUser.email }) : []
            ]);

            // Combine public recipes and user's private recipes, avoiding duplicates
            const allVisibleRecipes = [
                ...publicRecipes,
                ...(myRecipes.filter(myRecipe => !publicRecipes.some(publicRecipe => publicRecipe.id === myRecipe.id)))
            ];

            setRecipes(allVisibleRecipes || []);
            setFavorites(new Map(favs.map(f => [f.recipe_id, f.id])));
        } catch (error) {
            console.error("Error loading recipes:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleToggleFavorite = async (recipeId) => {
        const newFavorites = new Map(favorites);
        if (favorites.has(recipeId)) {
            // Unfavorite
            const favoriteId = favorites.get(recipeId);
            await FavoriteRecipe.delete(favoriteId);
            newFavorites.delete(recipeId);
        } else {
            // Favorite
            const newFav = await FavoriteRecipe.create({ user_email: user.email, recipe_id: recipeId });
            newFavorites.set(recipeId, newFav.id);
        }
        setFavorites(newFavorites);
    };

    const handleToggleShare = async (recipe) => {
        try {
            await Recipe.update(recipe.id, { is_public: !recipe.is_public });
            loadData();
        } catch (error) {
            console.error("Failed to toggle share status:", error);
            alert("שגיאה בעדכון שיתוף המתכון.");
        }
    };

    const handleDeleteRecipe = async (recipe) => {
        const confirmMessage = recipe.is_public
            ? "האם להפוך את המתכון לפרטי? הוא יוסר מהתצוגה הציבורית אך יישאר בחשבונך."
            : "האם למחוק את המתכון לצמיתות? לא ניתן לשחזר פעולה זו.";

        if (window.confirm(confirmMessage)) {
            try {
                if (recipe.is_public) {
                    await Recipe.update(recipe.id, { is_public: false });
                } else {
                    await Recipe.delete(recipe.id);
                }
                loadData();
            } catch (error) {
                console.error("Failed to delete recipe:", error);
                alert("שגיאה במחיקת המתכון.");
            }
        }
    };

    const handleEditRecipe = (recipe) => {
        setEditingRecipe(recipe);
    };

    const handleUpdateRecipe = async (updatedData) => {
        if(!editingRecipe) return;
        try {
            await Recipe.update(editingRecipe.id, updatedData);
            setEditingRecipe(null);
            loadData();
        } catch(error) {
            console.error("Error updating recipe:", error);
            alert("שגיאה בעדכון המתכון.");
        }
    };


    const filteredRecipes = useMemo(() => {
        let results = recipes;

        if (selectedFilter === 'favorites') {
            results = recipes.filter(r => favorites.has(r.id));
        } else if (selectedFilter === 'my_recipes') {
            results = recipes.filter(r => r.creator_email === user?.email);
        } else if (selectedFilter === 'gluten_free') {
            results = recipes.filter(recipe =>
                recipe.tags?.includes('ללא גלוטן') ||
                (recipe.ingredients && recipe.ingredients.some(ing =>
                    ing.toLowerCase().includes('קמח שקדים') || ing.toLowerCase().includes('קמח קוקוס') ||
                    (ing.toLowerCase().includes('אבקת חלבון') && !ing.toLowerCase().includes('לחם') && !ing.toLowerCase().includes('פירורי לחם'))
                ))
            );
        } else if (selectedFilter !== 'all') {
            results = results.filter(r => r.category === selectedFilter);
        }

        if (searchTerm) {
            results = results.filter(recipe =>
                recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (recipe.ingredients && recipe.ingredients.join(' ').toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        return results.sort((a, b) => {
            const aIsFav = favorites.has(a.id);
            const bIsFav = favorites.has(b.id);
            if (aIsFav !== bIsFav) return aIsFav ? -1 : 1;
            return a.name.localeCompare(b.name, 'he');
        });
    }, [recipes, selectedFilter, searchTerm, favorites, user]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="animate-spin w-8 h-8 text-orange-500" />
                <p className="me-2 text-slate-600">טוען מתכונים...</p>
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
                            placeholder="חפש מתכון לפי שם או מרכיב..."
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
                <p>נמצאו {filteredRecipes.length} מתכונים</p>
            </div>

            {/* Recipe Grid or Empty State */}
            {filteredRecipes.length === 0 ? (
                <div className="text-center py-20">
                    <Utensils className="w-24 h-24 mx-auto text-slate-300 mb-6" />
                    <h3 className="text-2xl font-semibold text-slate-600 mb-4">עדיין אין מתכונים</h3>
                    <p className="text-slate-500 text-lg mb-6">התחילו ליצור מתכונים חדשים עם ה-AI שלנו!</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-auto">
                        <p className="text-blue-800 font-medium">💡 עצה:</p>
                        <p className="text-blue-700 mt-2">השתמשו ב"צור מתכון עם AI" בחלק העליון של העמוד כדי ליצור את המתכון הראשון שלכם!</p>
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
                                isFavorite={favorites.has(recipe.id)}
                                onToggleFavorite={handleToggleFavorite}
                                onEdit={handleEditRecipe}
                                onDelete={handleDeleteRecipe}
                                onToggleShare={handleToggleShare}
                            />
                        ))}
                    </motion.div>
                </AnimatePresence>
            )}

            {editingRecipe && (
                <RecipeForm
                    recipe={editingRecipe}
                    onSave={handleUpdateRecipe}
                    onCancel={() => setEditingRecipe(null)}
                />
            )}
        </div>
    );
}

// New RecipeForm component for editing
function RecipeForm({ recipe, onSave, onCancel }) {
    const [formData, setFormData] = useState(recipe);

    useEffect(() => {
        setFormData(recipe);
    }, [recipe]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleIngredientChange = (e) => {
        setFormData(prev => ({...prev, ingredients: e.target.value.split('\n')}));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Dialog open={true} onOpenChange={onCancel}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
                <DialogHeader>
                    <DialogTitle>עריכת מתכון: {recipe.name}</DialogTitle>
                    <DialogDescription>בצע את השינויים הרצויים ולחץ על שמור.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="name">שם המתכון</Label>
                        <Input id="name" name="name" value={formData.name} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="category">קטגוריה</Label>
                        <Select name="category" value={formData.category} onValueChange={(value) => setFormData(p => ({...p, category: value}))}>
                            <SelectTrigger>
                                <SelectValue placeholder="בחר קטגוריה" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ארוחות עיקריות">ארוחות עיקריות</SelectItem>
                                <SelectItem value="נשנושים בריאים">נשנושים בריאים</SelectItem>
                                <SelectItem value="שייקים וחטיפי חלבון">שייקים וחטיפי חלבון</SelectItem>
                                <SelectItem value="תוספות וסלטים">תוספות וסלטים</SelectItem>
                                <SelectItem value="תפריטים לפי מטרה">תפריטים לפי מטרה</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="ingredients">מרכיבים (אחד בכל שורה)</Label>
                        <Textarea id="ingredients" name="ingredients" value={Array.isArray(formData.ingredients) ? formData.ingredients.join('\n') : ''} onChange={handleIngredientChange} rows={8} />
                    </div>
                    <div>
                        <Label htmlFor="instructions">הוראות הכנה</Label>
                        <Textarea id="instructions" name="instructions" value={formData.instructions || ''} onChange={handleChange} rows={8} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="prep_time">זמן הכנה (דקות)</Label>
                            <Input id="prep_time" name="prep_time" type="number" placeholder="זמן הכנה (דקות)" value={formData.prep_time || ''} onChange={handleChange} />
                        </div>
                        <div>
                            <Label htmlFor="servings">מספר מנות</Label>
                            <Input id="servings" name="servings" type="number" placeholder="מספר מנות" value={formData.servings || ''} onChange={handleChange} />
                        </div>
                    </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="calories_per_serving">קלוריות למנה</Label>
                            <Input id="calories_per_serving" name="calories_per_serving" type="number" placeholder="קלוריות למנה" value={formData.calories_per_serving || ''} onChange={handleChange} />
                        </div>
                        <div>
                            <Label htmlFor="protein_grams">חלבון למנה (גרם)</Label>
                            <Input id="protein_grams" name="protein_grams" type="number" placeholder="חלבון למנה (גרם)" value={formData.protein_grams || ''} onChange={handleChange} />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="carbs_grams">פחמימות למנה (גרם)</Label>
                        <Input id="carbs_grams" name="carbs_grams" type="number" placeholder="פחמימות למנה (גרם)" value={formData.carbs_grams || ''} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="fat_grams">שומן למנה (גרם)</Label>
                        <Input id="fat_grams" name="fat_grams" type="number" placeholder="שומן למנה (גרם)" value={formData.fat_grams || ''} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="difficulty">רמת קושי</Label>
                        <Input id="difficulty" name="difficulty" type="text" placeholder="קל, בינוני, קשה" value={formData.difficulty || ''} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="equipment">ציוד דרוש</Label>
                        <Input id="equipment" name="equipment" type="text" placeholder="דוגמא: בלנדר, תנור" value={formData.equipment || ''} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="tips">טיפים נוספים</Label>
                        <Textarea id="tips" name="tips" placeholder="הוסיפו טיפים מועילים למתכון" value={formData.tips || ''} onChange={handleChange} rows={4} />
                    </div>
                    <div>
                        <Label htmlFor="image_url">כתובת תמונה</Label>
                        <Input id="image_url" name="image_url" type="text" placeholder="URL לתמונה" value={formData.image_url || ''} onChange={handleChange} />
                    </div>
                    <div>
                        <Label htmlFor="video_url">כתובת סרטון</Label>
                        <Input id="video_url" name="video_url" type="text" placeholder="URL לסרטון הדרכה" value={formData.video_url || ''} onChange={handleChange} />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onCancel}>ביטול</Button>
                        <Button type="submit">שמור שינויים</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
