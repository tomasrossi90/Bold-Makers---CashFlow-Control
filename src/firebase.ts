import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Prioritize environment variables for dev/prod separation
// Vite automatically loads .env.development or .env.production based on the mode
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID
};

// Fallback to firebase-applet-config.json if environment variables are not set
// (Useful for the AI Studio Build environment)
let finalConfig: any = firebaseConfig;

// We'll try to load the applet config if the API key is missing
if (!firebaseConfig.apiKey) {
  try {
    // We use a dynamic import to avoid errors if the file doesn't exist
    // and to keep it separate from the main bundle if not needed
    const appletConfig = await import('../firebase-applet-config.json');
    finalConfig = { ...appletConfig.default };
  } catch (e) {
    console.warn("No Firebase environment variables found and firebase-applet-config.json is missing.");
  }
}

const app = initializeApp(finalConfig);
export const db = getFirestore(app, finalConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
