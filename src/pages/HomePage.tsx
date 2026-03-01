// src/pages/HomePage.tsx
import { useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useTour } from '@reactour/tour';
import HeaderNav from '../components/HeaderNav';
import LoadingScreen from '../components/LoadingScreen';
import InstallPrompt from '../components/InstallPrompt';
import './HomePage.css';

const CompetencesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
);


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
  const { currentUser, equipment, activities, competences, competenceRecords, isLoading } = useDatabase();
  const navigate = useNavigate();
  const { setIsOpen } = useTour();

  useEffect(() => {
    if (currentUser) {
      const storageKey = `ordo_onboarding_shown_${currentUser.uid}`;
      const hasShown = localStorage.getItem(storageKey);

      if (!hasShown) {
        setIsOpen(true);
        localStorage.setItem(storageKey, 'true');
      }
    }
  }, [currentUser, setIsOpen]);

  // --- 1. עדכון חישוב נתוני "דורש טיפול" ---
  const attentionItems = useMemo(() => {
    // תאריך הסף יוערך פר פריט (לפי item.validationDays)
    const today = new Date();

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
      const validateThreshold = new Date(today);
      validateThreshold.setDate(validateThreshold.getDate() - (item.validationDays ?? 7));

      if (new Date(item.lastCheckDate) < validateThreshold &&
        item.status === 'available' &&
        item.managerUserId === currentUser?.uid) {
        needsValidation++;
      }
    });

    // --- חישוב כשירויות פגות/קרובות (צהוב ואדום) ---
    let competencesAlerts = 0;
    if (currentUser) {
      // סינון כשירויות רלוונטיות למשתמש
      const userCompetences = competences.filter(c =>
        c.userIds.includes(currentUser.uid) &&
        currentUser.groupIds?.includes(c.groupId)
      );

      userCompetences.forEach(comp => {
        const record = competenceRecords.find(r => r.competenceId === comp.id && r.userId === currentUser.uid);
        if (!record) {
          // אין רקורד = פג תוקף (אדום)
          competencesAlerts++;
        } else {
          const expDate = new Date(record.expirationDate);
          const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

          if (daysLeft <= 0) {
            // אדום
            competencesAlerts++;
          } else if (daysLeft <= 3) {
            // צהוב
            competencesAlerts++;
          }
        }
      });
    }

    const items = [
      // --- הוספת השורה החדשה לכשירויות (תופיע ראשונה) ---
      { id: 'competences', text: 'כשירויות', icon: <CompetencesIcon />, iconClass: 'icon-green', count: competencesAlerts, path: '/competences?tab=my', showBadge: competencesAlerts > 0 },
      // --- שאר השורות ---
      { id: 'validate', text: 'פריטים דורשי ווידוא', icon: '🗓️', iconClass: 'icon-orange', count: needsValidation, path: '/items/filter/validate' },
      { id: 'broken', text: 'פריטים לא כשירים', icon: '!', iconClass: 'icon-red', count: broken, path: '/items/filter/broken' },
      { id: 'repair', text: 'פריטים בתיקון', icon: '🔧', iconClass: 'icon-orange', count: repair, path: '/items/filter/repair' },
      { id: 'loaned', text: 'השאלות שטרם הוחזרו', icon: '→', iconClass: 'icon-orange', count: loaned, path: '/items/filter/loaned' }
    ];

    return items;
  }, [equipment, competences, competenceRecords, currentUser]);
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
    return <LoadingScreen message="טוען מערכת Ordo..." />;
  }

  return (
    <div>
      <HeaderNav title="Ordo" showBranding={true} />
      <div className="container">
        <div className="welcome-section">
          <h1 className="welcome-text">שלום, {currentUser?.displayName || '...'} 👋</h1>
          <p className="welcome-subtitle">הנה מה שקורה היום במחסן</p>
        </div>

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
                data-tour={item.id === 'validate' ? 'validate-alert' : item.id === 'competences' ? 'competences-alert' : undefined}
              >
                <div className="attention-details">
                  <span className={`attention-icon ${item.iconClass}`}>
                    {item.icon}
                  </span>
                  <span className="attention-text">{item.text}</span>
                </div>
                <div className="attention-count" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.showBadge && <span className="alert-badge">!</span>}
                  {item.count}
                  <span className="chevron">&#9664;</span>
                </div>
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

        <InstallPrompt />
      </div>
    </div>
  );
}
export default HomePage;