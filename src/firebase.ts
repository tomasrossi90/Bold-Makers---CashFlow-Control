import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromCache, getDocFromServer } from 'firebase/firestore';
import appletConfig from '../firebase-applet-config.json';

// Prioritize environment variables for dev/prod separation
// If VITE_FIREBASE_PROJECT_ID is set, we assume the user wants to use their own project
const isUsingCustomProject = !!import.meta.env.VITE_FIREBASE_PROJECT_ID;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || '(default)'
};

// Diagnostic logging (safe)
console.log("Firebase Init - Project:", firebaseConfig.projectId);
console.log("Firebase Init - Database:", firebaseConfig.firestoreDatabaseId);

if (import.meta.env.VITE_FIREBASE_PROJECT_ID && !import.meta.env.VITE_FIREBASE_API_KEY) {
  console.warn("⚠️ Has configurado VITE_FIREBASE_PROJECT_ID pero falta VITE_FIREBASE_API_KEY en los Secrets.");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection test to diagnose configuration issues
async function testConnection() {
  try {
    // Try to fetch a non-existent doc from server to test connectivity
    await getDocFromServer(doc(db, '_internal_', 'connectivity_test'));
    console.log("✅ Firebase connection established successfully.");
  } catch (error) {
    const err = error as any;
    if (err.message?.includes('the client is offline')) {
      console.error("❌ CRITICAL: Firebase configuration error. The client is offline.");
      console.error("Check if Project ID '" + firebaseConfig.projectId + "' matches Database ID '" + firebaseConfig.firestoreDatabaseId + "'.");
      console.error("Also ensure Firestore is enabled and the API Key is correct in your Secrets.");
    }
  }
}

testConnection();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
