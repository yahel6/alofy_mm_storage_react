import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '../firebaseConfig'; // מייבאים את משתנה האימות
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Navigate } from 'react-router-dom'; // זה כלי ה"זריקה" (redirect)
import LoadingScreen from './LoadingScreen';

// הרכיב הזה מקבל "ילדים" (children)
// הילדים האלה יהיו כל האפליקציה שלנו
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // state שיחזיק את המשתמש
  const [user, setUser] = useState<User | null>(null);
  const [approved, setApproved] = useState<boolean | null>(null);

  // state שיגיד לנו אם סיימנו לבדוק
  const [isLoading, setIsLoading] = useState(true);

  // ה-Hook הזה רץ פעם אחת כשהרכיב עולה
  useEffect(() => {
    // זו אותה פונקציה בדיוק כמו ב-java.js!
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // משתמש לא מחובר
        setUser(null);
        setApproved(null);
        setIsLoading(false);
        return;
      }
      // משתמש מחובר
      setUser(user);
      // קרא את הסטטוס
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() && navigator.onLine) {
        // Guard: only create the pending record when online.
        // If offline, IndexedDB cache may already have it; if not, it will be
        // created the next time the app loads with a network connection.
        // Creating it while offline would queue a write that fires on reconnect
        // and could overwrite an already-approved role with 'pending'.
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid, email: user.email ?? null, displayName: user.displayName ?? '',
          role: 'pending', approved: false
        });
        setApproved(false);
      }

      // סיימנו לבדוק
      setIsLoading(false);
    });

    // פונקציית ניקוי
    return () => unsubscribe();
  }, []); // [] ריק = תריץ רק פעם אחת

  // 1. אם אנחנו עדיין בודקים, נציג הודעת טעינה
  if (isLoading) {
    return <LoadingScreen message="מאמת נתוני משתמש..." />;
  }

  // 2. אם סיימנו לבדוק *ואין* משתמש
  if (!user) {
    // 3. אם סיימנו לבדוק *ואין* משתמש
    // ...אז "תזרוק" אותו לעמוד הלוגין
    // (ה-replace מונע מהמשתמש ללחוץ "אחורה" בדפדפן ולחזור לאפליקציה)
    return <Navigate to="/login" replace />;
  }

  if (approved === false) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h2>הבקשה שלך ממתינה לאישור</h2>
        <p>פנה לאדמין כדי לאשר את החשבון.</p>
      </div>
    );
  }

  // ...אז תציג את הילדים (שזה יהיה <App />)
  return children;
};

export default ProtectedRoute;