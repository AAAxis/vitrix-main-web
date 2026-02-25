import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  getAdditionalUserInfo
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, getDocs, query, where, collection, orderBy, limit } from 'firebase/firestore';
import { auth, googleProvider, db } from './firebaseConfig';

// User entity class that mimics Base44 User API
class FirebaseUser {
  // Login with Google
  async login() {
    try {
      // Add custom parameters to Google provider
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const additionalInfo = getAdditionalUserInfo(result);
      
      // Check if user document exists in Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        // Create user document if it doesn't exist
        await setDoc(userDocRef, {
          email: user.email,
          name: user.displayName || '',
          photo_url: user.photoURL || '',
          role: 'trainee', // Default role
          status: 'active',
          created_at: new Date().toISOString(),
          contract_signed: false,
          // Add other default fields as needed
        });
      } else {
        // Update last login
        await updateDoc(userDocRef, {
          last_login: new Date().toISOString()
        });
      }
      
      return user;
    } catch (error) {
      console.error('Error during login:', error);
      
      // Handle specific error cases
      if (error.code === 'auth/popup-blocked') {
        throw new Error('החלון נחסם על ידי הדפדפן. אנא אפשר חלונות קופצים ונסה שוב.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('התהליך בוטל. אנא נסה שוב.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('בקשה קודמת עדיין מתבצעת. אנא המתן ונסה שוב.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('שגיאת רשת. אנא בדוק את החיבור לאינטרנט ונסה שוב.');
      } else if (error.code === 'auth/invalid-api-key') {
        throw new Error('שגיאת הגדרות מערכת. אנא פנה למנהל המערכת.');
      } else if (error.message?.includes('400')) {
        throw new Error('שגיאת אימות. אנא נסה להתחבר מחדש.');
      }
      
      throw error;
    }
  }

  // Get current user
  async me() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }
      
      // Try to get a fresh token - this will trigger token refresh if needed
      // If token refresh fails, it will throw an error
      try {
        await currentUser.getIdToken(true); // Force refresh
      } catch (tokenError) {
        console.error('Token refresh failed:', tokenError);
        
        // If token refresh fails with 400 or invalid token, sign out
        if (tokenError.code === 'auth/invalid-user-token' || 
            tokenError.code === 'auth/user-token-expired' ||
            tokenError.message?.includes('400') ||
            tokenError.message?.includes('Bad Request')) {
          console.warn('Invalid token detected, signing out...');
          await this.logout();
          throw new Error('Session expired. Please log in again.');
        }
        throw tokenError;
      }
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      
      // If document doesn't exist but user is authenticated, create it
      if (!userDoc.exists()) {
        console.warn('User document not found in Firestore, creating it...');
        try {
          await setDoc(userDocRef, {
            email: currentUser.email,
            name: currentUser.displayName || '',
            photo_url: currentUser.photoURL || '',
            role: 'trainee', // Default role
            status: 'active',
            created_at: new Date().toISOString(),
            contract_signed: false,
            // Add other default fields as needed
          });
          
          // Fetch the newly created document
          const newUserDoc = await getDoc(userDocRef);
          if (newUserDoc.exists()) {
            return {
              id: newUserDoc.id,
              uid: currentUser.uid,
              email: currentUser.email,
              ...newUserDoc.data()
            };
          }
        } catch (createError) {
          console.error('Error creating user document:', createError);
          throw new Error('Failed to create user document');
        }
      }
      
      return {
        id: userDoc.id,
        uid: currentUser.uid,
        email: currentUser.email,
        ...userDoc.data()
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      
      // If it's a token error, re-throw as a more user-friendly error
      if (error.message?.includes('Session expired') || 
          error.message?.includes('400') ||
          error.code === 'auth/invalid-user-token' ||
          error.code === 'auth/user-token-expired') {
        throw error;
      }
      
      throw error;
    }
  }

  // List all users
  async list() {
    try {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error listing users:', error);
      throw error;
    }
  }

  /**
   * List users scoped by role: system admin/coach see all; trainer sees only users they invited (coach_email match).
   * @param {Object} currentUser - { role, email }
   * @param {string} [orderByField] - e.g. '-created_date'
   * @returns {Promise<Array>} users
   */
  async listForStaff(currentUser, orderByField = null) {
    if (!currentUser?.email) return [];
    const isSystemAdmin = currentUser.role === 'admin' || currentUser.role === 'coach';
    if (isSystemAdmin) {
      return orderByField ? this.filter({}, orderByField) : this.list();
    }
    if (currentUser.role === 'trainer') {
      return this.filter({ coach_email: currentUser.email }, orderByField);
    }
    return [];
  }

  // Filter users (mimics FirebaseEntity filter API)
  async filter(filters = {}, orderByField = null, limitCount = null) {
    try {
      const usersRef = collection(db, 'users');
      let q = query(usersRef);
      
      // Known array fields that need array-contains
      const arrayFields = ['group_names'];
      
      // Apply filters
      Object.keys(filters).forEach(key => {
        const filterValue = filters[key];
        
        // Handle special operators like $in
        if (filterValue && typeof filterValue === 'object' && filterValue.$in) {
          // For array fields, use array-contains for single value or array-contains-any for multiple
          if (arrayFields.includes(key)) {
            if (filterValue.$in.length === 1) {
              q = query(q, where(key, 'array-contains', filterValue.$in[0]));
            } else {
              // For multiple values, we'd need array-contains-any, but Firestore has limitations
              // For now, filter client-side if needed, or use the first value
              q = query(q, where(key, 'array-contains', filterValue.$in[0]));
            }
          } else {
            // For non-array fields, use 'in' operator
            q = query(q, where(key, 'in', filterValue.$in));
          }
        } else {
          // Simple equality filter
          q = query(q, where(key, '==', filterValue));
        }
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
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error filtering users:', error);
      throw error;
    }
  }

  // Update user
  async update(userId, data) {
    try {
      const userDocRef = doc(db, 'users', userId);
      await updateDoc(userDocRef, {
        ...data,
        updated_at: new Date().toISOString()
      });
      return { id: userId, ...data };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // Update current user's own data
  async updateMyUserData(data) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No user logged in');
      }
      
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        ...data,
        updated_at: new Date().toISOString()
      });
      
      // Also update Firebase Auth profile if name or photo is being updated
      if (data.name || data.photo_url) {
        await updateProfile(currentUser, {
          displayName: data.name || currentUser.displayName,
          photoURL: data.photo_url || currentUser.photoURL
        });
      }
      
      return { id: currentUser.uid, ...data };
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }

  // Get auth state observer
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

export const User = new FirebaseUser();

