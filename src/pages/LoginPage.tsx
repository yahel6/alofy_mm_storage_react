// src/pages/LoginPage.tsx
import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, type User } from "firebase/auth";
import { auth } from '../firebaseConfig';
import { useDialog } from '../contexts/DialogContext';

import './LoginPage.css'; // 1. ייבוא קובץ העיצוב החדש

// 2. אייקון גוגל (מהקובץ הישן)
const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 18 18">
    <path d="M16.51 8.25H9v3.48h4.21c-.19 1.13-.86 2.08-1.9 2.72v2.26h2.92c1.71-1.57 2.69-3.89 2.69-6.46 0-.58-.05-1.15-.15-1.71z"></path>
    <path d="M9 16.5c2.42 0 4.45-.8 5.93-2.18l-2.92-2.26c-.8.54-1.83.86-2.99.86-2.3 0-4.25-1.55-4.94-3.64H1.03v2.33C2.5 14.93 5.48 16.5 9 16.5z"></path>
    <path d="M4.06 9.75c-.14-.42-.22-.88-.22-1.35s.08-.93.22-1.35V4.72H1.03C.37 5.96 0 7.39 0 9c0 1.61.37 3.04 1.03 4.28l3.03-2.33z"></path>
    <path d="M9 3.9c1.3 0 2.5.46 3.42 1.34l2.59-2.59C13.45.8 11.42 0 9 0 5.48 0 2.5 1.57 1.03 4.02l3.03 2.33C4.75 4.3 6.7 3.9 9 3.9z"></path>
  </svg>
);

function LoginPage() {
  // כל הלוגיקה נשארת זהה
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showAlert } = useDialog();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("שגיאה בהתחברות:", error);
      await showAlert("אירעה שגיאה בהתחברות. נסה שוב.");
    }
  };

  if (isLoading) {
    return <div>טוען נתונים...</div>;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  // 3. החלפת ה-HTML ב-JSX החדש
  return (
    <div className="login-page-container">

      {/* היהלום המסתובב */}
      <div className="diamond-container">
        <div className="diamond">
          <div className="face f1"></div>
          <div className="face f2"></div>
          <div className="face f3"></div>
          <div className="face f4"></div>
          <div className="face f5"></div>
          <div className="face f6"></div>
          <div className="face f7"></div>
          <div className="face f8"></div>
          <div className="face f9"></div>
          <div className="face f10"></div>
          <div className="face f11"></div>
          <div className="face f12"></div>
        </div>
      </div>

      {/* תוכן הלוגין */}
      <div className="login-content">
        <h1>מלאי אלופי</h1>
        <p>נא להתחבר כדי להמשיך</p>
        <button className="login-button" onClick={handleLogin}>
          <GoogleIcon />
          התחברות עם Google
        </button>
      </div>

    </div>
  );
}

export default LoginPage;