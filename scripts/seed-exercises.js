/**
 * Seed script to add exercises to the database
 * Run this script from the project root: node scripts/seed-exercises.js
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

// Common exercises database
const exercises = [
  // Chest exercises
  { name_en: 'Push Up', name_he: 'כפיפות ידיים', muscle_group: 'Chest', category: 'Strength', equipment: 'Bodyweight', description: 'תרגיל בסיסי לחיזוק החזה, הכתפיים והזרועות', default_weight: 0 },
  { name_en: 'Bench Press', name_he: 'לחיצת חזה', muscle_group: 'Chest', category: 'Strength', equipment: 'Barbell', description: 'תרגיל מפתח לחיזוק החזה', default_weight: 0 },
  { name_en: 'Dumbbell Flyes', name_he: 'פלייס', muscle_group: 'Chest', category: 'Strength', equipment: 'Dumbbell', description: 'תרגיל לחיזוק החזה והכתפיים', default_weight: 0 },
  { name_en: 'Incline Press', name_he: 'לחיצה בשיפוע', muscle_group: 'Chest', category: 'Strength', equipment: 'Dumbbell', description: 'לחיצת חזה בשיפוע לחיזוק החזה העליון', default_weight: 0 },
  { name_en: 'Dips', name_he: 'דיפים', muscle_group: 'Chest', category: 'Strength', equipment: 'Bodyweight', description: 'תרגיל לחיזוק החזה, הכתפיים והטריצפס', default_weight: 0 },
  
  // Back exercises
  { name_en: 'Pull Up', name_he: 'משיכה', muscle_group: 'Back', category: 'Strength', equipment: 'Pull-up Bar', description: 'תרגיל מפתח לחיזוק הגב והזרועות', default_weight: 0 },
  { name_en: 'Bent Over Row', name_he: 'חתירה כפופה', muscle_group: 'Back', category: 'Strength', equipment: 'Barbell', description: 'תרגיל לחיזוק הגב והזרועות', default_weight: 0 },
  { name_en: 'Lat Pulldown', name_he: 'משיכה רחבה', muscle_group: 'Back', category: 'Strength', equipment: 'Machine', description: 'תרגיל לחיזוק שרירי הגב הרחבים', default_weight: 0 },
  { name_en: 'Cable Row', name_he: 'חתירת כבל', muscle_group: 'Back', category: 'Strength', equipment: 'Cable', description: 'תרגיל לחיזוק הגב האמצעי', default_weight: 0 },
  { name_en: 'T-Bar Row', name_he: 'חתירת T', muscle_group: 'Back', category: 'Strength', equipment: 'Barbell', description: 'תרגיל לחיזוק הגב', default_weight: 0 },
  
  // Leg exercises
  { name_en: 'Squat', name_he: 'סקוואט', muscle_group: 'Legs', category: 'Strength', equipment: 'Bodyweight', description: 'תרגיל מפתח לחיזוק הרגליים והישבן', default_weight: 0 },
  { name_en: 'Barbell Squat', name_he: 'סקוואט עם מוט', muscle_group: 'Legs', category: 'Strength', equipment: 'Barbell', description: 'תרגיל מפתח לחיזוק הרגליים', default_weight: 0 },
  { name_en: 'Lunges', name_he: 'לאנג\'ים', muscle_group: 'Legs', category: 'Strength', equipment: 'Bodyweight', description: 'תרגיל לחיזוק הרגליים והישבן', default_weight: 0 },
  { name_en: 'Leg Press', name_he: 'לחיצת רגליים', muscle_group: 'Legs', category: 'Strength', equipment: 'Machine', description: 'תרגיל לחיזוק הרגליים', default_weight: 0 },
  { name_en: 'Deadlift', name_he: 'דדליפט', muscle_group: 'Legs', category: 'Strength', equipment: 'Barbell', description: 'תרגיל מפתח לחיזוק הגב והרגליים', default_weight: 0 },
  { name_en: 'Calf Raise', name_he: 'הרמת עקבים', muscle_group: 'Legs', category: 'Strength', equipment: 'Bodyweight', description: 'תרגיל לחיזוק שוקיים', default_weight: 0 },
  { name_en: 'Leg Extension', name_he: 'פשיטת רגליים', muscle_group: 'Legs', category: 'Strength', equipment: 'Machine', description: 'תרגיל לחיזוק שרירי הירך הקדמיים', default_weight: 0 },
  { name_en: 'Leg Curl', name_he: 'כיפוף רגליים', muscle_group: 'Legs', category: 'Strength', equipment: 'Machine', description: 'תרגיל לחיזוק שרירי הירך האחוריים', default_weight: 0 },
  
  // Shoulder exercises
  { name_en: 'Shoulder Press', name_he: 'לחיצת כתפיים', muscle_group: 'Shoulders', category: 'Strength', equipment: 'Dumbbell', description: 'תרגיל לחיזוק הכתפיים', default_weight: 0 },
  { name_en: 'Lateral Raise', name_he: 'הרמה צידית', muscle_group: 'Shoulders', category: 'Strength', equipment: 'Dumbbell', description: 'תרגיל לחיזוק הכתפיים הצדדיות', default_weight: 0 },
  { name_en: 'Front Raise', name_he: 'הרמה קדמית', muscle_group: 'Shoulders', category: 'Strength', equipment: 'Dumbbell', description: 'תרגיל לחיזוק הכתפיים הקדמיות', default_weight: 0 },
  { name_en: 'Rear Delt Fly', name_he: 'פלייס כתפיים אחוריות', muscle_group: 'Shoulders', category: 'Strength', equipment: 'Dumbbell', description: 'תרגיל לחיזוק הכתפיים האחוריות', default_weight: 0 },
  { name_en: 'Upright Row', name_he: 'משיכה זקופה', muscle_group: 'Shoulders', category: 'Strength', equipment: 'Barbell', description: 'תרגיל לחיזוק הכתפיים והזרועות', default_weight: 0 },
  
  // Biceps exercises
  { name_en: 'Bicep Curl', name_he: 'כיפוף בייספס', muscle_group: 'Biceps', category: 'Strength', equipment: 'Dumbbell', description: 'תרגיל לחיזוק הבייספס', default_weight: 0 },
  { name_en: 'Hammer Curl', name_he: 'כיפוף פטיש', muscle_group: 'Biceps', category: 'Strength', equipment: 'Dumbbell', description: 'תרגיל לחיזוק הבייספס והזרוע', default_weight: 0 },
  { name_en: 'Barbell Curl', name_he: 'כיפוף בייספס עם מוט', muscle_group: 'Biceps', category: 'Strength', equipment: 'Barbell', description: 'תרגיל לחיזוק הבייספס', default_weight: 0 },
  { name_en: 'Cable Curl', name_he: 'כיפוף בייספס כבל', muscle_group: 'Biceps', category: 'Strength', equipment: 'Cable', description: 'תרגיל לחיזוק הבייספס', default_weight: 0 },
  
  // Triceps exercises
  { name_en: 'Tricep Extension', name_he: 'פשיטת טריצפס', muscle_group: 'Triceps', category: 'Strength', equipment: 'Dumbbell', description: 'תרגיל לחיזוק הטריצפס', default_weight: 0 },
  { name_en: 'Tricep Kickback', name_he: 'קיק בק טריצפס', muscle_group: 'Triceps', category: 'Strength', equipment: 'Dumbbell', description: 'תרגיל לחיזוק הטריצפס', default_weight: 0 },
  { name_en: 'Overhead Extension', name_he: 'פשיטה מעל הראש', muscle_group: 'Triceps', category: 'Strength', equipment: 'Dumbbell', description: 'תרגיל לחיזוק הטריצפס', default_weight: 0 },
  { name_en: 'Close Grip Press', name_he: 'לחיצה צרה', muscle_group: 'Triceps', category: 'Strength', equipment: 'Barbell', description: 'תרגיל לחיזוק הטריצפס והחזה', default_weight: 0 },
  
  // Core exercises
  { name_en: 'Plank', name_he: 'פלאנק', muscle_group: 'Core', category: 'Strength', equipment: 'Bodyweight', description: 'תרגיל מפתח לחיזוק הליבה', default_weight: 0 },
  { name_en: 'Crunches', name_he: 'כפיפות בטן', muscle_group: 'Core', category: 'Strength', equipment: 'Bodyweight', description: 'תרגיל לחיזוק הבטן', default_weight: 0 },
  { name_en: 'Russian Twist', name_he: 'פיתול רוסי', muscle_group: 'Core', category: 'Strength', equipment: 'Bodyweight', description: 'תרגיל לחיזוק הליבה והבטן', default_weight: 0 },
  { name_en: 'Mountain Climbers', name_he: 'טיפוס הרים', muscle_group: 'Core', category: 'Cardio', equipment: 'Bodyweight', description: 'תרגיל קרדיו לחיזוק הליבה', default_weight: 0 },
  { name_en: 'Leg Raises', name_he: 'הרמת רגליים', muscle_group: 'Core', category: 'Strength', equipment: 'Bodyweight', description: 'תרגיל לחיזוק הבטן התחתונה', default_weight: 0 },
  { name_en: 'Bicycle Crunches', name_he: 'כפיפות אופניים', muscle_group: 'Core', category: 'Strength', equipment: 'Bodyweight', description: 'תרגיל לחיזוק הבטן והליבה', default_weight: 0 },
  
  // Cardio exercises
  { name_en: 'Burpees', name_he: 'ברפי', muscle_group: 'Full Body', category: 'Cardio', equipment: 'Bodyweight', description: 'תרגיל קרדיו אינטנסיבי', default_weight: 0 },
  { name_en: 'Jumping Jacks', name_he: 'קפיצות כוכב', muscle_group: 'Full Body', category: 'Cardio', equipment: 'Bodyweight', description: 'תרגיל קרדיו בסיסי', default_weight: 0 },
  { name_en: 'High Knees', name_he: 'ברכיים גבוהות', muscle_group: 'Legs', category: 'Cardio', equipment: 'Bodyweight', description: 'תרגיל קרדיו לחיזוק הרגליים', default_weight: 0 },
  { name_en: 'Running', name_he: 'ריצה', muscle_group: 'Legs', category: 'Cardio', equipment: 'Treadmill', description: 'תרגיל קרדיו בסיסי', default_weight: 0 },
  { name_en: 'Cycling', name_he: 'אופניים', muscle_group: 'Legs', category: 'Cardio', equipment: 'Bike', description: 'תרגיל קרדיו לחיזוק הרגליים', default_weight: 0 },
  { name_en: 'Rowing', name_he: 'חתירה', muscle_group: 'Full Body', category: 'Cardio', equipment: 'Rower', description: 'תרגיל קרדיו מלא גוף', default_weight: 0 },
  
  // Functional exercises
  { name_en: 'Kettlebell Swing', name_he: 'נדנוד כדור משקולת', muscle_group: 'Full Body', category: 'Functional', equipment: 'Kettlebell', description: 'תרגיל פונקציונלי מלא גוף', default_weight: 0 },
  { name_en: 'Goblet Squat', name_he: 'סקוואט גביע', muscle_group: 'Legs', category: 'Functional', equipment: 'Kettlebell', description: 'תרגיל פונקציונלי לרגליים', default_weight: 0 },
  { name_en: 'TRX Row', name_he: 'חתירה TRX', muscle_group: 'Back', category: 'Functional', equipment: 'TRX', description: 'תרגיל פונקציונלי לחיזוק הגב', default_weight: 0 },
  { name_en: 'TRX Push Up', name_he: 'כפיפות TRX', muscle_group: 'Chest', category: 'Functional', equipment: 'TRX', description: 'תרגיל פונקציונלי לחיזוק החזה', default_weight: 0 },
  { name_en: 'TRX Pike', name_he: 'פייק TRX', muscle_group: 'Core', category: 'Functional', equipment: 'TRX', description: 'תרגיל פונקציונלי לחיזוק הליבה', default_weight: 0 },
  
  // Flexibility/Mobility
  { name_en: 'Hamstring Stretch', name_he: 'מתיחת מיתר', muscle_group: 'Legs', category: 'Mobility', equipment: 'Bodyweight', description: 'מתיחה לשרירי המיתר', default_weight: 0 },
  { name_en: 'Hip Flexor Stretch', name_he: 'מתיחת כופפי ירך', muscle_group: 'Legs', category: 'Mobility', equipment: 'Bodyweight', description: 'מתיחה לכופפי הירך', default_weight: 0 },
  { name_en: 'Shoulder Stretch', name_he: 'מתיחת כתפיים', muscle_group: 'Shoulders', category: 'Mobility', equipment: 'Bodyweight', description: 'מתיחה לכתפיים', default_weight: 0 },
  { name_en: 'Sun Salutation', name_he: 'ברכת השמש', muscle_group: 'Full Body', category: 'Mobility', equipment: 'Bodyweight', description: 'תנועה יוגית מלאת גוף', default_weight: 0 },
];

async function seedExercises() {
  try {
    await initializeAdmin();
    
    const db = admin.firestore();
    const batch = db.batch();
    const collectionRef = db.collection('exerciseDefinitions');
    
    console.log('🌱 Starting to seed exercises...');
    
    let count = 0;
    for (const exercise of exercises) {
      const docRef = collectionRef.doc();
      batch.set(docRef, {
        ...exercise,
        created_date: admin.firestore.FieldValue.serverTimestamp(),
        created_by: 'system',
        is_system_exercise: true
      });
      count++;
    }
    
    await batch.commit();
    console.log(`✅ Successfully seeded ${count} exercises!`);
    console.log('📋 Exercises added:');
    exercises.forEach((exercise, index) => {
      console.log(`   ${index + 1}. ${exercise.name_he} (${exercise.name_en}) - ${exercise.muscle_group}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding exercises:', error);
    process.exit(1);
  }
}

// Run the seed function
seedExercises();

