// src/routes/AdminOnly.tsx
import React from 'react';
import { useDatabase } from '../contexts/DatabaseContext';

export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const { currentUser } = useDatabase();

  // בזמן שה-DatabaseContext עדיין לא קבע currentUser (null בתחילת טעינה)
  if (currentUser === null) {
    return <div style={{ padding: 24 }}>טוען נתוני משתמש...</div>;
  }

  // מחובר אבל עדיין לא מאושר? (במקרה ואתה רוצה לחסום גם כאן)
  if (currentUser.approved === false) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <h2>הבקשה שלך ממתינה לאישור</h2>
        <p>אדמין צריך לאשר את החשבון שלך לפני גישה לעמוד זה.</p>
      </div>
    );
  }

  // לא אדמין
  if (currentUser.role !== 'admin') {
    return <div style={{ padding: 24 }}>אין לך הרשאה לעמוד זה.</div>;
  }

  // אדמין מאושר
  return <>{children}</>;
}
