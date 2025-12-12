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
import { bulkUpdateCategory } from '../firebaseUtils';
import type { EquipmentItem } from '../types';

type FilterType = 'all' | 'validate' | 'broken' | 'loaned';

function WarehouseDetailsPage() {
  const { warehouseId } = useParams<{ warehouseId: string }>();
  const { warehouses, equipment, users, isLoading } = useDatabase();
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);
  const [subItemsModalItem, setSubItemsModalItem] = useState<EquipmentItem | null>(null);

  // Bulk Selection State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedItemIds(new Set()); // Clear on toggle
    setBulkCategory('');
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

  const handleBulkUpdate = async () => {
    if (selectedItemIds.size === 0) return;

    const categoryToSet = bulkCategory || null;

    const success = await bulkUpdateCategory(Array.from(selectedItemIds), categoryToSet);
    if (success) {
      setIsSelectionMode(false);
      setSelectedItemIds(new Set());
    }
  };

  const filteredItems = useMemo(() => {
    let items = equipment.filter(item => item.warehouseId === warehouseId);

    // 1. First apply Status/Tab Filter
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

    // 2. Category Filter
    if (categoryFilter) {
      items = items.filter(item => item.category === categoryFilter);
    }

    // 3. Search Filter (Name or Owner)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(item => {
        const matchesName = item.name.toLowerCase().includes(query);

        // Find owner name
        const owner = users.find(u => u.uid === item.managerUserId);
        const ownerName = owner ? (owner.displayName || owner.email || '') : '';
        const matchesOwner = ownerName.toLowerCase().includes(query);

        return matchesName || matchesOwner;
      });
    }

    return items;
  }, [equipment, users, warehouseId, activeFilter, categoryFilter, searchQuery]);

  if (isLoading) {
    return <div>טוען פרטי מחסן...</div>;
  }

  const warehouse = warehouses.find(w => w.id === warehouseId);

  if (!warehouse) {
    return <div><HeaderNav title="שגיאה" /><p style={{ textAlign: 'center' }}>מחסן לא נמצא.</p></div>;
  }

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
          onClick={toggleSelectionMode}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: isSelectionMode ? '2px solid var(--action-color)' : '1px solid #444',
            background: isSelectionMode ? 'rgba(var(--action-color-rgb), 0.1)' : 'var(--bg-secondary)',
            color: isSelectionMode ? 'var(--action-color)' : 'var(--text-primary)',
            cursor: 'pointer'
          }}
        >
          {isSelectionMode ? 'בטל בחירה' : 'בחר פריטים'}
        </button>
      </div>

      {isSelectionMode && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#333', padding: '12px 20px', borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', gap: '12px', alignItems: 'center', width: '90%', maxWidth: '600px'
        }}>
          <span style={{ fontWeight: 'bold' }}>{selectedItemIds.size} נבחרו</span>
          <div style={{ flex: 1 }}></div>

          <select
            value={bulkCategory}
            onChange={e => setBulkCategory(e.target.value)}
            style={{
              padding: '8px',
              borderRadius: '6px',
              border: '1px solid #555',
              background: '#222',
              color: 'white'
            }}
          >
            <option value="">בחר קטגוריה...</option>
            {warehouse?.categories?.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="">(ללא קטגוריה)</option>
          </select>

          <button
            onClick={handleBulkUpdate}
            disabled={selectedItemIds.size === 0}
            className='btn-submit'
            style={{ margin: 0, width: 'auto', padding: '8px 16px', opacity: selectedItemIds.size === 0 ? 0.5 : 1 }}
          >
            עדכן
          </button>
        </div>
      )}

      <div className="equipment-list" style={{ paddingBottom: isSelectionMode ? '80px' : '0' }}>
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
              isSelectable={isSelectionMode}
              isSelected={selectedItemIds.has(item.id)}
              onToggle={() => toggleItemSelection(item.id)}
              onOpenSubItems={(itm) => setSubItemsModalItem(itm)}
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

      {/* רינדור מותנה של המודאל החדש */}
      {isOptionsModalOpen && (
        <WarehouseOptionsModal
          warehouse={warehouse}
          onClose={() => setIsOptionsModalOpen(false)}
        />
      )}

      {/* Modal for Sub-Items */}
      {subItemsModalItem && (
        <SubItemsModal
          item={subItemsModalItem}
          onClose={() => setSubItemsModalItem(null)}
        />
      )}
    </div>
  );
}

export default WarehouseDetailsPage;