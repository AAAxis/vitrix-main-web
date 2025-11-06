# Firebase Migration Guide

This project has been migrated from Base44 to Firebase. Follow these steps to complete the setup.

## Prerequisites

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable the following Firebase services:
   - **Authentication** (with Google provider enabled)
   - **Firestore Database**
   - **Storage**
   - **Cloud Functions** (optional, for server-side functions)

## Setup Steps

### 1. Configure Firebase

1. Go to Firebase Console > Project Settings > General
2. Scroll down to "Your apps" and click the web icon (`</>`)
3. Register your app and copy the Firebase configuration
4. Open `src/api/firebaseConfig.js` and replace the placeholder values:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 2. Enable Google Authentication

1. Go to Firebase Console > Authentication > Sign-in method
2. Enable "Google" as a sign-in provider
3. Add your authorized domains if needed

### 3. Set up Firestore Database

1. Go to Firebase Console > Firestore Database
2. Create a database (start in test mode for development)
3. Set up security rules (see Security Rules section below)

### 4. Set up Storage

1. Go to Firebase Console > Storage
2. Get started with default settings
3. Set up security rules (see Security Rules section below)

### 5. Security Rules

#### Firestore Rules

Add these rules to Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // All other collections - adjust based on your needs
    match /{collection}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**Note:** These are basic rules. You should customize them based on your security requirements.

#### Storage Rules

Add these rules to Storage > Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /uploads/{userId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /private/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 6. Cloud Functions (Optional)

If you need server-side functions (email sending, LLM, image generation, etc.):

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize functions: `firebase init functions`
4. Deploy your functions: `firebase deploy --only functions`

**Note:** The following functions need to be implemented:
- `sendEmail`
- `invokeLLM`
- `generateImage`
- `extractDataFromFile`
- `analyzeFoodImage`
- `impersonate`
- `updateRecipeImage`
- `importTaskTemplates`
- `exportTaskTemplates`
- `importBoosterPlusTaskTemplates`
- `exportBoosterPlusTaskTemplates`

### 7. Data Migration

You'll need to migrate your existing data from Base44 to Firebase:

1. Export data from Base44 (if possible)
2. Import data into Firestore collections
3. Update user documents to match the new schema

**Collection Names:**
- `users` - User accounts
- `workouts` - Workout data
- `weightEntries` - Weight tracking
- `exerciseDefinitions` - Exercise library
- `progressPictures` - Progress photos
- `goals` - User goals
- `reminders` - Reminders
- `calorieTracking` - Calorie tracking
- `weeklyTasks` - Weekly tasks
- `monthlyGoals` - Monthly goals
- `coachMenus` - Coach menus
- `recipes` - Recipes
- `weightReminders` - Weight reminders
- `coachMessages` - Coach messages
- `preMadeWorkouts` - Pre-made workouts
- `workoutTemplates` - Workout templates
- `userGroups` - User groups
- `invitations` - Invitations
- `adminActionLogs` - Admin action logs
- `waterTracking` - Water tracking
- `workoutLogs` - Workout logs
- `lectures` - Lectures
- `lectureViews` - Lecture views
- `favoriteRecipes` - Favorite recipes
- `coachNotifications` - Coach notifications
- `groupWorkoutPlans` - Group workout plans
- `groupReminders` - Group reminders
- `groupMessages` - Group messages
- `groupEvents` - Group events
- `weeklyCheckins` - Weekly check-ins
- `exerciseDefaults` - Exercise defaults
- `notificationResponses` - Notification responses
- `generatedReports` - Generated reports
- `eventParticipations` - Event participations
- `mealTemplates` - Meal templates
- `adminMessages` - Admin messages
- `contractContents` - Contract contents
- `terminationFeedbacks` - Termination feedbacks
- `boosterPlusTaskTemplates` - Booster Plus task templates
- `boosterPlusTasks` - Booster Plus tasks
- `weeklyTaskTemplates` - Weekly task templates

### 8. Remove Base44 Dependency

After confirming everything works:

```bash
npm uninstall @base44/sdk
```

## Key Differences from Base44

1. **Authentication**: Uses Firebase Auth with Google provider
2. **Database**: Uses Firestore instead of Base44's database
3. **Storage**: Uses Firebase Storage for file uploads
4. **Functions**: Uses Cloud Functions (requires setup)
5. **User IDs**: Firebase uses UIDs instead of Base44 IDs

## Testing

1. Test user login with Google
2. Test CRUD operations for all entities
3. Test file uploads
4. Test all features that were working with Base44

## Troubleshooting

### Authentication Issues
- Ensure Google provider is enabled in Firebase Console
- Check that authorized domains are configured correctly

### Firestore Issues
- Verify security rules allow the operations you're trying to perform
- Check that collections exist (they're created automatically on first write)

### Storage Issues
- Verify storage rules allow uploads
- Check that the storage bucket is configured correctly

### Function Issues
- Ensure Cloud Functions are deployed
- Check function logs in Firebase Console

## Support

For Firebase-specific issues, refer to:
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firebase Auth Documentation](https://firebase.google.com/docs/auth)

