// src/pages/FilteredEquipmentPage.tsx
import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import HeaderNav from '../components/HeaderNav';
import EquipmentItemRow from '../components/EquipmentItemRow';
import StatusModal from '../components/StatusModal';
import type { EquipmentItem } from '../types';
import './FilteredEquipmentPage.css';

// --- 1. הרחבנו את הטיפוס של filterMap ---
type FilterConfig = {
  title: string;
  type: 'status' | 'date'; // הוספנו סוג סינון
  statuses?: EquipmentItem['status'][]; // אופציונלי
  dateThreshold?: number; // (בימים) אופציונלי
};

// --- 2. עדכנו את ה-filterMap ---
const filterMap: { [key: string]: FilterConfig } = {
  broken: {
    title: 'פריטים לא כשירים',
    type: 'status',
    statuses: ['broken']
  },
  repair: {
    title: 'פריטים בתיקון',
    type: 'status',
    statuses: ['repair']
  },
  loaned: {
    title: 'פריטים מושאלים',
    type: 'status',
    statuses: ['loaned']
  },
  // --- הוספת הסינון החדש ---
  validate: {
    title: 'דורש ווידוא',
    type: 'date',
    dateThreshold: 7 // פריטים שלא עודכנו ב-7 הימים האחרונים
  }
};
// --- סוף העדכון ---

function FilteredEquipmentPage() {
  const { filterType } = useParams<{ filterType: string }>();
  const { equipment, isLoading, currentUser } = useDatabase();
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);

  const filterConfig = filterMap[filterType || ''] || { title: 'פריטים מסוננים', type: 'status', statuses: [] };

  // --- 3. עדכון לוגיקת הסינון ---
  const filteredItems = useMemo(() => {
    if (filterConfig.type === 'status' && filterConfig.statuses) {
      // סינון לפי סטטוס (כמו קודם)
      return equipment.filter(item => filterConfig.statuses!.includes(item.status));
    }

    if (filterConfig.type === 'date' && filterConfig.dateThreshold) {
      // סינון לפי תאריך
      const today = new Date();
      // הגדר את סף התאריך (לפני X ימים)
      const thresholdDate = new Date(today.setDate(today.getDate() - filterConfig.dateThreshold));

      return equipment.filter(item => {
        const itemDate = new Date(item.lastCheckDate);
        // סינון לפי תאריך, סטטוס, והאם המשתמש המחובר הוא האחראי
        return (
          itemDate < thresholdDate &&
          item.status === 'available' &&
          item.managerUserId === currentUser?.uid
        );
      });
    }

    return []; // אם אין הגדרת סינון תקינה
  }, [equipment, filterConfig, currentUser]);
  // --- סוף העדכון ---

  if (isLoading) {
    return <div>טוען פריטים...</div>;
  }

  return (
    <div>
      <HeaderNav title={filterConfig.title} />

      <div className="equipment-list-container">
        {filteredItems.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
            לא נמצאו פריטים תואמים.
          </p>
        ) : (
          filteredItems.map(item => (
            <EquipmentItemRow
              key={item.id}
              item={item}
              onClick={() => setSelectedItem(item)}
            />
          ))
        )}
      </div>

      {/* רינדור מודאל הסטטוס */}
      {selectedItem && (
        <StatusModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

export default FilteredEquipmentPage;