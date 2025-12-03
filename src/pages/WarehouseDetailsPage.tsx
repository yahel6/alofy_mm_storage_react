// src/pages/WarehouseDetailsPage.tsx
import { useState, useMemo } from 'react'; // 1. הוספנו useState
import { useParams } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import HeaderNav from '../components/HeaderNav';
import EquipmentItemRow from '../components/EquipmentItemRow';
import FilterChips from '../components/FilterChips';
import StatusModal from '../components/StatusModal';
import WarehouseOptionsModal from '../components/WarehouseOptionsModal'; // 2. ייבוא המודאל החדש
import type { EquipmentItem } from '../types';

type FilterType = 'all' | 'validate' | 'broken' | 'loaned';

function WarehouseDetailsPage() {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const { warehouses, equipment, isLoading } = useDatabase();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  // 3. State לניהול המודאל החדש
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  const filteredItems = useMemo(() => {
    const itemsInWarehouse = equipment.filter(item => item.warehouseId === warehouseId);
    if (activeFilter === 'all') {
      return itemsInWarehouse;
    }
    
    const today = new Date();
    const validationThreshold = new Date(new Date().setDate(today.getDate() - 7));
    
    switch (activeFilter) {
      case 'validate': return itemsInWarehouse.filter(item => new Date(item.lastCheckDate) < validationThreshold && item.status === 'available');
      case 'broken': return itemsInWarehouse.filter(item => item.status === 'broken' || item.status === 'repair');
      case 'loaned': return itemsInWarehouse.filter(item => item.status === 'loaned');
      default: return itemsInWarehouse;
    }
  }, [equipment, warehouseId, activeFilter]); 

  if (isLoading) {
    return <div>טוען פרטי מחסן...</div>;
  }

  const warehouse = warehouses.find(w => w.id === warehouseId);

  if (!warehouse) {
    return <div><HeaderNav title="שגיאה" /><p style={{ textAlign: 'center' }}>מחסן לא נמצא.</p></div>;
  }

  return (
    <div>
      {/* 4. הוספת Prop לכותרת כדי להציג את כפתור 3 הנקודות */}
      <HeaderNav 
        title={warehouse.name} 
        onOptionsMenuClick={() => setIsOptionsModalOpen(true)}
      />
      
      <FilterChips onFilterChange={(filterId) => setActiveFilter(filterId as FilterType)} />
      
      <div className="equipment-list">
        {filteredItems.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
            {activeFilter === 'all' ? 'אין פריטים במחסן זה.' : 'לא נמצאו פריטים שתואמים לפילטר.'}
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

      {/* רינדור מודאל הסטטוס (כמו קודם) */}
      {selectedItem && (
        <StatusModal 
          item={selectedItem}
          onClose={() => setSelectedItem(null)} 
        />
      )}

      {/* 5. רינדור מותנה של המודאל החדש */}
      {isOptionsModalOpen && (
        <WarehouseOptionsModal
          warehouse={warehouse}
          onClose={() => setIsOptionsModalOpen(false)}
        />
      )}
    </div>
  );
}

export default WarehouseDetailsPage;