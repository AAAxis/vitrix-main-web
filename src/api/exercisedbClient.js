/**
 * ExerciseDB API Client
 * Integration with ExerciseDB API with fallback support
 * Provides access to 11,000+ exercises with detailed information
 * 
 * Primary: RapidAPI (requires VITE_EXERCISEDB_RAPIDAPI_KEY)
 * Fallback: v2.exercisedb.dev (public API)
 */

const RAPIDAPI_BASE_URL = 'https://exercisedb-api1.p.rapidapi.com/api/v1';
const RAPIDAPI_HOST = 'exercisedb-api1.p.rapidapi.com';
const FALLBACK_BASE_URL = 'https://v2.exercisedb.dev';

// Get API key from environment variable, with fallback to provided key
const getApiKey = () => {
  // First try environment variable
  const envApiKey = import.meta.env.VITE_EXERCISEDB_RAPIDAPI_KEY;
  if (envApiKey) {
    return envApiKey;
  }
  
  // Fallback to provided API key
  return '19a9c82334msh8f9441d42ac9c20p1eb287jsnf6c9f6f8eb4b';
};

// Helper function to make RapidAPI requests
const makeRapidAPIRequest = async (endpoint, options = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('RapidAPI key not configured');
  }

  const url = `${RAPIDAPI_BASE_URL}${endpoint}`;
  const headers = {
    'x-rapidapi-host': RAPIDAPI_HOST,
    'x-rapidapi-key': apiKey,
    ...options.headers
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`RapidAPI error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// Helper function to make fallback API requests (v2.exercisedb.dev)
const makeFallbackRequest = async (endpoint, options = {}) => {
  const url = `${FALLBACK_BASE_URL}${endpoint}`;
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`Fallback API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// Main request function with fallback
const makeRequest = async (rapidAPIEndpoint, fallbackEndpoint, options = {}) => {
  // Always try RapidAPI first (we have a fallback key)
  try {
    const data = await makeRapidAPIRequest(rapidAPIEndpoint, options);
    return data;
  } catch (error) {
    console.warn('⚠️ RapidAPI request failed, trying fallback API:', error.message);
    
    // Fallback to v2.exercisedb.dev
    try {
      const data = await makeFallbackRequest(fallbackEndpoint, options);
      return data;
    } catch (fallbackError) {
      console.error('❌ Both API requests failed:', fallbackError.message);
      throw new Error(`ExerciseDB API error: Both RapidAPI and fallback API failed. ${fallbackError.message}`);
    }
  }
};

/**
 * Search exercises by name
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results (default: 20)
 * @returns {Promise<Array>} Array of exercise objects
 */
export async function searchExercises(query, limit = 20) {
  try {
    const rapidAPIEndpoint = `/exercises/search?search=${encodeURIComponent(query)}&limit=${limit}`;
    const fallbackEndpoint = `/exercises?name=${encodeURIComponent(query)}&limit=${limit}`;
    const data = await makeRequest(rapidAPIEndpoint, fallbackEndpoint);
    return Array.isArray(data) ? data : (data.data || []);
  } catch (error) {
    console.error('Error searching exercises:', error);
    throw error;
  }
}

/**
 * Get exercise by ID
 * @param {string} exerciseId - Exercise ID
 * @returns {Promise<Object>} Exercise object
 */
export async function getExerciseById(exerciseId) {
  try {
    const rapidAPIEndpoint = `/exercises/${exerciseId}`;
    const fallbackEndpoint = `/exercises/${exerciseId}`;
    return await makeRequest(rapidAPIEndpoint, fallbackEndpoint);
  } catch (error) {
    console.error('Error fetching exercise:', error);
    throw error;
  }
}

/**
 * Get exercises by body part
 * @param {string} bodyPart - Body part name (e.g., "CHEST", "BACK", "LEGS")
 * @param {number} limit - Maximum number of results (default: 20)
 * @returns {Promise<Array>} Array of exercise objects
 */
export async function getExercisesByBodyPart(bodyPart, limit = 20) {
  try {
    // Normalize body part name (uppercase)
    const normalizedBodyPart = bodyPart.toUpperCase();
    const rapidAPIEndpoint = `/exercises/bodyPart/${encodeURIComponent(normalizedBodyPart)}?limit=${limit}`;
    const fallbackEndpoint = `/exercises/bodyPart/${encodeURIComponent(normalizedBodyPart)}?limit=${limit}`;
    
    try {
      const data = await makeRequest(rapidAPIEndpoint, fallbackEndpoint);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      // Try with original case if uppercase fails
      if (error.message.includes('404') || error.message.includes('not found')) {
        const altRapidAPIEndpoint = `/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}`;
        const altFallbackEndpoint = `/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}`;
        const data = await makeRequest(altRapidAPIEndpoint, altFallbackEndpoint);
        return Array.isArray(data) ? data : (data.data || []);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching exercises by body part:', error);
    throw error;
  }
}

/**
 * Get exercises by equipment
 * @param {string} equipment - Equipment name (e.g., "DUMBBELL", "BARBELL", "BODYWEIGHT")
 * @param {number} limit - Maximum number of results (default: 20)
 * @returns {Promise<Array>} Array of exercise objects
 */
export async function getExercisesByEquipment(equipment, limit = 20) {
  try {
    // Normalize equipment name (uppercase)
    const normalizedEquipment = equipment.toUpperCase();
    const rapidAPIEndpoint = `/exercises/equipment/${encodeURIComponent(normalizedEquipment)}?limit=${limit}`;
    const fallbackEndpoint = `/exercises/equipment/${encodeURIComponent(normalizedEquipment)}?limit=${limit}`;
    
    try {
      const data = await makeRequest(rapidAPIEndpoint, fallbackEndpoint);
      return Array.isArray(data) ? data : (data.data || []);
    } catch (error) {
      // Try with original case if uppercase fails
      if (error.message.includes('404') || error.message.includes('not found')) {
        const altRapidAPIEndpoint = `/exercises/equipment/${encodeURIComponent(equipment)}?limit=${limit}`;
        const altFallbackEndpoint = `/exercises/equipment/${encodeURIComponent(equipment)}?limit=${limit}`;
        const data = await makeRequest(altRapidAPIEndpoint, altFallbackEndpoint);
        return Array.isArray(data) ? data : (data.data || []);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error fetching exercises by equipment:', error);
    throw error;
  }
}

/**
 * Get exercises by target muscle
 * @param {string} target - Target muscle name
 * @param {number} limit - Maximum number of results (default: 20)
 * @returns {Promise<Array>} Array of exercise objects
 */
export async function getExercisesByTarget(target, limit = 20) {
  try {
    const rapidAPIEndpoint = `/exercises/target/${encodeURIComponent(target)}?limit=${limit}`;
    const fallbackEndpoint = `/exercises/target/${encodeURIComponent(target)}?limit=${limit}`;
    const data = await makeRequest(rapidAPIEndpoint, fallbackEndpoint);
    return Array.isArray(data) ? data : (data.data || []);
  } catch (error) {
    console.error('Error fetching exercises by target:', error);
    throw error;
  }
}

/**
 * Get all available body parts (translated to Hebrew)
 * @returns {Promise<Array>} Array of body part names in Hebrew
 */
export async function getBodyParts() {
  try {
    const rapidAPIEndpoint = '/exercises/bodyPartList';
    const fallbackEndpoint = '/exercises/bodyPartList';
    const data = await makeRequest(rapidAPIEndpoint, fallbackEndpoint);
    const bodyParts = Array.isArray(data) ? data : (data.data || []);
    // Translate body parts to Hebrew
    return bodyParts.map(bp => translateBodyPart(bp)).filter(bp => bp);
  } catch (error) {
    console.error('Error fetching body parts:', error);
    throw error;
  }
}

/**
 * Get all available body parts in English (original)
 * @returns {Promise<Array>} Array of body part names in English
 */
export async function getBodyPartsEnglish() {
  try {
    const rapidAPIEndpoint = '/exercises/bodyPartList';
    const fallbackEndpoint = '/exercises/bodyPartList';
    const data = await makeRequest(rapidAPIEndpoint, fallbackEndpoint);
    return Array.isArray(data) ? data : (data.data || []);
  } catch (error) {
    console.error('Error fetching body parts:', error);
    throw error;
  }
}

/**
 * Get all available equipment types
 * @returns {Promise<Array>} Array of equipment names
 */
export async function getEquipmentList() {
  try {
    const rapidAPIEndpoint = '/exercises/equipmentList';
    const fallbackEndpoint = '/exercises/equipmentList';
    const data = await makeRequest(rapidAPIEndpoint, fallbackEndpoint);
    const equipment = Array.isArray(data) ? data : (data.data || []);
    // Translate equipment to Hebrew
    return equipment.map(eq => translateEquipment(eq)).filter(eq => eq);
  } catch (error) {
    console.error('Error fetching equipment list:', error);
    throw error;
  }
}

/**
 * Get all available equipment types in English (original) - for API calls
 * @returns {Promise<Array>} Array of equipment names in English
 */
export async function getEquipmentListEnglish() {
  try {
    const rapidAPIEndpoint = '/exercises/equipmentList';
    const fallbackEndpoint = '/exercises/equipmentList';
    const data = await makeRequest(rapidAPIEndpoint, fallbackEndpoint);
    return Array.isArray(data) ? data : (data.data || []);
  } catch (error) {
    console.error('Error fetching equipment list:', error);
    throw error;
  }
}

/**
 * Get all available target muscles
 * @returns {Promise<Array>} Array of target muscle names
 */
export async function getTargetList() {
  try {
    const endpoint = '/exercises/targetList';
    const data = await makeRequest(endpoint);
    return Array.isArray(data) ? data : (data.data || []);
  } catch (error) {
    console.error('Error fetching target list:', error);
    throw error;
  }
}

/**
 * Translation dictionaries for ExerciseDB data
 */
const bodyPartTranslations = {
  'CHEST': 'חזה',
  'BACK': 'גב',
  'LEGS': 'רגליים',
  'SHOULDERS': 'כתפיים',
  'ARMS': 'זרועות',
  'BICEPS': 'זרוע קדמית',
  'TRICEPS': 'זרוע אחורית',
  'FOREARMS': 'אמה',
  'CORE': 'ליבה',
  'ABS': 'בטן',
  'GLUTES': 'ישבן',
  'CALVES': 'שוקיים',
  'QUADRICEPS': 'רבע ראשי',
  'HAMSTRINGS': 'מיתר ברך',
  'LATS': 'רחב גבי',
  'TRAPS': 'דלתא',
  'CARDIO': 'קרדיו',
  'FULL BODY': 'גוף מלא',
  'NECK': 'צוואר',
  'ADDUCTORS': 'מקרבים',
  'ABDUCTORS': 'מרחיקים'
};

const equipmentTranslations = {
  'BODYWEIGHT': 'משקל גוף',
  'DUMBBELL': 'משקולות יד',
  'BARBELL': 'מוט',
  'KETTLEBELL': 'כדור משקולת',
  'MACHINE': 'מכונה',
  'CABLE': 'כבל',
  'RESISTANCE BAND': 'רצועת התנגדות',
  'MEDICINE BALL': 'כדור רפואי',
  'TRX': 'TRX',
  'BOX': 'קופסה',
  'PULL-UP BAR': 'מוט משיכה',
  'ROWER': 'חתירה',
  'BIKE': 'אופניים',
  'TREADMILL': 'הליכון',
  'SLED': 'מזחלת',
  'RINGS': 'טבעות',
  'E-Z BAR': 'מוט E-Z',
  'SMITH MACHINE': 'מכונת סמית',
  'LEVERAGE MACHINE': 'מכונת מנוף',
  'OLYMPIC BARBELL': 'מוט אולימפי',
  'BAND': 'רצועה',
  'ASSISTED': 'עזרה',
  'BOSU BALL': 'כדור בוסו',
  'STABILITY BALL': 'כדור יציבות'
};

const categoryTranslations = {
  'STRENGTH': 'כוח',
  'CARDIO': 'קרדיו',
  'STRETCHING': 'גמישות',
  'POWERLIFTING': 'כוח',
  'OLYMPIC_WEIGHTLIFTING': 'הרמת משקולות אולימפית',
  'STRONGMAN': 'כוח',
  'PLYOMETRICS': 'פונקציונלי',
  'MOBILITY': 'תנועתיות',
  'FUNCTIONAL': 'פונקציונלי'
};

/**
 * Translate body part to Hebrew
 */
function translateBodyPart(bodyPart) {
  if (!bodyPart) return '';
  const upper = bodyPart.toUpperCase().trim();
  return bodyPartTranslations[upper] || bodyPart;
}

/**
 * Translate equipment to Hebrew
 */
function translateEquipment(equipment) {
  if (!equipment) return 'משקל גוף';
  const upper = equipment.toUpperCase().trim();
  return equipmentTranslations[upper] || equipment;
}

/**
 * Translate category to Hebrew
 */
function translateCategory(category) {
  if (!category) return 'כוח';
  const upper = category.toUpperCase().trim();
  return categoryTranslations[upper] || category;
}

/**
 * Reverse translate Hebrew body part to English (for API calls)
 */
export function reverseTranslateBodyPart(hebrewBodyPart) {
  if (!hebrewBodyPart) return '';
  // Find the English key for this Hebrew value
  for (const [english, hebrew] of Object.entries(bodyPartTranslations)) {
    if (hebrew === hebrewBodyPart) {
      return english;
    }
  }
  // If not found, assume it's already in English
  return hebrewBodyPart.toUpperCase();
}

/**
 * Reverse translate Hebrew equipment to English (for API calls)
 */
export function reverseTranslateEquipment(hebrewEquipment) {
  if (!hebrewEquipment) return 'BODYWEIGHT';
  // Find the English key for this Hebrew value
  for (const [english, hebrew] of Object.entries(equipmentTranslations)) {
    if (hebrew === hebrewEquipment) {
      return english;
    }
  }
  // If not found, assume it's already in English
  return hebrewEquipment.toUpperCase();
}

/**
 * Translate exercise name to Hebrew (basic common exercises)
 */
function translateExerciseName(name) {
  if (!name) return '';
  
  // Common exercise name translations
  const exerciseNameTranslations = {
    'BENCH PRESS': 'לחיצת חזה',
    'SQUAT': 'סקוואט',
    'DEADLIFT': 'דדליפט',
    'OVERHEAD PRESS': 'לחיצה מעל הראש',
    'PULL-UP': 'משיכה',
    'PUSH-UP': 'שכיבות סמיכה',
    'DUMBBELL CURL': 'כפיפת זרוע עם משקולת',
    'TRICEPS DIP': 'דיפ לשריר התלת ראשי',
    'LUNGES': 'פסיעות',
    'PLANK': 'פלאנק',
    'CRUNCH': 'כפיפות בטן',
    'LEG PRESS': 'לחיצת רגליים',
    'LAT PULLDOWN': 'משיכה לרחב גבי',
    'SHOULDER PRESS': 'לחיצת כתפיים',
    'BICEP CURL': 'כפיפת זרוע',
    'TRICEP EXTENSION': 'פשיטת זרוע',
    'ROW': 'חתירה',
    'FLY': 'פליי',
    'RAISE': 'הרמה',
    'EXTENSION': 'פשיטה',
    'CURL': 'כפיפה',
    'PRESS': 'לחיצה',
    'PULL': 'משיכה',
    'DIP': 'דיפ',
    'SQUAT': 'סקוואט',
    'LUNGE': 'פסיעה'
  };
  
  const upper = name.toUpperCase();
  
  // Try exact match first
  if (exerciseNameTranslations[upper]) {
    return exerciseNameTranslations[upper];
  }
  
  // Try partial matches for compound names
  for (const [key, value] of Object.entries(exerciseNameTranslations)) {
    if (upper.includes(key)) {
      // Replace the English part with Hebrew
      return name.replace(new RegExp(key, 'gi'), value);
    }
  }
  
  // If no translation found, return original name
  return name;
}

/**
 * Translate text content (descriptions, instructions) to Hebrew
 * This is a placeholder - in production you might want to use an AI translation service
 */
function translateText(text) {
  if (!text || typeof text !== 'string') return text;
  
  // For now, return as-is since we'd need AI translation for full text
  // The user can manually translate or we can integrate with translation API later
  return text;
}

/**
 * Map ExerciseDB exercise format to ExerciseDefinition format
 * @param {Object} exercisedbExercise - Exercise from ExerciseDB API
 * @returns {Object} Exercise in ExerciseDefinition format
 */
export function mapExerciseDBToExerciseDefinition(exercisedbExercise) {
  // Map body parts - ExerciseDB uses arrays, we need to pick the primary one
  const primaryBodyPart = exercisedbExercise.bodyParts?.[0] || '';
  const translatedBodyPart = translateBodyPart(primaryBodyPart);
  
  // Map equipment - ExerciseDB uses arrays, we need to pick the primary one
  const primaryEquipment = exercisedbExercise.equipments?.[0] || '';
  const translatedEquipment = translateEquipment(primaryEquipment);
  
  // Map exercise type to category
  const categoryMap = {
    'STRENGTH': 'Strength',
    'CARDIO': 'Cardio',
    'STRETCHING': 'Mobility',
    'POWERLIFTING': 'Strength',
    'OLYMPIC_WEIGHTLIFTING': 'Olympic Weightlifting',
    'STRONGMAN': 'Strength',
    'PLYOMETRICS': 'Functional'
  };
  const category = categoryMap[exercisedbExercise.exerciseType] || 'Strength';
  const translatedCategory = translateCategory(category);
  
  // Translate exercise name
  const exerciseName = exercisedbExercise.name || '';
  const translatedName = translateExerciseName(exerciseName);
  
  // Build description from overview and instructions (keeping English for now, can be translated with AI)
  const descriptionParts = [];
  if (exercisedbExercise.overview) {
    descriptionParts.push(exercisedbExercise.overview);
  }
  if (exercisedbExercise.instructions && exercisedbExercise.instructions.length > 0) {
    descriptionParts.push('\n\nהוראות ביצוע:\n' + exercisedbExercise.instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n'));
  }
  if (exercisedbExercise.exerciseTips && exercisedbExercise.exerciseTips.length > 0) {
    descriptionParts.push('\n\nטיפים:\n' + exercisedbExercise.exerciseTips.map(tip => `• ${tip}`).join('\n'));
  }
  
  // Translate target muscles
  const translatedTargetMuscles = (exercisedbExercise.targetMuscles || []).map(muscle => translateBodyPart(muscle));
  const translatedSecondaryMuscles = (exercisedbExercise.secondaryMuscles || []).map(muscle => translateBodyPart(muscle));
  
  // Build video URL - ExerciseDB provides videoUrl which might be a filename
  // We'll construct the full URL if it's just a filename
  let videoUrl = '';
  if (exercisedbExercise.videoUrl) {
    if (exercisedbExercise.videoUrl.startsWith('http')) {
      videoUrl = exercisedbExercise.videoUrl;
    } else {
      // If it's just a filename, construct the full URL
      // ExerciseDB videos are typically hosted at v2.exercisedb.dev
      videoUrl = `https://v2.exercisedb.dev/videos/${exercisedbExercise.videoUrl}`;
    }
  }
  
  // Build image URL similarly
  let imageUrl = '';
  if (exercisedbExercise.imageUrl) {
    if (exercisedbExercise.imageUrl.startsWith('http')) {
      imageUrl = exercisedbExercise.imageUrl;
    } else {
      imageUrl = `https://v2.exercisedb.dev/images/${exercisedbExercise.imageUrl}`;
    }
  }
  
  // Map muscle groups - use the translated primary body part as muscle_group
  const muscleGroup = translatedBodyPart || 'גוף מלא';
  
  return {
    name_en: exerciseName,
    name_he: translatedName || exerciseName, // Use translated name, fallback to English
    muscle_group: muscleGroup,
    category: translatedCategory,
    equipment: translatedEquipment,
    description: descriptionParts.join(''),
    video_url: videoUrl,
    default_weight: 0,
    // Store ExerciseDB metadata for reference (in Hebrew)
    exercisedb_id: exercisedbExercise.exerciseId,
    exercisedb_image_url: imageUrl || exercisedbExercise.imageUrl,
    exercisedb_target_muscles: translatedTargetMuscles,
    exercisedb_secondary_muscles: translatedSecondaryMuscles,
    exercisedb_variations: exercisedbExercise.variations || [],
    exercisedb_related_exercises: exercisedbExercise.relatedExerciseIds || []
  };
}

/**
 * Batch map multiple ExerciseDB exercises
 * @param {Array} exercisedbExercises - Array of exercises from ExerciseDB API
 * @returns {Array} Array of exercises in ExerciseDefinition format
 */
export function mapExerciseDBArrayToExerciseDefinitions(exercisedbExercises) {
  return exercisedbExercises.map(mapExerciseDBToExerciseDefinition);
}

