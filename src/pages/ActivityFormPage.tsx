// src/pages/ActivityFormPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { useDialog } from '../contexts/DialogContext';
import { addNewActivity, updateActivity } from '../firebaseUtils';
import HeaderNav from '../components/HeaderNav';
import CustomSelect from '../components/CustomSelect';
import '../components/Form.css'; // שימוש חוזר בעיצוב הטופס
import type { Activity } from '../types';

// הגדרת טיפוס עבור שדות הטופס
// (בלי השדות שמחושבים אוטומטית)
type ActivityFormData = Omit<Activity, 'id' | 'equipmentRequiredIds' | 'equipmentMissingIds'>;

function ActivityFormPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { activities, users, isLoading, groups, currentUser } = useDatabase();
  const { isOffline } = useOffline();
  const { showAlert } = useDialog();

  useEffect(() => { if (isOffline) navigate(-1); }, [isOffline, navigate]);

  const isEditMode = !!activityId;

  const [formData, setFormData] = useState<ActivityFormData>({
    name: '',
    managerUserId: '',
    groupId: '',
    date: new Date().toISOString().split('T')[0], // ברירת מחדל להיום
  });

  // אפקט להגדרת מנהל ברירת מחדל
  useEffect(() => {
    if (!isEditMode && currentUser && !formData.managerUserId) {
      setFormData(prev => ({ ...prev, managerUserId: currentUser.uid }));
    }
  }, [isEditMode, currentUser]);

  // אפקט למילוי הטופס במצב עריכה
  useEffect(() => {
    if (isEditMode && activities.length > 0) {
      const activityToEdit = activities.find(act => act.id === activityId);
      if (activityToEdit) {
        // נמלא את הטופס עם כל השדות הרלוונטיים
        const { id, equipmentRequiredIds, equipmentMissingIds, ...editableData } = activityToEdit;
        setFormData(editableData);
      }
    }
  }, [isEditMode, activityId, activities]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ולידציה בסיסית
    if (!formData.name || !formData.managerUserId || !formData.date || !formData.groupId) {
      await showAlert("אנא מלא את כל השדות, כולל שיוך לקבוצה.", "שגיאה בטופס");
      return;
    }

    try {
      if (isEditMode && activityId) {
        // --- מצב עריכה ---
        const success = await updateActivity(activityId, formData);
        if (success) {
          navigate(`/activities/${activityId}`); // חזור לפרטי הפעילות
        } else {
          await showAlert("שגיאה בעדכון הפעילות.", "שגיאה");
        }
      } else {
        // --- מצב הוספה ---
        const newId = await addNewActivity(formData);
        if (newId) {
          navigate(`/activities/${newId}`); // חזור לפרטי הפעילות החדשה
        } else {
          await showAlert("שגיאה בהוספת הפעילות.", "שגיאה");
        }
      }
    } catch (error: any) {
      await showAlert(error.message || "אירעה שגיאה", "שגיאה");
    }
  };

  if (isLoading) {
    return <div>טוען נתונים...</div>;
  }

  const title = isEditMode ? 'עריכת פעילות' : 'הוסף פעילות חדשה';

  return (
    <div>
      <HeaderNav title={title} />
      <div className="container">
        <form id="add-activity-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">שם הפעילות</label>
            <input
              type="text"
              id="name"
              placeholder="לדוגמה: אימון בלשב"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="managerUserId">אחראי משימה</label>
            <CustomSelect
              value={formData.managerUserId || ''}
              onChange={(val) => handleChange({ target: { id: 'managerUserId', value: val } } as any)}
              options={[
                { value: "", label: "בחר אחראי..." },
                ...users.map(u => ({ value: u.uid, label: u.displayName || 'ללא שם' }))
              ]}
              placeholder="בחר אחראי..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="groupId">שיוך לקבוצה</label>
            <CustomSelect
              value={formData.groupId || ''}
              onChange={(val) => handleChange({ target: { id: 'groupId', value: val } } as any)}
              options={[
                { value: "", label: "בחר קבוצה..." },
                ...groups
                  .filter(g => g.members.includes(currentUser?.uid || ''))
                  .map(g => ({ value: g.id || '', label: g.name }))
              ]}
              placeholder="בחר קבוצה..."
            />
          </div>


          <button type="submit" className="btn-submit">
            {isEditMode ? 'שמור שינויים' : 'שמור פעילות'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ActivityFormPage;