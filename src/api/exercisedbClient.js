/**
 * ExerciseDB API Client
 * Integration with ExerciseDB API with fallback support
 * Provides access to 11,000+ exercises with detailed information
 * 
 * Primary: RapidAPI (requires VITE_EXERCISEDB_RAPIDAPI_KEY)
 * Fallback: v2.exercisedb.dev (public API)
 */

const RAPIDAPI_BASE_URL = 'https://exercisedb.p.rapidapi.com';
const RAPIDAPI_HOST = 'exercisedb.p.rapidapi.com';
const FALLBACK_BASE_URL = 'https://v2.exercisedb.dev';

// Get API key from environment variable, with fallback to provided key
const getApiKey = () => {
  // First try environment variable
  const envApiKey = import.meta.env.VITE_EXERCISEDB_RAPIDAPI_KEY;
  if (envApiKey) {
    return envApiKey;
  }

  // Fallback to provided API key (RapidAPI ExerciseDB API)
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
    const rapidAPIEndpoint = `/exercises/name/${encodeURIComponent(query)}?limit=${limit}`;
    const fallbackEndpoint = `/exercises?name=${encodeURIComponent(query)}&limit=${limit}`;
    const response = await makeRequest(rapidAPIEndpoint, fallbackEndpoint);

    // Handle RapidAPI response format: {success: true, data: [...]}
    if (response && response.success && Array.isArray(response.data)) {
      return response.data;
    }

    // Handle direct array or other formats
    return Array.isArray(response) ? response : (response.data || []);
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
      const response = await makeRequest(rapidAPIEndpoint, fallbackEndpoint);

      // Handle RapidAPI response format: {success: true, data: [...]}
      if (response && response.success && Array.isArray(response.data)) {
        return response.data;
      }

      // Handle direct array or other formats
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      // Try with original case if uppercase fails
      if (error.message.includes('404') || error.message.includes('not found')) {
        const altRapidAPIEndpoint = `/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}`;
        const altFallbackEndpoint = `/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}`;
        const altResponse = await makeRequest(altRapidAPIEndpoint, altFallbackEndpoint);

        if (altResponse && altResponse.success && Array.isArray(altResponse.data)) {
          return altResponse.data;
        }

        return Array.isArray(altResponse) ? altResponse : (altResponse.data || []);
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
      const response = await makeRequest(rapidAPIEndpoint, fallbackEndpoint);

      // Handle RapidAPI response format: {success: true, data: [...]}
      if (response && response.success && Array.isArray(response.data)) {
        return response.data;
      }

      // Handle direct array or other formats
      return Array.isArray(response) ? response : (response.data || []);
    } catch (error) {
      // Try with original case if uppercase fails
      if (error.message.includes('404') || error.message.includes('not found')) {
        const altRapidAPIEndpoint = `/exercises/equipment/${encodeURIComponent(equipment)}?limit=${limit}`;
        const altFallbackEndpoint = `/exercises/equipment/${encodeURIComponent(equipment)}?limit=${limit}`;
        const altResponse = await makeRequest(altRapidAPIEndpoint, altFallbackEndpoint);

        if (altResponse && altResponse.success && Array.isArray(altResponse.data)) {
          return altResponse.data;
        }

        return Array.isArray(altResponse) ? altResponse : (altResponse.data || []);
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
  // The bodyPartList endpoint doesn't exist in RapidAPI, so we return a hardcoded list
  // These are the common body parts from ExerciseDB
  const bodyPartsEnglish = [
    'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'BICEPS', 'TRICEPS',
    'FOREARMS', 'CORE', 'ABS', 'GLUTES', 'CALVES', 'QUADRICEPS',
    'HAMSTRINGS', 'LATS', 'TRAPS', 'CARDIO', 'FULL BODY', 'NECK',
    'ADDUCTORS', 'ABDUCTORS'
  ];

  // Translate to Hebrew
  return bodyPartsEnglish.map(bp => translateBodyPart(bp)).filter(bp => bp);
}

/**
 * Get all available body parts in English (original)
 * @returns {Promise<Array>} Array of body part names in English
 */
export async function getBodyPartsEnglish() {
  // The bodyPartList endpoint doesn't exist in RapidAPI, so we return a hardcoded list
  return [
    'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'BICEPS', 'TRICEPS',
    'FOREARMS', 'CORE', 'ABS', 'GLUTES', 'CALVES', 'QUADRICEPS',
    'HAMSTRINGS', 'LATS', 'TRAPS', 'CARDIO', 'FULL BODY', 'NECK',
    'ADDUCTORS', 'ABDUCTORS'
  ];
}

/**
 * Get all available equipment types
 * @returns {Promise<Array>} Array of equipment names
 */
export async function getEquipmentList() {
  // The equipmentList endpoint doesn't exist in RapidAPI, so we return a hardcoded list
  // These are the common equipment types from ExerciseDB
  const equipmentEnglish = [
    'BODYWEIGHT', 'DUMBBELL', 'BARBELL', 'KETTLEBELL', 'MACHINE',
    'CABLE', 'RESISTANCE BAND', 'MEDICINE BALL', 'TRX', 'BOX',
    'PULL-UP BAR', 'ROWER', 'BIKE', 'TREADMILL', 'SLED', 'RINGS',
    'E-Z BAR', 'SMITH MACHINE', 'LEVERAGE MACHINE', 'OLYMPIC BARBELL',
    'BAND', 'ASSISTED', 'BOSU BALL', 'STABILITY BALL'
  ];

  // Translate to Hebrew
  return equipmentEnglish.map(eq => translateEquipment(eq)).filter(eq => eq);
}

/**
 * Get all available equipment types in English (original) - for API calls
 * @returns {Promise<Array>} Array of equipment names in English
 */
export async function getEquipmentListEnglish() {
  // The equipmentList endpoint doesn't exist in RapidAPI, so we return a hardcoded list
  return [
    'BODYWEIGHT', 'DUMBBELL', 'BARBELL', 'KETTLEBELL', 'MACHINE',
    'CABLE', 'RESISTANCE BAND', 'MEDICINE BALL', 'TRX', 'BOX',
    'PULL-UP BAR', 'ROWER', 'BIKE', 'TREADMILL', 'SLED', 'RINGS',
    'E-Z BAR', 'SMITH MACHINE', 'LEVERAGE MACHINE', 'OLYMPIC BARBELL',
    'BAND', 'ASSISTED', 'BOSU BALL', 'STABILITY BALL'
  ];
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
  // Handle different API response formats
  // RapidAPI format: {exerciseId, name, imageUrl, ...}
  // v2.exercisedb.dev format: {id, name, bodyParts, equipments, ...}

  // Get exercise ID (different field names in different APIs; use ?? so 0 is preserved)
  const exerciseId = exercisedbExercise.exerciseId ?? exercisedbExercise.id ?? '';
  const exerciseIdStr = exerciseId !== '' && exerciseId != null ? String(exerciseId) : '';

  // Get exercise name
  const exerciseName = exercisedbExercise.name || '';
  const translatedName = translateExerciseName(exerciseName);

  // Get image URL - handle both cdn.exercisedb.dev and v2.exercisedb.dev formats
  let imageUrl = '';
  if (exercisedbExercise.imageUrl) {
    // RapidAPI returns full URLs like https://cdn.exercisedb.dev/images/...
    if (exercisedbExercise.imageUrl.startsWith('http')) {
      imageUrl = exercisedbExercise.imageUrl;
    } else {
      // Relative path, construct full URL
      imageUrl = `https://cdn.exercisedb.dev/images/${exercisedbExercise.imageUrl}`;
    }
  }
  // Also try legacy 'image' field
  if (!imageUrl && exercisedbExercise.image) {
    if (exercisedbExercise.image.startsWith('http')) {
      imageUrl = exercisedbExercise.image;
    } else {
      imageUrl = `https://v2.exercisedb.dev/images/${exercisedbExercise.image}`;
    }
  }

  // Get GIF URL - ExerciseDB often provides animated gifs; prefer for display
  let gifUrl = '';
  if (exercisedbExercise.gifUrl) {
    if (exercisedbExercise.gifUrl.startsWith('http')) {
      gifUrl = exercisedbExercise.gifUrl;
    } else {
      // Prefer CDN (same as images/videos) - often works better in web
      gifUrl = `https://cdn.exercisedb.dev/gifs/${exercisedbExercise.gifUrl}`;
    }
  }
  // Fallback: some APIs use different base for gifs
  if (!gifUrl && exercisedbExercise.gif) {
    if (exercisedbExercise.gif.startsWith('http')) {
      gifUrl = exercisedbExercise.gif;
    } else {
      gifUrl = `https://cdn.exercisedb.dev/gifs/${exercisedbExercise.gif}`;
    }
  }
  // Fallback: when API doesn't return gifUrl (e.g. RapidAPI list), use image endpoint (proxy on web adds key)
  if (!gifUrl && exerciseIdStr) {
    gifUrl = `https://exercisedb.p.rapidapi.com/image?exerciseId=${encodeURIComponent(exerciseIdStr)}&resolution=180`;
  }

  // Get video URL
  let videoUrl = '';
  if (exercisedbExercise.videoUrl) {
    if (exercisedbExercise.videoUrl.startsWith('http')) {
      videoUrl = exercisedbExercise.videoUrl;
    } else {
      // Construct full URL for relative paths
      videoUrl = `https://cdn.exercisedb.dev/videos/${exercisedbExercise.videoUrl}`;
    }
  }

  // Map body parts - ExerciseDB uses arrays, we need to pick the primary one
  const primaryBodyPart = (exercisedbExercise.bodyParts?.[0] || exercisedbExercise.bodyPart || '').toUpperCase();
  const translatedBodyPart = translateBodyPart(primaryBodyPart);

  // Map equipment - ExerciseDB uses arrays, we need to pick the primary one
  const primaryEquipment = (exercisedbExercise.equipments?.[0] || exercisedbExercise.equipment || 'BODYWEIGHT').toUpperCase();
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
  const exerciseType = (exercisedbExercise.exerciseType || exercisedbExercise.type || 'STRENGTH').toUpperCase();
  const category = categoryMap[exerciseType] || 'Strength';
  const translatedCategory = translateCategory(category);

  // Build description from available fields
  const descriptionParts = [];
  if (exercisedbExercise.overview) {
    descriptionParts.push(exercisedbExercise.overview);
  }
  if (exercisedbExercise.description) {
    descriptionParts.push(exercisedbExercise.description);
  }
  if (exercisedbExercise.instructions && Array.isArray(exercisedbExercise.instructions) && exercisedbExercise.instructions.length > 0) {
    descriptionParts.push('\n\nהוראות ביצוע:\n' + exercisedbExercise.instructions.map((inst, idx) => `${idx + 1}. ${inst}`).join('\n'));
  }
  if (exercisedbExercise.exerciseTips && Array.isArray(exercisedbExercise.exerciseTips) && exercisedbExercise.exerciseTips.length > 0) {
    descriptionParts.push('\n\nטיפים:\n' + exercisedbExercise.exerciseTips.map(tip => `• ${tip}`).join('\n'));
  }

  // Translate target muscles
  const targetMuscles = exercisedbExercise.targetMuscles || exercisedbExercise.target || [];
  const secondaryMuscles = exercisedbExercise.secondaryMuscles || exercisedbExercise.secondary || [];
  const translatedTargetMuscles = Array.isArray(targetMuscles) ? targetMuscles.map(muscle => translateBodyPart(muscle)) : [];
  const translatedSecondaryMuscles = Array.isArray(secondaryMuscles) ? secondaryMuscles.map(muscle => translateBodyPart(muscle)) : [];

  // Map muscle groups - use the translated primary body part as muscle_group
  const muscleGroup = translatedBodyPart || 'גוף מלא';

  return {
    name_en: exerciseName,
    name_he: translatedName || exerciseName, // Use translated name, fallback to English
    muscle_group: muscleGroup,
    category: translatedCategory,
    equipment: translatedEquipment,
    description: descriptionParts.join('') || exerciseName, // Fallback to name if no description
    video_url: videoUrl,
    default_weight: 0,
    // Store ExerciseDB metadata for reference
    exercisedb_id: exerciseIdStr || exerciseId,
    exercisedb_image_url: imageUrl,
    exercisedb_gif_url: gifUrl,
    exercisedb_target_muscles: translatedTargetMuscles,
    exercisedb_secondary_muscles: translatedSecondaryMuscles,
    exercisedb_variations: exercisedbExercise.variations || [],
    exercisedb_related_exercises: exercisedbExercise.relatedExerciseIds || exercisedbExercise.related || []
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

