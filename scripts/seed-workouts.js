/**
 * Seed script to add 20 ready workout templates to the database
 * Run this script from the project root: node scripts/seed-workouts.js
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

// 20 Ready Workout Templates
const workoutTemplates = [
  {
    template_name: 'אימון רגליים למתחילים',
    workout_title: 'אימון רגליים למתחילים',
    workout_description: 'אימון ממוקד לרגליים המתאים למתחילים, משלב תרגילי כוח בסיסיים',
    warmup_description: 'חימום: 5 דקות הליכה קלה, 10 מתיחות דינמיות לרגליים',
    warmup_duration: 10,
    estimated_duration: 45,
    workout_equipment: 'Bodyweight',
    difficulty_level: 'מתחיל',
    tags: ['רגליים', 'מתחילים', 'משקל גוף'],
    part_1_exercises: [
      {
        id: 'squat',
        name: 'סקוואט',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'שמור על גב ישר, ירך עד מקביל לרצפה'
      },
      {
        id: 'lunge',
        name: 'לאנג\'ים',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 10,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'כל רגל בנפרד, שמור על שיווי משקל'
      }
    ],
    part_2_exercises: [
      {
        id: 'calf-raise',
        name: 'הרמת עקבים',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 15,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'עלה על קצות האצבעות באיטיות'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון חזה וכתפיים',
    workout_title: 'אימון חזה וכתפיים',
    workout_description: 'אימון ממוקד לחזה וכתפיים עם משקולות יד',
    warmup_description: 'חימום: 5 דקות אופניים, מתיחות לכתפיים וחזה',
    warmup_duration: 10,
    estimated_duration: 50,
    workout_equipment: 'Dumbbell',
    difficulty_level: 'בינוני',
    tags: ['חזה', 'כתפיים', 'משקולות'],
    part_1_exercises: [
      {
        id: 'chest-press',
        name: 'לחיצת חזה',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 10,
        suggested_weight: 8,
        suggested_duration: 0,
        notes: 'שמור על גב ישר, הורד משקולות לאט'
      },
      {
        id: 'shoulder-press',
        name: 'לחיצת כתפיים',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 6,
        suggested_duration: 0,
        notes: 'לחץ מעלה עד ליישור מלא'
      }
    ],
    part_2_exercises: [
      {
        id: 'flyes',
        name: 'פלייס',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 6,
        suggested_duration: 0,
        notes: 'תנועה רחבה, שמור על מרפקים מעט כפופים'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון גב וזרועות',
    workout_title: 'אימון גב וזרועות',
    workout_description: 'אימון ממוקד לגב, בייספס וטריצפס',
    warmup_description: 'חימום: 5 דקות חתירה, מתיחות לגב וזרועות',
    warmup_duration: 10,
    estimated_duration: 55,
    workout_equipment: 'Dumbbell',
    difficulty_level: 'בינוני',
    tags: ['גב', 'זרועות', 'משקולות'],
    part_1_exercises: [
      {
        id: 'rows',
        name: 'חתירה',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 10,
        suggested_weight: 10,
        suggested_duration: 0,
        notes: 'משוך את המשקולות לגוף, שמור על גב ישר'
      },
      {
        id: 'bicep-curl',
        name: 'כיפוף בייספס',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 6,
        suggested_duration: 0,
        notes: 'תנועה מבוקרת, אל תניף'
      }
    ],
    part_2_exercises: [
      {
        id: 'tricep-extension',
        name: 'פשיטת טריצפס',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 5,
        suggested_duration: 0,
        notes: 'שמור על מרפקים צמודים לגוף'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון HIIT קצר',
    workout_title: 'אימון HIIT קצר',
    workout_description: 'אימון אינטנסיבי קצר לשריפת קלוריות',
    warmup_description: 'חימום: 3 דקות ריצה קלה, מתיחות דינמיות',
    warmup_duration: 5,
    estimated_duration: 20,
    workout_equipment: 'Bodyweight',
    difficulty_level: 'מתקדם',
    tags: ['HIIT', 'קרדיו', 'משקל גוף'],
    part_1_exercises: [
      {
        id: 'burpees',
        name: 'ברפי',
        category: 'קרדיו',
        suggested_sets: 4,
        suggested_reps: 10,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'תנועה מהירה ומבוקרת'
      },
      {
        id: 'mountain-climbers',
        name: 'טיפוס הרים',
        category: 'קרדיו',
        suggested_sets: 4,
        suggested_reps: 20,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: '30 שניות עבודה, 30 שניות מנוחה'
      }
    ],
    part_2_exercises: [
      {
        id: 'jumping-jacks',
        name: 'קפיצות כוכב',
        category: 'קרדיו',
        suggested_sets: 3,
        suggested_reps: 30,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'תנועה מהירה ורחבה'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון ליבה מלא',
    workout_title: 'אימון ליבה מלא',
    workout_description: 'אימון ממוקד לחיזוק הליבה והבטן',
    warmup_description: 'חימום: 5 דקות הליכה, מתיחות ליבה',
    warmup_duration: 8,
    estimated_duration: 30,
    workout_equipment: 'Bodyweight',
    difficulty_level: 'בינוני',
    tags: ['ליבה', 'בטן', 'משקל גוף'],
    part_1_exercises: [
      {
        id: 'plank',
        name: 'פלאנק',
        category: 'ליבה',
        suggested_sets: 3,
        suggested_reps: 0,
        suggested_weight: 0,
        suggested_duration: 45,
        notes: 'שמור על גוף ישר, נשום עמוק'
      },
      {
        id: 'crunches',
        name: 'כפיפות בטן',
        category: 'ליבה',
        suggested_sets: 3,
        suggested_reps: 20,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'תנועה מבוקרת, אל תמשוך את הצוואר'
      }
    ],
    part_2_exercises: [
      {
        id: 'russian-twist',
        name: 'פיתול רוסי',
        category: 'ליבה',
        suggested_sets: 3,
        suggested_reps: 20,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'פיתול מבוקר, שמור על גב ישר'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון רגליים מתקדם',
    workout_title: 'אימון רגליים מתקדם',
    workout_description: 'אימון אינטנסיבי לרגליים עם מוט',
    warmup_description: 'חימום: 10 דקות אופניים, מתיחות דינמיות',
    warmup_duration: 12,
    estimated_duration: 60,
    workout_equipment: 'Barbell',
    difficulty_level: 'מתקדם',
    tags: ['רגליים', 'מתקדם', 'מוט'],
    part_1_exercises: [
      {
        id: 'squat-barbell',
        name: 'סקוואט עם מוט',
        category: 'כוח',
        suggested_sets: 5,
        suggested_reps: 8,
        suggested_weight: 40,
        suggested_duration: 0,
        notes: 'עומק מלא, שמור על טכניקה נכונה'
      },
      {
        id: 'deadlift',
        name: 'דדליפט',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 6,
        suggested_weight: 50,
        suggested_duration: 0,
        notes: 'גב ישר, תנועה מבוקרת'
      }
    ],
    part_2_exercises: [
      {
        id: 'leg-press',
        name: 'לחיצת רגליים',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 12,
        suggested_weight: 60,
        suggested_duration: 0,
        notes: 'טווח תנועה מלא'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון פול בודי',
    workout_title: 'אימון פול בודי',
    workout_description: 'אימון מלא לכל הגוף',
    warmup_description: 'חימום: 5 דקות הליכה, מתיחות כלליות',
    warmup_duration: 10,
    estimated_duration: 50,
    workout_equipment: 'Dumbbell',
    difficulty_level: 'בינוני',
    tags: ['פול בודי', 'כל הגוף', 'משקולות'],
    part_1_exercises: [
      {
        id: 'squat-db',
        name: 'סקוואט עם משקולות',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 8,
        suggested_duration: 0,
        notes: 'טכניקה נכונה, עומק מלא'
      },
      {
        id: 'push-ups',
        name: 'כפיפות ידיים',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 15,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'גוף ישר, תנועה מלאה'
      }
    ],
    part_2_exercises: [
      {
        id: 'rows-db',
        name: 'חתירה עם משקולות',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 10,
        suggested_duration: 0,
        notes: 'גב ישר, משוך לגוף'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון TRX',
    workout_title: 'אימון TRX',
    workout_description: 'אימון עם רצועות TRX לחיזוק כל הגוף',
    warmup_description: 'חימום: 5 דקות תנועה דינמית, מתיחות',
    warmup_duration: 8,
    estimated_duration: 40,
    workout_equipment: 'TRX',
    difficulty_level: 'בינוני',
    tags: ['TRX', 'פונקציונלי', 'כל הגוף'],
    part_1_exercises: [
      {
        id: 'trx-rows',
        name: 'חתירה TRX',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'שמור על גוף ישר, משוך את הגוף'
      },
      {
        id: 'trx-pushups',
        name: 'כפיפות TRX',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 10,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'שליטה מלאה בתנועה'
      }
    ],
    part_2_exercises: [
      {
        id: 'trx-pike',
        name: 'פייק TRX',
        category: 'ליבה',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'חיזוק ליבה וכתפיים'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון קרדיו',
    workout_title: 'אימון קרדיו',
    workout_description: 'אימון אירובי לשריפת קלוריות ושיפור סיבולת',
    warmup_description: 'חימום: 5 דקות הליכה קלה',
    warmup_duration: 5,
    estimated_duration: 30,
    workout_equipment: 'Treadmill',
    difficulty_level: 'בינוני',
    tags: ['קרדיו', 'אירובי', 'סיבולת'],
    part_1_exercises: [
      {
        id: 'running',
        name: 'ריצה',
        category: 'קרדיו',
        suggested_sets: 1,
        suggested_reps: 0,
        suggested_weight: 0,
        suggested_duration: 1200,
        notes: '20 דקות ריצה בקצב בינוני'
      }
    ],
    part_2_exercises: [
      {
        id: 'walking',
        name: 'הליכה',
        category: 'קרדיו',
        suggested_sets: 1,
        suggested_reps: 0,
        suggested_weight: 0,
        suggested_duration: 300,
        notes: '5 דקות הליכה קלה לקירור'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון כתפיים ממוקד',
    workout_title: 'אימון כתפיים ממוקד',
    workout_description: 'אימון ממוקד לחיזוק הכתפיים מכל הזוויות',
    warmup_description: 'חימום: 5 דקות אופניים, מתיחות כתפיים',
    warmup_duration: 10,
    estimated_duration: 45,
    workout_equipment: 'Dumbbell',
    difficulty_level: 'בינוני',
    tags: ['כתפיים', 'משקולות'],
    part_1_exercises: [
      {
        id: 'shoulder-press-db',
        name: 'לחיצת כתפיים',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 10,
        suggested_weight: 8,
        suggested_duration: 0,
        notes: 'לחץ מעלה עד ליישור מלא'
      },
      {
        id: 'lateral-raise',
        name: 'הרמה צידית',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 5,
        suggested_duration: 0,
        notes: 'תנועה מבוקרת, אל תניף'
      }
    ],
    part_2_exercises: [
      {
        id: 'front-raise',
        name: 'הרמה קדמית',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 5,
        suggested_duration: 0,
        notes: 'הרמה עד לגובה הכתפיים'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון גב רחב',
    workout_title: 'אימון גב רחב',
    workout_description: 'אימון ממוקד להרחבת הגב וחיזוקו',
    warmup_description: 'חימום: 5 דקות חתירה, מתיחות גב',
    warmup_duration: 10,
    estimated_duration: 50,
    workout_equipment: 'Machine',
    difficulty_level: 'בינוני',
    tags: ['גב', 'מכונה'],
    part_1_exercises: [
      {
        id: 'lat-pulldown',
        name: 'משיכה רחבה',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 10,
        suggested_weight: 30,
        suggested_duration: 0,
        notes: 'משוך עד לסנטר, שליטה בתנועה'
      },
      {
        id: 'cable-rows',
        name: 'חתירת כבל',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 12,
        suggested_weight: 25,
        suggested_duration: 0,
        notes: 'גב ישר, משוך לגוף'
      }
    ],
    part_2_exercises: [
      {
        id: 'face-pull',
        name: 'משיכת פנים',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 15,
        suggested_weight: 15,
        suggested_duration: 0,
        notes: 'חיזוק כתפיים אחוריות'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון בוקר קצר',
    workout_title: 'אימון בוקר קצר',
    workout_description: 'אימון קצר ומעורר לבוקר',
    warmup_description: 'חימום: 3 דקות תנועה דינמית',
    warmup_duration: 5,
    estimated_duration: 15,
    workout_equipment: 'Bodyweight',
    difficulty_level: 'מתחיל',
    tags: ['בוקר', 'קצר', 'משקל גוף'],
    part_1_exercises: [
      {
        id: 'sun-salutation',
        name: 'ברכת השמש',
        category: 'גמישות',
        suggested_sets: 3,
        suggested_reps: 5,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'תנועה זורמת ומרגיעה'
      },
      {
        id: 'light-squats',
        name: 'סקוואט קל',
        category: 'כוח',
        suggested_sets: 2,
        suggested_reps: 10,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'תנועה קלה ומעוררת'
      }
    ],
    part_2_exercises: [],
    part_3_exercises: []
  },
  {
    template_name: 'אימון זרועות מלא',
    workout_title: 'אימון זרועות מלא',
    workout_description: 'אימון ממוקד לבייספס וטריצפס',
    warmup_description: 'חימום: 5 דקות אופניים, מתיחות זרועות',
    warmup_duration: 8,
    estimated_duration: 40,
    workout_equipment: 'Dumbbell',
    difficulty_level: 'בינוני',
    tags: ['זרועות', 'בייספס', 'טריצפס'],
    part_1_exercises: [
      {
        id: 'bicep-curl-db',
        name: 'כיפוף בייספס',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 12,
        suggested_weight: 8,
        suggested_duration: 0,
        notes: 'תנועה מבוקרת, אל תניף'
      },
      {
        id: 'hammer-curl',
        name: 'כיפוף פטיש',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 8,
        suggested_duration: 0,
        notes: 'אחיזה ניטרלית'
      }
    ],
    part_2_exercises: [
      {
        id: 'tricep-kickback',
        name: 'קיק בק טריצפס',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 5,
        suggested_duration: 0,
        notes: 'מרפקים צמודים, תנועה מבוקרת'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון פונקציונלי',
    workout_title: 'אימון פונקציונלי',
    workout_description: 'אימון תנועות פונקציונליות לחיי היום יום',
    warmup_description: 'חימום: 5 דקות תנועה דינמית',
    warmup_duration: 8,
    estimated_duration: 35,
    workout_equipment: 'Kettlebell',
    difficulty_level: 'בינוני',
    tags: ['פונקציונלי', 'כדור משקולת'],
    part_1_exercises: [
      {
        id: 'kettlebell-swing',
        name: 'נדנוד כדור משקולת',
        category: 'פונקציונלי',
        suggested_sets: 4,
        suggested_reps: 15,
        suggested_weight: 12,
        suggested_duration: 0,
        notes: 'תנועה מהירה ומבוקרת מהמותן'
      },
      {
        id: 'goblet-squat',
        name: 'סקוואט גביע',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 12,
        suggested_duration: 0,
        notes: 'עומק מלא, גב ישר'
      }
    ],
    part_2_exercises: [
      {
        id: 'kettlebell-row',
        name: 'חתירת כדור משקולת',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 12,
        suggested_duration: 0,
        notes: 'גב ישר, משוך לגוף'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון גמישות',
    workout_title: 'אימון גמישות',
    workout_description: 'אימון מתיחות וגמישות לשיפור טווח התנועה',
    warmup_description: 'חימום: 5 דקות הליכה קלה',
    warmup_duration: 5,
    estimated_duration: 25,
    workout_equipment: 'Bodyweight',
    difficulty_level: 'מתחיל',
    tags: ['גמישות', 'מתיחות', 'יוגה'],
    part_1_exercises: [
      {
        id: 'hamstring-stretch',
        name: 'מתיחת מיתר',
        category: 'גמישות',
        suggested_sets: 3,
        suggested_reps: 0,
        suggested_weight: 0,
        suggested_duration: 30,
        notes: 'החזק 30 שניות, נשום עמוק'
      },
      {
        id: 'hip-flexor-stretch',
        name: 'מתיחת כופפי ירך',
        category: 'גמישות',
        suggested_sets: 3,
        suggested_reps: 0,
        suggested_weight: 0,
        suggested_duration: 30,
        notes: 'כל רגל בנפרד, החזק 30 שניות'
      }
    ],
    part_2_exercises: [
      {
        id: 'shoulder-stretch',
        name: 'מתיחת כתפיים',
        category: 'גמישות',
        suggested_sets: 3,
        suggested_reps: 0,
        suggested_weight: 0,
        suggested_duration: 30,
        notes: 'מתיחה עדינה, נשום עמוק'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון חזה מתקדם',
    workout_title: 'אימון חזה מתקדם',
    workout_description: 'אימון אינטנסיבי לחזה עם מוט ומשקולות',
    warmup_description: 'חימום: 10 דקות אופניים, מתיחות חזה',
    warmup_duration: 12,
    estimated_duration: 60,
    workout_equipment: 'Barbell',
    difficulty_level: 'מתקדם',
    tags: ['חזה', 'מתקדם', 'מוט'],
    part_1_exercises: [
      {
        id: 'bench-press',
        name: 'לחיצת חזה',
        category: 'כוח',
        suggested_sets: 5,
        suggested_reps: 6,
        suggested_weight: 50,
        suggested_duration: 0,
        notes: 'טכניקה נכונה, שליטה מלאה'
      },
      {
        id: 'incline-press',
        name: 'לחיצה בשיפוע',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 8,
        suggested_weight: 40,
        suggested_duration: 0,
        notes: 'שיפוע 45 מעלות'
      }
    ],
    part_2_exercises: [
      {
        id: 'dips',
        name: 'דיפים',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 10,
        suggested_weight: 0,
        suggested_duration: 0,
        notes: 'תנועה מלאה, שליטה'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון אירובי אינטנסיבי',
    workout_title: 'אימון אירובי אינטנסיבי',
    workout_description: 'אימון אירובי אינטנסיבי לשריפת קלוריות מקסימלית',
    warmup_description: 'חימום: 5 דקות הליכה קלה',
    warmup_duration: 5,
    estimated_duration: 45,
    workout_equipment: 'Bike',
    difficulty_level: 'מתקדם',
    tags: ['קרדיו', 'אירובי', 'אינטנסיבי'],
    part_1_exercises: [
      {
        id: 'cycling-interval',
        name: 'אופניים אינטרוולים',
        category: 'קרדיו',
        suggested_sets: 1,
        suggested_reps: 0,
        suggested_weight: 0,
        suggested_duration: 1800,
        notes: '30 דקות: 1 דקה מהיר, 1 דקה איטי'
      }
    ],
    part_2_exercises: [
      {
        id: 'cool-down',
        name: 'קירור',
        category: 'קרדיו',
        suggested_sets: 1,
        suggested_reps: 0,
        suggested_weight: 0,
        suggested_duration: 600,
        notes: '10 דקות אופניים קל'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון רגליים עם מכונה',
    workout_title: 'אימון רגליים עם מכונה',
    workout_description: 'אימון ממוקד לרגליים עם מכונות',
    warmup_description: 'חימום: 10 דקות אופניים, מתיחות',
    warmup_duration: 10,
    estimated_duration: 55,
    workout_equipment: 'Machine',
    difficulty_level: 'בינוני',
    tags: ['רגליים', 'מכונה'],
    part_1_exercises: [
      {
        id: 'leg-press-machine',
        name: 'לחיצת רגליים במכונה',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 12,
        suggested_weight: 60,
        suggested_duration: 0,
        notes: 'טווח תנועה מלא'
      },
      {
        id: 'leg-extension',
        name: 'פשיטת רגליים',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 15,
        suggested_weight: 30,
        suggested_duration: 0,
        notes: 'תנועה מבוקרת, אל תנעל'
      }
    ],
    part_2_exercises: [
      {
        id: 'leg-curl',
        name: 'כיפוף רגליים',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 15,
        suggested_weight: 25,
        suggested_duration: 0,
        notes: 'תנועה מבוקרת'
      }
    ],
    part_3_exercises: []
  },
  {
    template_name: 'אימון כוח כללי',
    workout_title: 'אימון כוח כללי',
    workout_description: 'אימון כוח מאוזן לכל קבוצות השרירים',
    warmup_description: 'חימום: 5 דקות אופניים, מתיחות כלליות',
    warmup_duration: 10,
    estimated_duration: 60,
    workout_equipment: 'Dumbbell',
    difficulty_level: 'בינוני',
    tags: ['כוח', 'כל הגוף', 'משקולות'],
    part_1_exercises: [
      {
        id: 'squat-db-full',
        name: 'סקוואט עם משקולות',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 10,
        suggested_weight: 10,
        suggested_duration: 0,
        notes: 'עומק מלא, טכניקה נכונה'
      },
      {
        id: 'chest-press-db',
        name: 'לחיצת חזה',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 10,
        suggested_weight: 12,
        suggested_duration: 0,
        notes: 'גב ישר, תנועה מבוקרת'
      }
    ],
    part_2_exercises: [
      {
        id: 'rows-db-full',
        name: 'חתירה',
        category: 'כוח',
        suggested_sets: 4,
        suggested_reps: 10,
        suggested_weight: 12,
        suggested_duration: 0,
        notes: 'גב ישר, משוך לגוף'
      },
      {
        id: 'shoulder-press-db-full',
        name: 'לחיצת כתפיים',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 8,
        suggested_duration: 0,
        notes: 'לחץ מעלה עד ליישור'
      }
    ],
    part_3_exercises: [
      {
        id: 'bicep-curl-full',
        name: 'כיפוף בייספס',
        category: 'כוח',
        suggested_sets: 3,
        suggested_reps: 12,
        suggested_weight: 6,
        suggested_duration: 0,
        notes: 'תנועה מבוקרת'
      }
    ]
  }
];

async function seedWorkouts() {
  try {
    await initializeAdmin();
    
    const db = admin.firestore();
    const batch = db.batch();
    const collectionRef = db.collection('workoutTemplates');
    
    console.log('🌱 Starting to seed workout templates...');
    
    let count = 0;
    for (const template of workoutTemplates) {
      const docRef = collectionRef.doc();
      batch.set(docRef, {
        ...template,
        created_date: admin.firestore.FieldValue.serverTimestamp(),
        created_by: 'system',
        is_system_template: true
      });
      count++;
    }
    
    await batch.commit();
    console.log(`✅ Successfully seeded ${count} workout templates!`);
    console.log('📋 Templates added:');
    workoutTemplates.forEach((template, index) => {
      console.log(`   ${index + 1}. ${template.template_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding workouts:', error);
    process.exit(1);
  }
}

// Run the seed function
seedWorkouts();

