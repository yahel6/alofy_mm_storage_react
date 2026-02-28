// src/components/BottomNav.tsx
import { NavLink } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import './BottomNav.css'; // ייבוא העיצוב

// SVG Icons (העתקתי מה-HTML הישן שלך)
const HomeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z" /></svg>
);
const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
);
const WarehouseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM3 16.5c.83 0 1.5.67 1.5 1.5S3.83 19.5 3 19.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM20 6l-1.97-2H5.97L4 6H1v11h2.06c.05-.8.36-1.52.84-2.11-.8-.3-1.4-1.01-1.4-1.89 0-1.1.9-2 2-2s2 .9 2 2c0 .88-.6 1.59-1.4 1.89.48.59.79 1.31.84 2.11H17.5c.05-.8.36-1.52.84-2.11-.8-.3-1.4-1.01-1.4-1.89 0-1.1.9-2 2-2s2 .9 2 2c0 .88-.6 1.59-1.4 1.89.48.59.79 1.31.84 2.11H23V6h-3zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM5.14 8h13.72l.96-1H4.18l.96 1z" /></svg>
);
const CompetencesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
);
const AdminUsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm6 1c1.66 0 3-1.34 3-3s-1.34-3-3-3c-.36 0-.7.07-1.02.18.63.89 1.02 1.97 1.02 3.15s-.39 2.26-1.02 3.15c.32.11.66.18 1.02.18zm-12 0c.36 0 .7-.07 1.02-.18-.63-.89-1.02-1.97-1.02-3.15s.39-2.26 1.02-3.15C6.7 6.07 6.36 6 6 6c-1.66 0-3 1.34-3 3s1.34 3 3 3zm12 2c-2.33 0-7 1.17-7 3.5V21h14v-2.5c0-2.33-4.67-3.5-7-3.5zm-12 0c-2.33 0-7 1.17-7 3.5V21h8v-2.5c0-1.61.85-2.57 2.05-3.23C8.88 15.07 7.55 15 6 15z" /></svg>
);
const GroupsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" /></svg>
);


const BottomNav = () => {
  const { currentUser, groups, users } = useDatabase();

  // בדיקה אם המשתמש הוא בעלים או מנהל של לפחות קבוצה אחת
  const managedGroups = groups.filter(g =>
    currentUser && (g.ownerId === currentUser.uid || g.admins?.includes(currentUser.uid))
  );
  const isManager = managedGroups.length > 0;

  // בדיקה אם יש התראות (בקשות חדשות שלא נראו)
  const hasNotifications = managedGroups.some(group => {
    if (!group.pendingRequests || group.pendingRequests.length === 0) return false;

    const lastRequest = group.lastRequestTimestamp || "";
    const lastSeen = currentUser?.lastSeenRequests?.[group.id] || "";

    return lastRequest > lastSeen;
  });

  return (
    <nav className="bottom-nav">
      {/* NavLink הוא כמו 'a' tag, אבל הוא יודע אוטומטית 
        מתי להוסיף 'class="active"' 
      */}
      <NavLink to="/" className="nav-item" end>
        <HomeIcon />
        בית
      </NavLink>
      <NavLink to="/activities" className="nav-item">
        <ActivityIcon />
        פעילויות
      </NavLink>
      <NavLink to="/warehouses" className="nav-item">
        <WarehouseIcon />
        מחסן
      </NavLink>
      <NavLink to="/competences" className="nav-item">
        <CompetencesIcon />
        כשירויות
      </NavLink>
      {isManager && (
        <NavLink to="/groups" className="nav-item" style={{ position: 'relative' }}>
          <GroupsIcon />
          קבוצות
          {hasNotifications && (
            <div className="notification-badge" style={{
              position: 'absolute',
              top: '2px',
              right: '25%',
              background: 'var(--status-red)',
              color: 'white',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              boxShadow: '0 0 5px rgba(0,0,0,0.5)',
              border: '2px solid var(--card-bg-color)'
            }}>
              !
            </div>
          )}
        </NavLink>
      )}
      {currentUser?.role === 'admin' && (
        <NavLink to="/admin/users" className="nav-item" style={{ position: 'relative' }}>
          <AdminUsersIcon />
          משתמשים
          {users.some(u => !u.approved) && (
            <div className="notification-badge" style={{
              position: 'absolute',
              top: '2px',
              right: '25%',
              background: 'var(--status-red)',
              color: 'white',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              boxShadow: '0 0 5px rgba(0,0,0,0.5)',
              border: '2px solid var(--card-bg-color)'
            }}>
              !
            </div>
          )}
        </NavLink>
      )}

    </nav>
  );
};

export default BottomNav;