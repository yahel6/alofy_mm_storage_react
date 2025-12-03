// src/pages/EditActivityEquipmentPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { updateActivityEquipment } from '../firebaseUtils';
import HeaderNav from '../components/HeaderNav';
import EquipmentSelectItem from '../components/EquipmentSelectItem';
import './EditActivityEquipmentPage.css';
// import '../components/Form.css'; // אין צורך, העיצוב הועתק לקובץ ה-CSS המקומי

function EditActivityEquipmentPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { activities, equipment: allEquipment, isLoading } = useDatabase();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const activity = useMemo(() => {
    return activities.find(act => act.id === activityId);
  }, [activityId, activities]);

  useEffect(() => {
    if (activity) {
      const initialIds = [
        ...activity.equipmentRequiredIds, 
        ...activity.equipmentMissingIds
      ];
      setSelectedIds(new Set(initialIds));
    }
  }, [activity]);

  // --- 1. התיקון של החיפוש ---
  const filteredEquipment = useMemo(() => {
    if (searchTerm === '') {
      return allEquipment;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allEquipment.filter(item => 
      // נוודא ש-item.name קיים לפני שקוראים לו .toLowerCase()
      item.name && item.name.toLowerCase().includes(lowerSearchTerm)
    );
  }, [allEquipment, searchTerm]);
  // --- סוף התיקון ---

  const handleToggle = (itemId: string) => {
    setSelectedIds(prevIds => {
      const newIds = new Set(prevIds);
      if (newIds.has(itemId)) {
        newIds.delete(itemId);
      } else {
        newIds.add(itemId);
      }
      return newIds;
    });
  };

  const handleSave = async () => {
    if (!activityId) return;
    await updateActivityEquipment(activityId, Array.from(selectedIds), allEquipment);
    navigate(-1);
  };

  if (isLoading) {
    return <div>טוען נתונים...</div>;
  }
  
  const title = `עריכת ציוד (${activity?.name || '...'})`;

  return (
    <div className="page-content">
      <HeaderNav title={title} />
      
      <div className="search-filter-container">
        <div className="search-bar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px" style={{ fill: 'var(--text-secondary)', marginRight: '8px' }}>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input 
            type="text" 
            placeholder="חיפוש ציוד..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* --- 2. התיקון של הכפתור --- */}
      {/* הוספנו div עוטף עם הקלאס החדש מה-CSS */}
      <div className="equipment-list-container">
        {filteredEquipment.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
            לא נמצאו פריטים תואמים.
          </p>
        )}
        
        {filteredEquipment.map(item => {
          const isSelectable = (item.status === 'available' || item.status === 'charging');
          const isDisabled = !isSelectable && !selectedIds.has(item.id);

          return (
            <EquipmentSelectItem 
              key={item.id}
              item={item}
              isChecked={selectedIds.has(item.id)}
              isDisabled={isDisabled}
              onToggle={handleToggle}
            />
          );
        })}
      </div>
      {/* --- סוף התיקון --- */}

      {/* כפתור שמירה תחתון */}
      <div className="action-buttons-sticky">
        <button className="btn-submit" onClick={handleSave}>
          שמור שינויים
        </button>
      </div>
    </div>
  );
}

export default EditActivityEquipmentPage;