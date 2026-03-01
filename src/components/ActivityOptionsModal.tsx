// src/components/ActivityOptionsModal.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteActivity } from '../firebaseUtils';
import { useOffline } from '../contexts/OfflineContext';
import { useDialog } from '../contexts/DialogContext';
import type { Activity } from '../types';
import './Modal.css';

interface ActivityOptionsModalProps {
  activity: Activity;
  onClose: () => void;
}

// SVG Icons (מהקוד הישן)
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
);
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px" style={{ fill: 'var(--status-red)' }}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.12-2.12zM15.5 4l-.71-.71C14.12 3.12 13.88 3 13.5 3h-3c-.38 0-.71.12-.99.34L8.5 4H6v2h12V4z" /></svg>
);

const ActivityOptionsModal: React.FC<ActivityOptionsModalProps> = ({ activity, onClose }) => {
  const navigate = useNavigate();
  const { isOffline } = useOffline();
  const { showConfirm, showAlert } = useDialog();

  const handleEdit = () => {
    onClose();
    navigate(`/activities/edit/${activity.id}`); // ניווט לעמוד העריכה
  };

  const handleDelete = async () => {
    onClose();
    const confirmed = await showConfirm(`האם אתה בטוח שברצונך למחוק את הפעילות "${activity.name}"?`, 'מחיקת פעילות');
    if (confirmed) {
      try {
        await deleteActivity(activity.id);
        navigate('/activities'); // חזרה לרשימת הפעילויות
      } catch (error: any) {
        await showAlert('שגיאה במחיקת הפעילות', 'שגיאה');
      }
    }
  };

  return (
    // המודאל תמיד יקבל 'active' כשהוא מרונדר
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h4 className="modal-title">אפשרויות עבור: {activity.name}</h4>

        <div className="modal-options">
          {isOffline ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '12px 0' }}>
              ⚠️ במצב אופליין לא ניתן לבצע שינויים
            </div>
          ) : (
            <>
              <div onClick={handleEdit}>
                <EditIcon />
                ערוך פעילות
              </div>
              <div onClick={handleDelete} style={{ color: 'var(--status-red)' }}>
                <DeleteIcon />
                מחק פעילות
              </div>
            </>
          )}
        </div>

        <button className="modal-button btn-cancel" onClick={onClose}>
          ביטול
        </button>
      </div>
    </div>
  );
};

export default ActivityOptionsModal;