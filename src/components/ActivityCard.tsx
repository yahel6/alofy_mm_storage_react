// src/components/ActivityCard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import type { Activity } from '../types';
import './ActivityCard.css';

interface ActivityCardProps {
  activity: Activity;
}

const ActivityCard: React.FC<ActivityCardProps> = ({ activity }) => {
  const { users } = useDatabase();

  const manager = users.find(u => u.uid === activity.managerUserId);
  const date = new Date(activity.date).toLocaleDateString('he-IL', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  const total = activity.equipmentRequiredIds.length + activity.equipmentMissingIds.length;
  const available = activity.equipmentRequiredIds.length;

  const statusClass = (available < total) ? 'status-red' : 'status-green';
  const statusText = `${available}/${total} פריטים כשירים`;

  return (
    <Link to={`/activities/${activity.id}`} className="activity-card">
      <div className="activity-card-header">
        <div>
          <h3 className="activity-card-title">{activity.name}</h3>
          <div className="activity-card-date">עדכון אחרון: {date}</div>
          <div className="activity-card-person">אחראי: {manager?.displayName || '...'}</div>
        </div>
      </div>
      <div className="activity-card-footer">
        <div className={`activity-card-status ${statusClass}`}>
          {statusText} {available < total && <span className="status-dot"></span>}
        </div>
        {/* נחליף את הכפתור בטקסט פשוט, כי כל הכרטיס הוא לינק */}
        <span className="btn-action-dummy">נהל ציוד &rarr;</span>
      </div>
    </Link>
  );
};

export default ActivityCard;