// src/pages/ActivitiesPage.tsx
import { useDatabase } from '../contexts/DatabaseContext';
import ActivityCard from '../components/ActivityCard'; // 1. ייבוא הכרטיס
import HeaderNav from '../components/HeaderNav';

function ActivitiesPage() {
  // 2. קבלת הפעילויות מה-Context
  const { activities, isLoading } = useDatabase();

  if (isLoading) {
    return <div>טוען פעילויות...</div>;
  }

  return (
    <div>
      <HeaderNav title="פעילויות" />
      <div className="container page-content">
        {/* 3. הצגת רשימת הפעילויות */}
        {activities.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
            לא נוצרו עדיין פעילויות.
          </p>
        ) : (
          [...activities]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(activity => (
              <ActivityCard key={activity.id} activity={activity} />
            ))
        )}
      </div>
    </div>
  );
}
export default ActivitiesPage;