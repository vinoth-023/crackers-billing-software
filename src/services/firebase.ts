import { initializeApp, getApps, getApp, deleteApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'college-136ff.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://college-136ff.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'college-136ff',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'college-136ff.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.warn('Firebase initialization note:', error);
  // Fallback
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

export { app, db, auth };

/**
 * The app has its own local user/role system. Anonymous Firebase auth gives
 * each browser session a Firebase identity so Firestore rules can still
 * require request.auth without exposing the database publicly.
 */
export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutUser() { await signOut(auth); }

export async function provisionStaffAuth(email: string, password: string): Promise<string> {
  const temporaryApp = initializeApp(firebaseConfig, `staff-provision-${Date.now()}`);
  try { return (await createUserWithEmailAndPassword(getAuth(temporaryApp), email.trim(), password)).user.uid; }
  finally { await deleteApp(temporaryApp); }
}
