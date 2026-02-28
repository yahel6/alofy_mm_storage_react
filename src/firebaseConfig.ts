// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ייצוא השירותים כדי שנוכל להשתמש בהם בכל האפליקציה
export const auth = getAuth(app);
export const db = getFirestore(app);

// הפעלת מטמון אופליין (IndexedDB) - שומר את הנתונים לצפייה ללא אינטרנט
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // כמה טאבים פתוחים - persistence עובד רק בטאב אחד בו זמנית
    console.warn('Firestore persistence unavailable: multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    // הדפדפן לא תומך ב-IndexedDB
    console.warn('Firestore persistence not supported by this browser.');
  }
});