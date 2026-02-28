import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { useSelection } from '../contexts/SelectionContext';
import HeaderNav from '../components/HeaderNav';
import EquipmentItemRow from '../components/EquipmentItemRow';
import StatusModal from '../components/StatusModal';
import { bulkUpdateStatus, bulkUpdateCategory } from '../firebaseUtils';
import LoadingScreen from '../components/LoadingScreen';
import type { EquipmentItem } from '../types';
// ... (imports)
import './FilteredEquipmentPage.css';

type FilterConfig = {
  title: string;
  type: 'status' | 'date';
  statuses?: EquipmentItem['status'][];
  dateThreshold?: number;
};

// ... (filterMap remains the same)
const filterMap: { [key: string]: FilterConfig } = {
  broken: { title: 'פריטים לא כשירים', type: 'status', statuses: ['broken'] },
  repair: { title: 'פריטים בתיקון', type: 'status', statuses: ['repair'] },
  loaned: { title: 'פריטים מושאלים', type: 'status', statuses: ['loaned'] },
  validate: { title: 'דורש ווידוא', type: 'date', dateThreshold: 7 }
};

function FilteredEquipmentPage() {
  const { filterType } = useParams<{ filterType: string }>();
  const scopeId = `filter-${filterType || 'all'}`;
  const { equipment, isLoading, currentUser } = useDatabase();
  const { isOffline } = useOffline();
  const { isSelectionModeActive, getSelectedItems, toggleSelectionMode: globalToggleSelectionMode, toggleItemSelection, clearSelection } = useSelection();

  const isSelectionMode = isSelectionModeActive(scopeId);
  const selectedItemIds = getSelectedItems(scopeId);

  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [bulkAction, setBulkAction] = useState<'status' | 'category' | null>(null);
  const [tempSelection, setTempSelection] = useState('');

  const filterConfig = filterMap[filterType || ''] || { title: 'פריטים מסוננים', type: 'status', statuses: [] };

  const filteredItems = useMemo(() => {
    // ... (filtering logic remains the same)
    if (filterConfig.type === 'status' && filterConfig.statuses) {
      return equipment.filter(item => filterConfig.statuses!.includes(item.status));
    }
    if (filterConfig.type === 'date') {
      const today = new Date();
      return equipment.filter(item => {
        const itemDate = new Date(item.lastCheckDate);
        const days = item.validationDays ?? filterConfig.dateThreshold ?? 7;
        const thresholdDate = new Date(today);
        thresholdDate.setDate(thresholdDate.getDate() - days);
        return itemDate < thresholdDate && item.status === 'available' && item.managerUserId === currentUser?.uid;
      });
    }
    return [];
  }, [equipment, filterConfig, currentUser]);

  const handleBulkAction = async () => {
    if (selectedItemIds.size === 0) return;
    const ids = Array.from(selectedItemIds);
    let success = false;

    if (bulkAction === 'status') {
      success = await bulkUpdateStatus(ids, tempSelection as any);
    } else if (bulkAction === 'category') {
      success = await bulkUpdateCategory(ids, tempSelection || null);
    }

    if (success) {
      alert('הפעולה בוצעה בהצלחה');
      clearSelection(scopeId);
      globalToggleSelectionMode(scopeId);
      setBulkAction(null);
    }
  };

  if (isLoading) return <LoadingScreen message="טוען פריטים..." />;

  return (
    <div style={{ paddingBottom: isSelectionMode ? '160px' : '65px' }}>
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
              isSelectable={isSelectionMode}
              isSelected={selectedItemIds.has(item.id)}
              onToggle={() => toggleItemSelection(scopeId, item.id)}
              onClick={() => {
                if (isSelectionMode) {
                  toggleItemSelection(scopeId, item.id);
                } else {
                  setSelectedItem(item);
                }
              }}
              onLongPress={() => {
                if (!isSelectionMode) {
                  globalToggleSelectionMode(scopeId);
                  toggleItemSelection(scopeId, item.id);
                }
              }}
            />
          ))
        )}
      </div>

      {/* סלקשן בחירה - נסתר באופליין */}
      {isSelectionMode && !bulkAction && !isOffline && (
        <div className="bulk-actions-toolbar" style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          background: '#222', padding: '12px', borderRadius: '16px',
          width: '90%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 1000, border: '1px solid #444'
        }}>
          <span style={{ fontWeight: 'bold' }}>{selectedItemIds.size} נבחרו</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="bulk-btn" onClick={() => setBulkAction('status')}>סטטוס</button>
            <button className="bulk-btn" onClick={() => setBulkAction('category')}>קטגוריה</button>
            <button className="bulk-btn" style={{ background: '#444' }} onClick={() => globalToggleSelectionMode(scopeId)}>בטל</button>
          </div>
        </div>
      )}

      {bulkAction && (
        <div className="modal-overlay active">
          <div className="modal-container">
            <h3>{bulkAction === 'status' ? 'שינוי סטטוס' : 'שינוי קטגוריה'}</h3>
            <div style={{ margin: '20px 0' }}>
              {bulkAction === 'status' ? (
                <select className="form-select" value={tempSelection} onChange={e => setTempSelection(e.target.value)}>
                  <option value="">בחר סטטוס...</option>
                  <option value="available">זמין</option>
                  <option value="broken">תקול</option>
                  <option value="repair">בתיקון</option>
                  <option value="charging">בטעינה</option>
                </select>
              ) : (
                <input
                  type="text"
                  className="form-input"
                  placeholder="הקלד קטגוריה..."
                  value={tempSelection}
                  onChange={e => setTempSelection(e.target.value)}
                />
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setBulkAction(null)}>ביטול</button>
              <button className="btn-primary" onClick={handleBulkAction}>אישור</button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <StatusModal
          groupItems={[selectedItem]}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

export default FilteredEquipmentPage;