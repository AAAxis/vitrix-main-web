import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebaseConfig';

// Helper function to convert Firestore data to plain objects
const convertFirestoreData = (doc) => {
  if (!doc.exists()) return null;
  const data = doc.data();
  const id = doc.id;
  
  // Convert Firestore Timestamps to ISO strings recursively
  const convertValue = (value) => {
    if (value instanceof Timestamp) {
      return value.toDate().toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      const converted = {};
      Object.keys(value).forEach(key => {
        converted[key] = convertValue(value[key]);
      });
      return converted;
    } else if (Array.isArray(value)) {
      return value.map(item => convertValue(item));
    }
    return value;
  };
  
  const converted = { id };
  Object.keys(data).forEach(key => {
    converted[key] = convertValue(data[key]);
  });
  
  return converted;
};

// Generic entity class that mimics Base44 entity API
class FirebaseEntity {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collectionRef = collection(db, collectionName);
  }

  // Get a single document by ID
  async get(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      return convertFirestoreData(docSnap);
    } catch (error) {
      console.error(`Error getting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Create a new document
  async create(data) {
    try {
      // Convert ISO date strings to Firestore Timestamps
      const convertedData = this.convertToFirestore(data);
      const docRef = await addDoc(this.collectionRef, convertedData);
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Bulk create documents
  async bulkCreate(dataArray) {
    try {
      const batch = writeBatch(db);
      const results = [];
      
      dataArray.forEach((data) => {
        const convertedData = this.convertToFirestore(data);
        const docRef = doc(this.collectionRef);
        batch.set(docRef, convertedData);
        results.push({ id: docRef.id, ...data });
      });
      
      await batch.commit();
      return results;
    } catch (error) {
      console.error(`Error bulk creating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Update a document
  async update(id, data) {
    try {
      const docRef = doc(db, this.collectionName, id);
      const convertedData = this.convertToFirestore(data);
      await updateDoc(docRef, convertedData);
      return { id, ...data };
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Delete a document
  async delete(id) {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
      return { id };
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      throw error;
    }
  }

  // List all documents (with optional ordering and limit)
  async list(orderByField = null, orderDirection = 'asc', limitCount = null) {
    try {
      let q = query(this.collectionRef);
      
      if (orderByField) {
        // Handle descending order (prefix with -)
        const direction = orderByField.startsWith('-') ? 'desc' : 'asc';
        const field = orderByField.startsWith('-') ? orderByField.slice(1) : orderByField;
        q = query(q, orderBy(field, direction));
      }
      
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => convertFirestoreData(doc));
    } catch (error) {
      console.error(`Error listing ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Filter documents (mimics Base44 filter API)
  async filter(filters = {}, orderByField = null, limitCount = null) {
    try {
      let q = query(this.collectionRef);
      
      // Apply filters
      Object.keys(filters).forEach(key => {
        q = query(q, where(key, '==', filters[key]));
      });
      
      // Apply ordering
      if (orderByField) {
        const direction = orderByField.startsWith('-') ? 'desc' : 'asc';
        const field = orderByField.startsWith('-') ? orderByField.slice(1) : orderByField;
        q = query(q, orderBy(field, direction));
      }
      
      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => convertFirestoreData(doc));
    } catch (error) {
      console.error(`Error filtering ${this.collectionName}:`, error);
      throw error;
    }
  }

  // Convert data to Firestore format (handle dates)
  convertToFirestore(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.convertToFirestore(item));
    }
    
    const converted = { ...data };
    Object.keys(converted).forEach(key => {
      const value = converted[key];
      
      // Convert ISO date strings to Firestore Timestamps
      if (typeof value === 'string' && this.isISODateString(value)) {
        converted[key] = Timestamp.fromDate(new Date(value));
      }
      // Handle nested objects
      else if (value && typeof value === 'object') {
        converted[key] = this.convertToFirestore(value);
      }
    });
    return converted;
  }

  // Check if a string is an ISO date string
  isISODateString(str) {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(str);
  }
}

// Create entity instances (matching Base44 entity names)
export const Workout = new FirebaseEntity('workouts');
export const WeightEntry = new FirebaseEntity('weightEntries');
export const ExerciseDefinition = new FirebaseEntity('exerciseDefinitions');
export const ProgressPicture = new FirebaseEntity('progressPictures');
export const Goal = new FirebaseEntity('goals');
export const Reminder = new FirebaseEntity('reminders');
export const CalorieTracking = new FirebaseEntity('calorieTracking');
export const WeeklyTask = new FirebaseEntity('weeklyTasks');
export const MonthlyGoal = new FirebaseEntity('monthlyGoals');
export const CoachMenu = new FirebaseEntity('coachMenus');
export const Recipe = new FirebaseEntity('recipes');
export const WeightReminder = new FirebaseEntity('weightReminders');
export const CoachMessage = new FirebaseEntity('coachMessages');
export const PreMadeWorkout = new FirebaseEntity('preMadeWorkouts');
export const WorkoutTemplate = new FirebaseEntity('workoutTemplates');
export const UserGroup = new FirebaseEntity('userGroups');
export const Invitation = new FirebaseEntity('invitations');
export const AdminActionLog = new FirebaseEntity('adminActionLogs');
export const WaterTracking = new FirebaseEntity('waterTracking');
export const WorkoutLog = new FirebaseEntity('workoutLogs');
export const Lecture = new FirebaseEntity('lectures');
export const LectureView = new FirebaseEntity('lectureViews');
export const FavoriteRecipe = new FirebaseEntity('favoriteRecipes');
export const CoachNotification = new FirebaseEntity('coachNotifications');
export const GroupWorkoutPlan = new FirebaseEntity('groupWorkoutPlans');
export const GroupReminder = new FirebaseEntity('groupReminders');
export const GroupMessage = new FirebaseEntity('groupMessages');
export const GroupEvent = new FirebaseEntity('groupEvents');
export const WeeklyCheckin = new FirebaseEntity('weeklyCheckins');
export const ExerciseDefault = new FirebaseEntity('exerciseDefaults');
export const NotificationResponse = new FirebaseEntity('notificationResponses');
export const GeneratedReport = new FirebaseEntity('generatedReports');
export const EventParticipation = new FirebaseEntity('eventParticipations');
export const MealTemplate = new FirebaseEntity('mealTemplates');
export const AdminMessage = new FirebaseEntity('adminMessages');
export const ContractContent = new FirebaseEntity('contractContents');
export const TerminationFeedback = new FirebaseEntity('terminationFeedbacks');
export const BoosterPlusTaskTemplate = new FirebaseEntity('boosterPlusTaskTemplates');
export const BoosterPlusTask = new FirebaseEntity('boosterPlusTasks');
export const WeeklyTaskTemplate = new FirebaseEntity('weeklyTaskTemplates');

