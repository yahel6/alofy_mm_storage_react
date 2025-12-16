// src/pages/HomePage.tsx
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import HeaderNav from '../components/HeaderNav';
import './HomePage.css';


// פונקציית עזר לפורמט תאריך (ללא שינוי)
const formatActivityDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return `היום, ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `מחר, ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: 'numeric' });
};

function HomePage() {
  const { currentUser, equipment, activities, isLoading } = useDatabase();
  const navigate = useNavigate();

  // --- 1. עדכון חישוב נתוני "דורש טיפול" ---
  const attentionItems = useMemo(() => {
    // הגדרת תאריך הסף לווידוא (לפני 7 ימים)
    const today = new Date();
    const validateThreshold = new Date(today.setDate(today.getDate() - 7));

    let broken = 0;
    let repair = 0;
    let loaned = 0;
    let needsValidation = 0;

    equipment.forEach(item => {
      // ספירת סטטוסים
      if (item.status === 'broken') broken++;
      if (item.status === 'repair') repair++;
      if (item.status === 'loaned') loaned++;

      // ספירת ווידוא (רק פריטים שהמשתמש אחראי עליהם)
      if (new Date(item.lastCheckDate) < validateThreshold &&
        item.status === 'available' &&
        item.managerUserId === currentUser?.uid) {
        needsValidation++;
      }
    });

    return [
      // --- הוספת השורה החדשה ---
      { id: 'validate', text: 'פריטים דורשי ווידוא', icon: '🗓️', iconClass: 'icon-orange', count: needsValidation, path: '/items/filter/validate' },
      // --- שאר השורות ---
      { id: 'broken', text: 'פריטים לא כשירים', icon: '!', iconClass: 'icon-red', count: broken, path: '/items/filter/broken' },
      { id: 'repair', text: 'פריטים בתיקון', icon: '🔧', iconClass: 'icon-orange', count: repair, path: '/items/filter/repair' },
      { id: 'loaned', text: 'השאלות שטרם הוחזרו', icon: '→', iconClass: 'icon-orange', count: loaned, path: '/items/filter/loaned' }
    ];
  }, [equipment]);
  // --- סוף העדכון ---

  // חישוב "פעילויות קרובות" (ללא שינוי)
  const upcomingActivities = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return activities
      .filter(act => new Date(act.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [activities]);

  const handleAttentionClick = (path: string) => {
    navigate(path);
  };

  if (isLoading && equipment.length === 0) {
    return (
      <div>
        <div className="page-header">
          <h1 className="main-title">שלום, {currentUser?.displayName || '...'}</h1>
          <div className="subtitle">טוען נתונים...</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <HeaderNav title={`שלום, ${currentUser?.displayName || '...'}`} />
      <div className="container">
        {/* --- כרטיס "דורש טיפול" --- */}
        <div className="dashboard-card" id="attention-card">
          <div className="card-header">
            <h2 className="card-title">דורש טיפול</h2>
          </div>
          <div className="card-content">
            {/* 2. הרשימה תרונדר אוטומטית עם הפריט החדש שנוסף */}
            {attentionItems.map(item => (
              <div
                key={item.id}
                className="attention-item"
                onClick={() => handleAttentionClick(item.path)}
              >
                <div className="attention-details">
                  <span className={`attention-icon ${item.iconClass}`}>{item.icon}</span>
                  <span className="attention-text">{item.text}</span>
                </div>
                <div className="attention-count">{item.count} <span className="chevron">&#9664;</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* --- כרטיס "פעילויות קרובות" (ללא שינוי) --- */}
        <div className="dashboard-card" id="upcoming-card">
          <div className="card-header">
            <h2 className="card-title">פעילויות קרובות</h2>
          </div>
          <div className="card-content">
            {upcomingActivities.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0' }}>
                אין פעילויות קרובות.
              </p>
            ) : (
              upcomingActivities.map(activity => {
                const total = activity.equipmentRequiredIds.length + activity.equipmentMissingIds.length;
                const available = activity.equipmentRequiredIds.length;
                const hasGaps = available < total;

                return (
                  <Link
                    to={`/activities/${activity.id}`}
                    key={activity.id}
                    className="activity-list-item"
                  >
                    <div className="activity-details">
                      <span className="activity-title">{activity.name}</span>
                      <span className="activity-time">{formatActivityDate(activity.date)}</span>
                    </div>
                    <div className={`activity-status ${hasGaps ? 'status-gaps' : 'status-ready'}`}>
                      {hasGaps ? (
                        <div>
                          <span><span>&times;</span> פערים קיימים</span>
                          <span className="status-subtitle">חסרים {total - available} פריטים</span>
                        </div>
                      ) : (
                        <span><span>&#10003;</span> מוכן ליציאה</span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
export default HomePage;