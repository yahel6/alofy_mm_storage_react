// src/pages/WarehouseDetailsPage.tsx
import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import HeaderNav from '../components/HeaderNav';
import EquipmentItemRow from '../components/EquipmentItemRow';
import FilterChips from '../components/FilterChips';
import StatusModal from '../components/StatusModal';
import WarehouseOptionsModal from '../components/WarehouseOptionsModal';
import SubItemsModal from '../components/SubItemsModal';
import {
  bulkUpdateCategory,
  bulkValidateItems,
  bulkUpdateStatus,
  bulkMoveItemsToWarehouse,
  bulkAssignItemsToActivity
} from '../firebaseUtils';
import type { EquipmentItem } from '../types';
import '../components/Modal.css'; // Import generic modal styles

type FilterType = 'all' | 'validate' | 'broken' | 'loaned';

function WarehouseDetailsPage() {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const { warehouses, equipment, users, activities, isLoading } = useDatabase();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [subItemsModalItem, setSubItemsModalItem] = useState<EquipmentItem | null>(null);

  // Bulk Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Grouping State
  const [isGroupedByCategory, setIsGroupedByCategory] = useState(false);

  // Compact Mode State
  const [isCompactMode, setIsCompactMode] = useState(false);

  // Bulk Action Modals State
  const [bulkAction, setBulkAction] = useState<'status' | 'move' | 'activity' | 'category' | null>(null);
  const [tempSelection, setTempSelection] = useState<string>(''); // For storing the selected Status/WarehouseId/ActivityId

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedItemIds(new Set());
    setBulkAction(null);
    setTempSelection('');
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const executeBulkAction = async () => {
    if (selectedItemIds.size === 0) return;
    const ids = Array.from(selectedItemIds);
    let success = false;

    try {
      if (bulkAction === 'category') {
        success = await bulkUpdateCategory(ids, tempSelection || null);
      } else if (bulkAction === 'status') {
        success = await bulkUpdateStatus(ids, tempSelection as any);
      } else if (bulkAction === 'move') {
        success = await bulkMoveItemsToWarehouse(ids, tempSelection);
      } else if (bulkAction === 'activity') {
        success = await bulkAssignItemsToActivity(ids, tempSelection);
      }
    } catch (err) {
      console.error("Error in executeBulkAction:", err);
      success = false;
    }

    if (success) {
      alert('הפעולה בוצעה בהצלחה');
      // Reset
      setIsSelectionMode(false);
      setSelectedItemIds(new Set());
      setBulkAction(null);
      setTempSelection('');
    } else {
      alert('אירעה שגיאה בביצוע הפעולה');
    }
  };

  const handleBulkValidate = async () => {
    if (window.confirm(`האם לוודא תקינות ל-${selectedItemIds.size} פריטים?`)) {
      await bulkValidateItems(Array.from(selectedItemIds));
      alert('הפריטים אומתו בהצלחה (תאריך בדיקה עודכן להיום).');
      setIsSelectionMode(false);
      setSelectedItemIds(new Set());
    }
  };

  const filteredItems = useMemo(() => {
    let items = equipment.filter(item => item.warehouseId === warehouseId);

    if (activeFilter !== 'all') {
      const today = new Date();
      const validationThreshold = new Date(new Date().setDate(today.getDate() - 7));

      switch (activeFilter) {
        case 'validate':
          items = items.filter(item => new Date(item.lastCheckDate) < validationThreshold && item.status === 'available');
          break;
        case 'broken':
          items = items.filter(item => item.status === 'broken' || item.status === 'repair');
          break;
        case 'loaned':
          items = items.filter(item => item.status === 'loaned');
          break;
      }
    }

    if (categoryFilter) {
      items = items.filter(item => item.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        const matchesName = item.name.toLowerCase().includes(query);
        const owner = users.find(u => u.uid === item.managerUserId);
        const ownerName = owner ? (owner.displayName || owner.email || '') : '';
        const matchesOwner = ownerName.toLowerCase().includes(query);
        return matchesName || matchesOwner;
      });
    }
    return items;
  }, [equipment, users, warehouseId, activeFilter, categoryFilter, searchQuery]);

  // Group items by category if enabled
  const groupedItems = useMemo(() => {
    if (!isGroupedByCategory) return null;

    const groups: { [key: string]: EquipmentItem[] } = {};
    filteredItems.forEach(item => {
      const cat = item.category || 'ללא קטגוריה';
      if (!groups[cat]) {
        groups[cat] = [];
      }
      groups[cat].push(item);
    });

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredItems, isGroupedByCategory]);

  if (isLoading) {
    return <div>טוען פרטי מחסן...</div>;
  }

  const warehouse = warehouses.find(w => w.id === warehouseId);
  const otherWarehouses = warehouses.filter(w => w.id !== warehouseId);

  if (!warehouse) {
    return <div><HeaderNav title="שגיאה" /><p style={{ textAlign: 'center' }}>מחסן לא נמצא.</p></div>;
  }

  // Helper render for the action modal content
  const renderBulkActionModal = () => {
    if (!bulkAction) return null;

    let title = '';
    let content = null;

    if (bulkAction === 'category') {
      title = 'עדכון קטגוריה';
      content = (
        <select className="form-select" value={tempSelection} onChange={e => setTempSelection(e.target.value)}>
          <option value="">בחר קטגוריה...</option>
          {warehouse.categories?.map(c => <option key={c} value={c}>{c}</option>)}
          <option value="">(ללא קטגוריה)</option>
        </select>
      );
    } else if (bulkAction === 'status') {
      title = 'שינוי סטטוס';
      content = (
        <select className="form-select" value={tempSelection} onChange={e => setTempSelection(e.target.value)}>
          <option value="">בחר סטטוס...</option>
          <option value="available">זמין</option>
          <option value="charging">בטעינה</option>
          <option value="broken">תקול</option>
          <option value="repair">בתיקון</option>
          <option value="loaned">בפעילות</option>
        </select>
      );
    } else if (bulkAction === 'move') {
      title = 'העברה למחסן אחר';
      content = (
        <select className="form-select" value={tempSelection} onChange={e => setTempSelection(e.target.value)}>
          <option value="">בחר מחסן יעד...</option>
          {otherWarehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      );
    } else if (bulkAction === 'activity') {
      title = 'שיוך לפעילות';
      content = (
        <select className="form-select" value={tempSelection} onChange={e => setTempSelection(e.target.value)}>
          <option value="">בחר פעילות...</option>
          {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      );
    }

    return (
      <div className="modal-overlay active" onClick={() => setBulkAction(null)}>
        <div className="modal-container" onClick={e => e.stopPropagation()}>
          <h3 className="modal-title">{title}</h3>
          <div style={{ margin: '20px 0' }}>
            {content}
          </div>
          <div className="modal-actions" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px' }} onClick={() => setBulkAction(null)}>ביטול</button>
            <button className="btn-primary" style={{ padding: '8px 16px', margin: 0, width: 'auto' }} disabled={!tempSelection && bulkAction !== 'category'} onClick={executeBulkAction}>אישור</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <HeaderNav
        title={warehouse.name}
        onOptionsMenuClick={() => setIsOptionsModalOpen(true)}
      />

      <FilterChips onFilterChange={(filterId) => setActiveFilter(filterId as FilterType)} />

      <div style={{ padding: '0 16px 16px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="חפש פריט או שם אחראי..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #444',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            minWidth: '200px'
          }}
        />

        {warehouse?.categories && warehouse.categories.length > 0 && (
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #444',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              minWidth: '120px'
            }}
          >
            <option value="">כל הקטגוריות</option>
            {warehouse.categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        )}

        <button
          onClick={() => setIsGroupedByCategory(!isGroupedByCategory)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: isGroupedByCategory ? '2px solid var(--action-color)' : '1px solid #444',
            background: isGroupedByCategory ? 'rgba(var(--action-color-rgb), 0.1)' : 'var(--bg-secondary)',
            color: isGroupedByCategory ? 'var(--action-color)' : 'var(--text-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {isGroupedByCategory ? 'בטל מיון' : 'מיין'}
        </button>

        <button
          onClick={() => setIsCompactMode(!isCompactMode)}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: isCompactMode ? '2px solid var(--action-color)' : '1px solid #444',
            background: isCompactMode ? 'rgba(var(--action-color-rgb), 0.1)' : 'var(--bg-secondary)',
            color: isCompactMode ? 'var(--action-color)' : 'var(--text-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {isCompactMode ? 'תצוגה רחבה' : 'תצוגה דחוסה'}
        </button>

        <button
          onClick={toggleSelectionMode}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: isSelectionMode ? '2px solid var(--action-color)' : '1px solid #444',
            background: isSelectionMode ? 'rgba(var(--action-color-rgb), 0.1)' : 'var(--bg-secondary)',
            color: isSelectionMode ? 'var(--action-color)' : 'var(--text-primary)',
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {isSelectionMode ? 'בטל בחירה' : 'בחר'}
        </button>
      </div>

      {/* --- BULK ACTIONS TOOLBAR --- */}
      {isSelectionMode && !bulkAction && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#222', padding: '12px', borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.6)', zIndex: 1000,
          width: '94%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '10px',
          border: '1px solid #444'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold' }}>{selectedItemIds.size} נבחרו</span>
            <span style={{ fontSize: '12px', color: '#888' }}>בחר פעולה:</span>
          </div>

          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button className="bulk-btn" onClick={handleBulkValidate}>✅ ווידוא</button>
            <button className="bulk-btn" onClick={() => { setTempSelection(''); setBulkAction('status'); }}>🔄 סטטוס</button>
            <button className="bulk-btn" onClick={() => { setTempSelection(''); setBulkAction('category'); }}>🏷️ קטגוריה</button>
            <button className="bulk-btn" onClick={() => { setTempSelection(''); setBulkAction('move'); }}>📦 העברה</button>
            <button className="bulk-btn" onClick={() => { setTempSelection(''); setBulkAction('activity'); }}>📌 לפעילות</button>
          </div>
        </div>
      )}

      {/* Styles for bulk buttons - inline for simplicity or move to CSS */}
      <style>{`
        .bulk-btn {
            background: #444; color: white; border: none; padding: 8px 12px;
            border-radius: 8px; font-size: 13px; white-space: nowrap; cursor: pointer;
            flex-shrink: 0;
        }
        .bulk-btn:active { transform: scale(0.95); }
        .form-select {
            width: 100%; padding: 12px; background: #333; color: white;
            border: 1px solid #555; border-radius: 8px; font-size: 16px;
        }
      `}</style>

      <div className="equipment-list" style={{ paddingBottom: isSelectionMode ? '140px' : '0' }}>
        {filteredItems.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
            {activeFilter === 'all' ? 'אין פריטים במחסן זה.' : 'לא נמצאו פריטים שתואמים לפילטר.'}
          </p>
        ) : (
          isGroupedByCategory && groupedItems ? (
            groupedItems.map(([categoryName, items]) => (
              <div key={categoryName} style={{ marginBottom: '24px' }}>
                <h3 style={{
                  padding: '0 16px',
                  margin: '0 0 8px 0',
                  color: 'var(--action-color)',
                  fontSize: '18px',
                  background: 'var(--bg-secondary)',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  position: 'sticky',
                  top: '0',
                  zIndex: 10
                }}>
                  {categoryName} ({items.length})
                </h3>
                {items.map(item => (
                  <EquipmentItemRow
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedItem(item)}
                    isSelectable={isSelectionMode}
                    isSelected={selectedItemIds.has(item.id)}
                    onToggle={() => toggleItemSelection(item.id)}
                    onOpenSubItems={(itm) => setSubItemsModalItem(itm)}
                    isCompact={isCompactMode}
                  />
                ))}
              </div>
            ))
          ) : (
            filteredItems.map(item => (
              <EquipmentItemRow
                key={item.id}
                item={item}
                onClick={() => setSelectedItem(item)}
                isSelectable={isSelectionMode}
                isSelected={selectedItemIds.has(item.id)}
                onToggle={() => toggleItemSelection(item.id)}
                onOpenSubItems={(itm) => setSubItemsModalItem(itm)}
                isCompact={isCompactMode}
              />
            ))
          )
        )}
      </div>

      {selectedItem && (
        <StatusModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {isOptionsModalOpen && (
        <WarehouseOptionsModal
          warehouse={warehouse}
          onClose={() => setIsOptionsModalOpen(false)}
        />
      )}

      {subItemsModalItem && (
        <SubItemsModal
          item={subItemsModalItem}
          onClose={() => setSubItemsModalItem(null)}
        />
      )}

      {/* Bulk Action Selection Modal */}
      {renderBulkActionModal()}

    </div>
  );
}

export default WarehouseDetailsPage;