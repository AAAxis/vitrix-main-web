/**
 * Seed script to add 20 recipes to the database
 * Run this script from the project root: node scripts/seed-recipes.js
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin SDK
let adminInitialized = false;

async function initializeAdmin() {
  if (adminInitialized || admin.apps.length) {
    return;
  }

  try {
    let credential;
    
    // Try to use environment variables first (production)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'muscule-up',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
      console.log('✅ Firebase Admin SDK initialized with environment variables');
    } 
    // Fallback to service account file
    else {
      const serviceAccountPath = path.join(__dirname, '..', 'muscule-up-924cedf05ad5.json');
      if (fs.existsSync(serviceAccountPath)) {
        credential = admin.credential.cert(serviceAccountPath);
        console.log('✅ Firebase Admin SDK initialized with service account file');
      } else {
        throw new Error('No Firebase Admin credentials found. Please set environment variables or provide service account file.');
      }
    }

    if (credential) {
      admin.initializeApp({
        credential,
        projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'muscule-up',
      });
      console.log('✅ Firebase Admin app initialized successfully');
      adminInitialized = true;
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
    throw error;
  }
}

// 20 recipes database
const recipes = [
  {
    name: 'אומלט חלבונים',
    name_en: 'Protein Omelet',
    category: 'main_meals',
    prep_time: 10,
    servings: 1,
    difficulty: 'קל',
    calories_per_serving: 280,
    protein_grams: 35,
    carbs_grams: 5,
    fat_grams: 12,
    ingredients: ['3 ביצים', '50 גרם גבינה לבנה 5%', 'ירקות (עגבניות, פטריות, בצל)', 'תבלינים'],
    instructions: '1. טרוף את הביצים בקערה\n2. הוסף גבינה וירקות\n3. מחמם מחבת עם מעט שמן\n4. יוצק את התערובת ומטגן 3-4 דקות מכל צד',
    tips: 'ניתן להוסיף ירקות נוספים לפי הטעם',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'שייק חלבון בננה',
    name_en: 'Banana Protein Shake',
    category: 'shakes',
    prep_time: 5,
    servings: 1,
    difficulty: 'קל',
    calories_per_serving: 320,
    protein_grams: 30,
    carbs_grams: 35,
    fat_grams: 8,
    ingredients: ['1 בננה', '30 גרם אבקת חלבון', '200 מ"ל חלב', 'כפית דבש', 'קרח'],
    instructions: '1. קוצץ את הבננה\n2. מכניס את כל המרכיבים לבלנדר\n3. מערבל עד לקבלת מרקם חלק\n4. מגיש קר',
    tips: 'ניתן להוסיף תותים או פירות נוספים',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'סלט יווני',
    name_en: 'Greek Salad',
    category: 'salads',
    prep_time: 15,
    servings: 2,
    difficulty: 'קל',
    calories_per_serving: 180,
    protein_grams: 8,
    carbs_grams: 12,
    fat_grams: 12,
    ingredients: ['עגבניות', 'מלפפון', 'פלפל אדום', 'בצל סגול', 'זיתים', 'גבינת פטה', 'שמן זית', 'לימון'],
    instructions: '1. חותך את כל הירקות לקוביות\n2. מוסיף זיתים וגבינת פטה\n3. מתבל בשמן זית ולימון\n4. מערבב היטב',
    tips: 'מומלץ להגיש קר',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'עוף בגריל עם ירקות',
    name_en: 'Grilled Chicken with Vegetables',
    category: 'main_meals',
    prep_time: 30,
    servings: 2,
    difficulty: 'בינוני',
    calories_per_serving: 350,
    protein_grams: 45,
    carbs_grams: 15,
    fat_grams: 10,
    ingredients: ['200 גרם חזה עוף', 'ברוקולי', 'גזר', 'פלפל', 'שמן זית', 'תבלינים'],
    instructions: '1. מתבל את העוף בתבלינים\n2. מחמם מחבת גריל\n3. צולה את העוף 6-8 דקות מכל צד\n4. מטגן את הירקות במחבת נפרדת',
    tips: 'העוף מוכן כשיש לו צבע זהוב',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'קוואקר עם פירות',
    name_en: 'Oatmeal with Fruits',
    category: 'main_meals',
    prep_time: 10,
    servings: 1,
    difficulty: 'קל',
    calories_per_serving: 280,
    protein_grams: 12,
    carbs_grams: 45,
    fat_grams: 6,
    ingredients: ['50 גרם קוואקר', '200 מ"ל חלב', 'בננה', 'תותים', 'כפית דבש'],
    instructions: '1. מבשל את הקוואקר בחלב 5 דקות\n2. מוסיף פירות חתוכים\n3. מתבל בדבש\n4. מגיש חם',
    tips: 'ניתן להוסיף אגוזים או שקדים',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'פנקייק חלבון',
    name_en: 'Protein Pancakes',
    category: 'main_meals',
    prep_time: 15,
    servings: 2,
    difficulty: 'בינוני',
    calories_per_serving: 250,
    protein_grams: 25,
    carbs_grams: 20,
    fat_grams: 8,
    ingredients: ['2 ביצים', '30 גרם אבקת חלבון', 'בננה', 'כפית אבקת אפייה', 'קינמון'],
    instructions: '1. מערבב את כל המרכיבים בבלנדר\n2. מחמם מחבת עם מעט שמן\n3. יוצק כמות קטנה מהתערובת\n4. הופך כשיש בועות',
    tips: 'מומלץ להגיש עם פירות טריים',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'סלט קינואה',
    name_en: 'Quinoa Salad',
    category: 'salads',
    prep_time: 20,
    servings: 2,
    difficulty: 'בינוני',
    calories_per_serving: 320,
    protein_grams: 12,
    carbs_grams: 50,
    fat_grams: 8,
    ingredients: ['100 גרם קינואה', 'עגבניות שרי', 'מלפפון', 'פטרוזיליה', 'לימון', 'שמן זית'],
    instructions: '1. מבשל את הקינואה לפי ההוראות\n2. חותך את הירקות\n3. מערבב הכל יחד\n4. מתבל בלימון ושמן זית',
    tips: 'ניתן להוסיף גבינת פטה',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'דג סלמון בתנור',
    name_en: 'Baked Salmon',
    category: 'main_meals',
    prep_time: 25,
    servings: 2,
    difficulty: 'קל',
    calories_per_serving: 380,
    protein_grams: 35,
    carbs_grams: 5,
    fat_grams: 22,
    ingredients: ['200 גרם סלמון', 'לימון', 'שמיר', 'שום', 'שמן זית', 'תבלינים'],
    instructions: '1. מתבל את הסלמון בתבלינים\n2. מניח בתבנית עם ירקות\n3. אופה בתנור 180 מעלות 20 דקות\n4. מגיש עם לימון',
    tips: 'הסלמון מוכן כשהוא מתפרק בקלות',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'שייק ירוק',
    name_en: 'Green Smoothie',
    category: 'shakes',
    prep_time: 5,
    servings: 1,
    difficulty: 'קל',
    calories_per_serving: 200,
    protein_grams: 15,
    carbs_grams: 30,
    fat_grams: 5,
    ingredients: ['תרד', 'קייל', 'בננה', 'תפוח', 'לימון', 'מים'],
    instructions: '1. שוטף את הירקות הירוקים\n2. קוצץ את הפירות\n3. מערבל הכל בבלנדר\n4. מגיש קר',
    tips: 'ניתן להוסיף ג\'ינג\'ר לטעם',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'חטיף חלבון ביתי',
    name_en: 'Homemade Protein Bar',
    category: 'snacks',
    prep_time: 20,
    servings: 8,
    difficulty: 'בינוני',
    calories_per_serving: 180,
    protein_grams: 15,
    carbs_grams: 18,
    fat_grams: 6,
    ingredients: ['100 גרם אבקת חלבון', '100 גרם שיבולת שועל', '50 גרם חמאת בוטנים', 'דבש', 'שוקולד מריר'],
    instructions: '1. מערבב את כל המרכיבים\n2. יוצר צורה של בר\n3. מכניס למקרר לשעה\n4. חותך לחתיכות',
    tips: 'ניתן לשמור במקרר עד שבוע',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'ביצים מקושקשות עם ירקות',
    name_en: 'Scrambled Eggs with Vegetables',
    category: 'main_meals',
    prep_time: 10,
    servings: 1,
    difficulty: 'קל',
    calories_per_serving: 250,
    protein_grams: 20,
    carbs_grams: 8,
    fat_grams: 15,
    ingredients: ['3 ביצים', 'פטריות', 'עגבניות', 'בצל ירוק', 'תבלינים'],
    instructions: '1. מטגן את הירקות במחבת\n2. מוסיף את הביצים הטרופות\n3. מערבב עד שהביצים מבושלות\n4. מתבל ומגיש',
    tips: 'מומלץ להגיש עם לחם מלא',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'סלט טונה',
    name_en: 'Tuna Salad',
    category: 'salads',
    prep_time: 10,
    servings: 1,
    difficulty: 'קל',
    calories_per_serving: 220,
    protein_grams: 28,
    carbs_grams: 5,
    fat_grams: 10,
    ingredients: ['קופסת טונה במים', 'ביצה קשה', 'מלפפון חמוץ', 'בצל', 'מיונז קל', 'לימון'],
    instructions: '1. מסנן את הטונה\n2. חותך את הביצה והירקות\n3. מערבב הכל יחד\n4. מתבל במיונז ולימון',
    tips: 'ניתן להוסיף סלרי או תפוח',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'שייק שוקולד-בננה',
    name_en: 'Chocolate Banana Shake',
    category: 'shakes',
    prep_time: 5,
    servings: 1,
    difficulty: 'קל',
    calories_per_serving: 350,
    protein_grams: 32,
    carbs_grams: 40,
    fat_grams: 8,
    ingredients: ['1 בננה', '30 גרם אבקת חלבון שוקולד', '200 מ"ל חלב', 'כפית קקאו', 'קרח'],
    instructions: '1. קוצץ את הבננה\n2. מערבל את כל המרכיבים בבלנדר\n3. מגיש קר',
    tips: 'ניתן להוסיף בוטנים לטעם',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'פסטה עם עוף וירקות',
    name_en: 'Pasta with Chicken and Vegetables',
    category: 'main_meals',
    prep_time: 25,
    servings: 2,
    difficulty: 'בינוני',
    calories_per_serving: 420,
    protein_grams: 35,
    carbs_grams: 50,
    fat_grams: 10,
    ingredients: ['100 גרם פסטה מלאה', '150 גרם חזה עוף', 'ברוקולי', 'פלפלים', 'שום', 'רוטב עגבניות'],
    instructions: '1. מבשל את הפסטה\n2. מטגן את העוף והירקות\n3. מוסיף רוטב עגבניות\n4. מערבב עם הפסטה',
    tips: 'ניתן להוסיף גבינה פרמזן',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'יוגורט עם גרנולה',
    name_en: 'Yogurt with Granola',
    category: 'snacks',
    prep_time: 5,
    servings: 1,
    difficulty: 'קל',
    calories_per_serving: 280,
    protein_grams: 15,
    carbs_grams: 35,
    fat_grams: 8,
    ingredients: ['200 גרם יוגורט יווני', '30 גרם גרנולה', 'פירות יער', 'כפית דבש'],
    instructions: '1. מניח את היוגורט בקערה\n2. מוסיף גרנולה ופירות\n3. מתבל בדבש\n4. מגיש',
    tips: 'ניתן להוסיף שקדים או אגוזים',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'סלט אבוקדו וטונה',
    name_en: 'Avocado and Tuna Salad',
    category: 'salads',
    prep_time: 15,
    servings: 1,
    difficulty: 'קל',
    calories_per_serving: 350,
    protein_grams: 30,
    carbs_grams: 12,
    fat_grams: 20,
    ingredients: ['אבוקדו', 'קופסת טונה', 'עגבניות שרי', 'בצל סגול', 'לימון', 'שמן זית'],
    instructions: '1. חותך את האבוקדו לקוביות\n2. מסנן את הטונה\n3. חותך את הירקות\n4. מערבב ומתבל',
    tips: 'מומלץ להגיש מיד',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'שייק וניל-תות',
    name_en: 'Vanilla Strawberry Shake',
    category: 'shakes',
    prep_time: 5,
    servings: 1,
    difficulty: 'קל',
    calories_per_serving: 300,
    protein_grams: 28,
    carbs_grams: 32,
    fat_grams: 6,
    ingredients: ['10 תותים', '30 גרם אבקת חלבון וניל', '200 מ"ל חלב', 'כפית דבש', 'קרח'],
    instructions: '1. שוטף את התותים\n2. מערבל את כל המרכיבים בבלנדר\n3. מגיש קר',
    tips: 'ניתן להוסיף בננה',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'עוף בתנור עם תפוחי אדמה',
    name_en: 'Baked Chicken with Potatoes',
    category: 'main_meals',
    prep_time: 45,
    servings: 2,
    difficulty: 'בינוני',
    calories_per_serving: 450,
    protein_grams: 40,
    carbs_grams: 45,
    fat_grams: 12,
    ingredients: ['200 גרם עוף', '2 תפוחי אדמה', 'בטטה', 'ירקות שורש', 'תבלינים', 'שמן זית'],
    instructions: '1. מתבל את העוף והירקות\n2. מניח בתבנית\n3. אופה בתנור 180 מעלות 40 דקות\n4. מגיש חם',
    tips: 'הירקות מוכנים כשרכים',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'חטיף אנרגיה תמרים',
    name_en: 'Date Energy Balls',
    category: 'snacks',
    prep_time: 15,
    servings: 10,
    difficulty: 'קל',
    calories_per_serving: 120,
    protein_grams: 3,
    carbs_grams: 20,
    fat_grams: 4,
    ingredients: ['200 גרם תמרים', '100 גרם שקדים', 'כפית קקאו', 'קוקוס'],
    instructions: '1. מערבל את התמרים והשקדים בבלנדר\n2. יוצר כדורים קטנים\n3. מגלגל בקוקוס\n4. מכניס למקרר',
    tips: 'ניתן לשמור במקרר שבועיים',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'סלט פסטה קר',
    name_en: 'Cold Pasta Salad',
    category: 'salads',
    prep_time: 20,
    servings: 2,
    difficulty: 'קל',
    calories_per_serving: 320,
    protein_grams: 12,
    carbs_grams: 45,
    fat_grams: 10,
    ingredients: ['100 גרם פסטה', 'עגבניות', 'מלפפון', 'זיתים', 'גבינת פטה', 'רוטב ויניגרט'],
    instructions: '1. מבשל את הפסטה ומצנן\n2. חותך את הירקות\n3. מערבב הכל עם הרוטב\n4. מגיש קר',
    tips: 'מומלץ להכין מראש',
    is_public: true,
    creator_email: 'system',
  },
  {
    name: 'שייק קפה-בננה',
    name_en: 'Coffee Banana Shake',
    category: 'shakes',
    prep_time: 5,
    servings: 1,
    difficulty: 'קל',
    calories_per_serving: 280,
    protein_grams: 25,
    carbs_grams: 30,
    fat_grams: 7,
    ingredients: ['1 בננה', '30 גרם אבקת חלבון וניל', 'קפה קר', '200 מ"ל חלב', 'קרח'],
    instructions: '1. מכין קפה קר\n2. קוצץ את הבננה\n3. מערבל הכל בבלנדר\n4. מגיש קר',
    tips: 'מושלם לארוחת בוקר',
    is_public: true,
    creator_email: 'system',
  },
];

async function seedRecipes() {
  try {
    await initializeAdmin();
    
    const db = admin.firestore();
    const batch = db.batch();
    const collectionRef = db.collection('recipes');
    
    console.log('🌱 Starting to seed recipes...');
    
    let count = 0;
    for (const recipe of recipes) {
      const docRef = collectionRef.doc();
      batch.set(docRef, {
        ...recipe,
        created_date: admin.firestore.FieldValue.serverTimestamp(),
        created_by: 'system',
        is_system_recipe: true
      });
      count++;
    }
    
    await batch.commit();
    console.log(`✅ Successfully seeded ${count} recipes!`);
    console.log('📋 Recipes added:');
    recipes.forEach((recipe, index) => {
      console.log(`   ${index + 1}. ${recipe.name} (${recipe.name_en}) - ${recipe.category}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding recipes:', error);
    process.exit(1);
  }
}

// Run the seed function
seedRecipes();

