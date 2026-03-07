import { useState, useMemo } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import ActivityCard from '../components/ActivityCard'; // 1. ייבוא הכרטיס
import HeaderNav from '../components/HeaderNav';

function ActivitiesPage() {
  // 2. קבלת הפעילויות מה-Context
  const { activities, isLoading } = useDatabase();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredActivities = useMemo(() => {
    return activities
      .filter(act => act.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activities, searchTerm]);

  if (isLoading) {
    return <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>טוען פעילויות...</div>;
  }

  return (
    <div>
      <HeaderNav title="פעילויות" />
      <div className="container page-content">
        {/* חיפוש */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="חפש פעילות..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontSize: '1rem',
              outline: 'none',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--accent-color)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
          />
        </div>

        {/* 3. הצגת רשימת הפעילויות */}
        {filteredActivities.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
            {searchTerm ? 'לא נמצאו פעילויות התואמות את החיפוש.' : 'לא נוצרו עדיין פעילויות.'}
          </p>
        ) : (
          filteredActivities.map(activity => (
            <ActivityCard key={activity.id} activity={activity} />
          ))
        )}
      </div>
    </div>
  );
}
export default ActivitiesPage;