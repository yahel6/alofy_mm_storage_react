// src/pages/EditActivityEquipmentPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { updateActivityEquipment, splitItem } from '../firebaseUtils';
import HeaderNav from '../components/HeaderNav';
import EquipmentSelectItem from '../components/EquipmentSelectItem';
import QuantityModal from '../components/QuantityModal';
import type { EquipmentItem, SimpleEquipmentItem } from '../types';
import './EditActivityEquipmentPage.css';

function EditActivityEquipmentPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const navigate = useNavigate();
  const { activities, equipment: allEquipment, warehouses, isLoading } = useDatabase();
  const { isOffline } = useOffline();
  useEffect(() => { if (isOffline) navigate(-1); }, [isOffline, navigate]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'simple'>('simple');
  const [simpleEquipmentText, setSimpleEquipmentText] = useState('');
  const [simpleItems, setSimpleItems] = useState<SimpleEquipmentItem[]>([]);

  // State for splitting
  const [splitCandidate, setSplitCandidate] = useState<EquipmentItem | null>(null);

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
      setSimpleItems(activity.simpleEquipment || []);
    }
  }, [activity]);

  const filteredEquipment = useMemo(() => {
    // 1. Filter by Warehouse
    let items = allEquipment;
    if (selectedWarehouseId) {
      items = items.filter(item => item.warehouseId === selectedWarehouseId);
    } else {
      return []; // Should not happen if UI is correct
    }

    // 2. Filter by Search
    if (searchTerm !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      items = items.filter(item =>
        item.name && item.name.toLowerCase().includes(lowerSearchTerm)
      );
    }
    return items;
  }, [allEquipment, selectedWarehouseId, searchTerm]);

  const handleToggle = (itemId: string) => {
    // Check if we are selecting (not unselecting)
    if (!selectedIds.has(itemId)) {
      const item = allEquipment.find(e => e.id === itemId);
      if (item && item.quantity && item.quantity > 1) {
        setSplitCandidate(item);
        return;
      }
    }

    toggleId(itemId);
  };

  const toggleId = (itemId: string) => {
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

  const handleSplitConfirm = async (quantity: number) => {
    if (!splitCandidate) return;

    // If selecting full quantity, just toggle normally
    if (splitCandidate.quantity && quantity === splitCandidate.quantity) {
      toggleId(splitCandidate.id);
      setSplitCandidate(null);
      return;
    }

    // Perform split
    // The new item should be created in the SAME warehouse, same status
    // And we want to SELECT the new item (the partial amount) for the activity
    const newItemId = await splitItem(splitCandidate.id, quantity, {
      assignedActivityId: activityId,
      assignedActivityName: activity?.name
    });

    if (newItemId) {
      // Add the NEW item to selection
      toggleId(newItemId);
    }
    setSplitCandidate(null);
  };

  const handleSave = async () => {
    if (!activityId) return;

    // Convert textarea lines to simple items (merge with existing if needed, or replace)
    const lines = simpleEquipmentText.split('\n').map(l => l.trim()).filter(Boolean);
    const newSimpleItems: SimpleEquipmentItem[] = [
      ...simpleItems,
      ...lines.map(line => ({
        id: Math.random().toString(36).substr(2, 9),
        name: line,
        isVerified: false
      }))
    ];

    await updateActivityEquipment(activityId, Array.from(selectedIds), allEquipment, newSimpleItems);
    navigate(-1);
  };

  const removeSimpleItem = (id: string) => {
    setSimpleItems(prev => prev.filter(item => item.id !== id));
  };

  if (isLoading) {
    return <div>טוען נתונים...</div>;
  }

  const title = `עריכת ציוד (${activity?.name || '...'})`;

  // --- RENDER WAREHOUSE SELECTION ---
  if (!selectedWarehouseId) {
    return (
      <div className="page-content">
        <HeaderNav title={title} />

        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '12px', padding: '4px', marginBottom: '20px' }}>
            <button
              className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
              onClick={() => setActiveTab('inventory')}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: activeTab === 'inventory' ? 'var(--action-color)' : 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
            >
              📦 ציוד מלאי
            </button>
            <button
              className={`tab-btn ${activeTab === 'simple' ? 'active' : ''}`}
              onClick={() => setActiveTab('simple')}
              style={{ flex: 1, padding: '10px', border: 'none', borderRadius: '8px', background: activeTab === 'simple' ? 'var(--action-color)' : 'transparent', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
            >
              📝 רשמ"צ פשוט
            </button>
          </div>

          {activeTab === 'inventory' ? (
            <>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '16px', fontSize: '1.1rem' }}>בחר מחסן להוספת ציוד:</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                {warehouses
                  .filter(w => !activity?.groupId || w.groupId === activity.groupId)
                  .map(warehouse => {
                    const selectedCount = allEquipment.filter(e => e.warehouseId === warehouse.id && selectedIds.has(e.id)).length;
                    return (
                      <div
                        key={warehouse.id}
                        onClick={() => setSelectedWarehouseId(warehouse.id)}
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid #444',
                          borderRadius: '12px',
                          padding: '20px 12px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'transform 0.1s',
                          position: 'relative'
                        }}
                      >
                        <div style={{ fontSize: '24px' }}>🏠</div>
                        <div style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{warehouse.name}</div>
                        {selectedCount > 0 && (
                          <div style={{
                            background: 'var(--action-color)',
                            color: 'white',
                            borderRadius: '12px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            marginTop: '4px'
                          }}>
                            {selectedCount} נבחרו
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ marginBottom: '8px', display: 'block' }}>הוספה מהירה (כל שורה פריט):</label>
                <textarea
                  placeholder="לדוגמה:&#10;מכשיר קשר&#10;סוללות רזרבה&#10;מפת סימון"
                  value={simpleEquipmentText}
                  onChange={(e) => setSimpleEquipmentText(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    background: '#1a1a1a',
                    border: '1px solid #444',
                    borderRadius: '12px',
                    padding: '12px',
                    color: 'white',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              {simpleItems.length > 0 && (
                <div>
                  <h4 style={{ color: 'var(--text-secondary)', marginBottom: '12px', fontSize: '0.9rem' }}>פריטים שכבר נוספו:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {simpleItems.map(item => (
                      <div key={item.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <span>{item.name}</span>
                        <button
                          onClick={() => removeSimpleItem(item.id)}
                          style={{ background: 'transparent', border: 'none', color: '#ff4444', padding: '4px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="action-buttons-sticky">
          <button className="btn-submit" onClick={handleSave}>
            שמור שינויים ({selectedIds.size + simpleItems.length + (simpleEquipmentText.split('\n').filter(l => l.trim()).length)} פריטים)
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER ITEM SELECTION (Specific Warehouse) ---
  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId);

  return (
    <div className="page-content">
      <HeaderNav
        title={selectedWarehouse?.name || 'מחסן'}
        onBack={() => {
          setSearchTerm(''); // Reset search when going back
          setSelectedWarehouseId(null);
        }}
      />

      <div className="search-filter-container">
        <div className="search-bar">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px" style={{ fill: 'var(--text-secondary)', marginRight: '8px' }}>
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="חיפוש ציוד במחסן..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="equipment-list-container">
        {filteredEquipment.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
            לא נמצאו פריטים תואמים.
          </p>
        )}

        {filteredEquipment.map(item => {
          const isAvailable = (item.status === 'available' || item.status === 'charging');
          // If already selected for THIS activity, it should be enabled to uncheck.
          // If selected for OTHER activity/user, it is disabled.

          const isDisabled = !isAvailable && !selectedIds.has(item.id);

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

      <div className="action-buttons-sticky">
        <button
          className="btn-secondary"
          onClick={() => {
            setSearchTerm('');
            setSelectedWarehouseId(null);
          }}
          style={{ marginBottom: '8px', background: '#444', border: 'none' }}
        >
          חזור למחסנים
        </button>
        <button className="btn-submit" onClick={handleSave}>
          שמור שינויים ({selectedIds.size} פריטים)
        </button>
      </div>

      {/* Split Modal */}
      {splitCandidate && splitCandidate.quantity && (
        <QuantityModal
          title={`בחר כמות להוספה (${splitCandidate.name})`}
          maxQuantity={splitCandidate.quantity}
          onConfirm={handleSplitConfirm}
          onCancel={() => setSplitCandidate(null)}
        />
      )}
    </div>
  );
}

export default EditActivityEquipmentPage;