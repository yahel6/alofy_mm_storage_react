import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useValidation } from '../contexts/ValidationContext';
import { useSelection } from '../contexts/SelectionContext';
import HeaderNav from '../components/HeaderNav';
import EquipmentItemRow from '../components/EquipmentItemRow';
import FilterChips from '../components/FilterChips';
import StatusModal from '../components/StatusModal';
import WarehouseOptionsModal from '../components/WarehouseOptionsModal';
import SubItemsModal from '../components/SubItemsModal';
import ValidationModal from '../components/ValidationModal';
import {
  bulkUpdateCategory,
  bulkValidateItems,
  bulkUpdateStatus,
  bulkMoveItemsToWarehouse,
  bulkAssignItemsToActivity,
  splitItem
} from '../firebaseUtils';
import type { EquipmentItem } from '../types';
import '../components/Modal.css'; // Import generic modal styles
import QuantityModal from '../components/QuantityModal';

type FilterType = 'all' | 'validate' | 'broken' | 'loaned';

function WarehouseDetailsPage() {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const scopeId = warehouseId || 'unknown_warehouse';

  const { warehouses, equipment, users, activities, isLoading } = useDatabase();
  const { startSession, stopSession, isSessionActive, getSessionVerifiedItems, verifyItem } = useValidation();
  const { isSelectionModeActive, getSelectedItems, toggleSelectionMode: globalToggleSelectionMode, toggleItemSelection: globalToggleItemSelection, clearSelection } = useSelection();

  const isValidationMode = isSessionActive(scopeId);
  const sessionVerifiedIds = getSessionVerifiedItems(scopeId);

  const isSelectionMode = isSelectionModeActive(scopeId);
  const selectedItemIds = getSelectedItems(scopeId);

  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [validationModalItem, setValidationModalItem] = useState<EquipmentItem | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [subItemsModalItem, setSubItemsModalItem] = useState<EquipmentItem | null>(null);

  // Grouping State
  const [isGroupedByCategory, setIsGroupedByCategory] = useState(false);

  // Bulk Action Modals State
  const [bulkAction, setBulkAction] = useState<'status' | 'move' | 'activity' | 'category' | null>(null);
  const [tempSelection, setTempSelection] = useState<string>(''); // For storing the selected Status/WarehouseId/ActivityId

  // State for splitting
  const [splitCandidate, setSplitCandidate] = useState<EquipmentItem | null>(null);

  const toggleSelectionMode = () => {
    globalToggleSelectionMode(scopeId);
    setBulkAction(null);
    setTempSelection('');
  };

  const toggleItemSelection = (itemId: string) => {
    globalToggleItemSelection(scopeId, itemId);
  };

  const handleSplitConfirm = async (quantity: number) => {
    if (!splitCandidate) return;

    const originalQuantity = splitCandidate.quantity || 1;
    if (quantity < originalQuantity) {
      const newItemId = await splitItem(splitCandidate.id, quantity, {});
      if (newItemId) {
        await performActionOnIds([newItemId]);
      }
    } else {
      await performActionOnIds([splitCandidate.id]);
    }

    setSplitCandidate(null);
  };

  const performActionOnIds = async (ids: string[]) => {
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
      console.error("Error in performActionOnIds:", err);
      success = false;
    }

    if (success) {
      alert('הפעולה בוצעה בהצלחה');
      clearSelection(scopeId);
      globalToggleSelectionMode(scopeId); // Exit mode
      setBulkAction(null);
      setTempSelection('');
    } else {
      alert('אירעה שגיאה בביצוע הפעולה');
    }
  };

  const executeBulkAction = async () => {
    if (selectedItemIds.size === 0) return;

    const ids = Array.from(selectedItemIds);

    // If only ONE item is selected and it has quantity > 1, prompt for split
    if (ids.length === 1) {
      const item = equipment.find(e => e.id === ids[0]);
      if (item && item.quantity && item.quantity > 1) {
        setSplitCandidate(item);
        return; // handleSplitConfirm will continue
      }
    }

    await performActionOnIds(ids);
  };

  const handleBulkValidate = async () => {
    const ids = Array.from(selectedItemIds);
    if (isValidationMode) {
      await bulkValidateItems(ids);
      ids.forEach(id => verifyItem(scopeId, id));
    } else {
      if (window.confirm(`האם לוודא תקינות ל-${selectedItemIds.size} פריטים?`)) {
        await bulkValidateItems(ids);
        alert('הפריטים אומתו בהצלחה (תאריך בדיקה עודכן להיום).');
      }
    }

    clearSelection(scopeId);
    globalToggleSelectionMode(scopeId); // Exit mode
  };

  const filteredItems = useMemo(() => {
    let items = equipment.filter(item => item.warehouseId === warehouseId);

    if (isValidationMode) {
      items = items.filter(item => !sessionVerifiedIds.has(item.id));
    }

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
  }, [equipment, users, warehouseId, activeFilter, categoryFilter, searchQuery, isValidationMode, sessionVerifiedIds]);

  // Helper to group by name
  const groupByName = (items: EquipmentItem[]) => {
    const groups: { [name: string]: EquipmentItem[] } = {};
    items.forEach(item => {
      if (!groups[item.name]) groups[item.name] = [];
      groups[item.name].push(item);
    });
    return groups;
  };

  const renderItemOrGroup = (itemOrGroup: EquipmentItem[]) => {
    // 1. Group within this name-group by (Status + Category + assignedActivityId + loanedToUserId)
    // BUT user says "don't separate when reserved". So for display purposes, we IGNORE reservation if NOT loaned.
    const displayGroups: { [key: string]: { items: EquipmentItem[], quantity: number } } = {};

    itemOrGroup.forEach(item => {
      // Logic: Group by (Status + Category + loanedToUserId + assignedActivityId)
      // BUT if status is NOT loaned, we treat assignedActivityId as null for grouping.
      const statusKey = item.status === 'loaned' ? `loaned-${item.loanedToUserId || 'null'}-${item.assignedActivityId || 'null'}` : `other-${item.status}`;
      const key = `${statusKey}-${item.category || 'none'}`;

      if (!displayGroups[key]) {
        displayGroups[key] = { items: [], quantity: 0 };
      }
      displayGroups[key].items.push(item);
      displayGroups[key].quantity += (item.quantity || 1);
    });

    return (
      <div key={`group-${itemOrGroup[0].name}`} style={{
        marginBottom: '1px'
      }}>
        {Object.entries(displayGroups).map(([key, group], idx) => {
          const first = group.items[0];
          const allIds = group.items.map(i => i.id);
          const isSelected = allIds.every(id => selectedItemIds.has(id));

          // Create a virtual item for the row display
          const virtualItem = {
            ...first,
            quantity: group.quantity
          };

          return (
            <div
              key={key}
              style={{
                borderRight: idx > 0 ? '3px solid rgba(var(--action-color-rgb), 0.3)' : 'none',
                marginRight: idx > 0 ? '4px' : '0',
                paddingRight: idx > 0 ? '4px' : '0',
              }}
            >
              <EquipmentItemRow
                item={virtualItem}
                onClick={() => handleItemClick(first)}
                isSelectable={isSelectionMode}
                isSelected={isSelected}
                // isIndeterminate={isPartial} // TODO: Update Row if needed
                onToggle={() => {
                  const targetState = !isSelected;
                  allIds.forEach(id => {
                    if (selectedItemIds.has(id) !== targetState) {
                      globalToggleItemSelection(scopeId, id);
                    }
                  });
                }}
                onOpenSubItems={(itm) => setSubItemsModalItem(itm)}
              />
            </div>
          );
        })}
      </div>
    );
  };

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

  const handleItemClick = (item: EquipmentItem) => {
    if (isSelectionMode) {
      toggleItemSelection(item.id);
      return;
    }

    if (isValidationMode) {
      setValidationModalItem(item);
    } else {
      setSelectedItem(item);
    }
  };

  if (isLoading) {
    return <div>טוען פרטי מחסן...</div>;
  }

  const warehouse = warehouses.find(w => w.id === warehouseId);
  const otherWarehouses = warehouses.filter(w => w.id !== warehouseId);

  if (!warehouse) {
    return <div><HeaderNav title="שגיאה" /><p style={{ textAlign: 'center' }}>מחסן לא נמצא.</p></div>;
  }

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
    <div style={{ paddingBottom: isSelectionMode ? '180px' : '60px' }}>
      <HeaderNav
        title={warehouse.name}
        onOptionsMenuClick={() => setIsOptionsModalOpen(true)}
      />

      {isValidationMode && (
        <div style={{
          background: 'rgba(52, 199, 89, 0.2)',
          color: '#4caf50',
          padding: '12px',
          textAlign: 'center',
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(52, 199, 89, 0.4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span>🕵️ מצב ווידוא פעיל</span>
          <button
            onClick={() => stopSession(scopeId)}
            style={{
              background: 'rgba(0,0,0,0.3)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            סיים
          </button>
        </div>
      )}

      {!isValidationMode && <FilterChips onFilterChange={(filterId) => setActiveFilter(filterId as FilterType)} />}

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

        {!isValidationMode && (
          <button
            onClick={() => startSession(scopeId)}
            style={{
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid #444',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            מצב ווידוא
          </button>
        )}
      </div>

      {isSelectionMode && (
        <style>{`
          .fab { bottom: calc(200px + env(safe-area-inset-bottom)) !important; }
        `}</style>
      )}

      {isSelectionMode && !bulkAction && (
        <div style={{
          position: 'fixed', bottom: 'calc(75px + env(safe-area-inset-bottom))', left: '50%', transform: 'translateX(-50%)',
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

            {!isValidationMode && (
              <>
                <button className="bulk-btn" onClick={() => { setTempSelection(''); setBulkAction('status'); }}>🔄 סטטוס</button>
                <button className="bulk-btn" onClick={() => { setTempSelection(''); setBulkAction('category'); }}>🏷️ קטגוריה</button>
                <button className="bulk-btn" onClick={() => { setTempSelection(''); setBulkAction('move'); }}>📦 העברה</button>
                <button className="bulk-btn" onClick={() => { setTempSelection(''); setBulkAction('activity'); }}>📌 לפעילות</button>
              </>
            )}
          </div>
        </div>
      )}

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

      <div className="equipment-list">
        {filteredItems.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
            {isValidationMode ? 'כל הפריטים אומתו! 🎉' : (activeFilter === 'all' ? 'אין פריטים במחסן זה.' : 'לא נמצאו פריטים שתואמים לפילטר.')}
          </p>
        ) : (
          isGroupedByCategory && groupedItems ? (
            groupedItems.map(([categoryName, items]) => {
              const nameGroups = groupByName(items);
              const groupNames = Object.keys(nameGroups).sort();

              return (
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
                  {groupNames.map(name => renderItemOrGroup(nameGroups[name]))}
                </div>
              );
            })
          ) : (
            // Non-category grouped (flat list, but still grouped by Name)
            Object.values(groupByName(filteredItems))
              .sort((a, b) => a[0].name.localeCompare(b[0].name))
              .map(group => renderItemOrGroup(group))
          )
        )}
      </div>

      {selectedItem && (
        <StatusModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {validationModalItem && (
        <ValidationModal
          item={validationModalItem}
          scopeId={scopeId}
          onClose={() => setValidationModalItem(null)}
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

      {renderBulkActionModal()}

      {splitCandidate && splitCandidate.quantity && (
        <QuantityModal
          title={`בחר כמות עבור "${splitCandidate.name}"`}
          maxQuantity={splitCandidate.quantity}
          onConfirm={handleSplitConfirm}
          onCancel={() => setSplitCandidate(null)}
        />
      )}

    </div>
  );
}

export default WarehouseDetailsPage;