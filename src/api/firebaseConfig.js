import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';

// Firebase configuration from environment variables
// Vite uses import.meta.env for environment variables
// Variables must be prefixed with VITE_ to be exposed to the client

// Fallback values (Firebase API keys are safe to expose - they're public by design)
const FIREBASE_CONFIG_FALLBACK = {
  apiKey: "AIzaSyDamWmgBYUfXggdYAhIZskh8FylXftbstc",
  authDomain: "muscule-up.firebaseapp.com",
  projectId: "muscule-up",
  storageBucket: "muscule-up.firebasestorage.app",
  messagingSenderId: "320921048765",
  appId: "1:320921048765:web:b27768ea33413c1f4a89d4",
  measurementId: "G-MMTNLMECP0"
};

// Use environment variables if available, otherwise use fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || FIREBASE_CONFIG_FALLBACK.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || FIREBASE_CONFIG_FALLBACK.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || FIREBASE_CONFIG_FALLBACK.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || FIREBASE_CONFIG_FALLBACK.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || FIREBASE_CONFIG_FALLBACK.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || FIREBASE_CONFIG_FALLBACK.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || FIREBASE_CONFIG_FALLBACK.measurementId
};

// Log if using fallback (for debugging)
if (!import.meta.env.VITE_FIREBASE_API_KEY) {
  console.warn('⚠️ Using hardcoded Firebase config. Set VITE_FIREBASE_* environment variables for production.');
}

// Validate that we have a valid config (either from env vars or fallback)
// Since we have fallback values, we don't need to throw an error
// But we'll log a warning if using fallback in production
if (import.meta.env.PROD && !import.meta.env.VITE_FIREBASE_API_KEY) {
  console.warn(
    '⚠️ Firebase config: Using hardcoded values in production. ' +
    'Consider setting VITE_FIREBASE_* environment variables in Vercel Dashboard for better security.'
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);

// Configure auth settings to handle token refresh better
auth.settings.appVerificationDisabledForTesting = false;

// Add global error handler for Firebase token refresh failures
if (typeof window !== 'undefined') {
  // Listen for unhandled promise rejections (like Firebase token refresh failures)
  const errorHandler = (event) => {
    const error = event.reason;
    const errorMessage = error?.message || String(error) || '';
    const errorCode = error?.code || '';
    const errorUrl = error?.url || '';
    
    // Check if it's a Firebase token refresh error (400 Bad Request)
    const isTokenError = errorMessage.includes('securetoken.googleapis.com') || 
        errorMessage.includes('400') ||
        errorMessage.includes('Bad Request') ||
        errorUrl.includes('securetoken.googleapis.com') ||
        errorCode === 'auth/invalid-user-token' ||
        errorCode === 'auth/user-token-expired';
    
    if (isTokenError) {
      console.warn('⚠️ Firebase token refresh failed - clearing invalid session');
      // Clear the invalid session
      signOut(auth).catch(console.error);
      // Clear all Firebase auth state from localStorage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('firebase:authUser:') || key.includes('firebase')) {
          localStorage.removeItem(key);
        }
      });
      // Clear sessionStorage as well
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('firebase:') || key.includes('firebase')) {
          sessionStorage.removeItem(key);
        }
      });
      // Prevent the error from being logged to console
      event.preventDefault();
    }
  };
  
  window.addEventListener('unhandledrejection', errorHandler);
  
  // Also listen for console errors that might indicate token issues
  const originalError = console.error;
  console.error = function(...args) {
    const errorString = args.join(' ');
    if (errorString.includes('securetoken.googleapis.com') && 
        (errorString.includes('400') || errorString.includes('Bad Request'))) {
      // Trigger the error handler
      errorHandler({ reason: { message: errorString, url: 'securetoken.googleapis.com' }, preventDefault: () => {} });
    }
    originalError.apply(console, args);
  };
}
export const db = getFirestore(app);
export const storage = getStorage(app);
// Initialize Functions with region (us-central1 is default, but specify explicitly)
export const functions = getFunctions(app, 'us-central1');

// Initialize Remote Config
export const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
remoteConfig.defaultConfig = {
  openai_api_key: ''
};

// Configure Google Auth Provider
export const googleProvider = new GoogleAuthProvider();

export default app;

