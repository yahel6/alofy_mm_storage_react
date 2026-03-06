// src/pages/ActivityDetailsPage.tsx
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { useValidation } from '../contexts/ValidationContext';
import { useSelection } from '../contexts/SelectionContext';
import { useDialog } from '../contexts/DialogContext';
import HeaderNav from '../components/HeaderNav';
import CustomSelect from '../components/CustomSelect';
import EquipmentItemRow from '../components/EquipmentItemRow';
import ActivityOptionsModal from '../components/ActivityOptionsModal';
import ResolveGapModal from '../components/ResolveGapModal';
import StatusModal from '../components/StatusModal';
import ItemDetailsModal from '../components/ItemDetailsModal'; // Added
import ValidationModal from '../components/ValidationModal';
import FilterChips from '../components/FilterChips';
import LoadingScreen from '../components/LoadingScreen';
import {
  checkoutActivityEquipment,
  checkinActivityEquipment,
  removeItemFromActivity,
  bulkValidateItems,
  bulkUpdateCategory,
  bulkUpdateStatus,
  updateGroupStatusByQuantity,
  updateActivitySimpleEquipment
} from '../firebaseUtils';
import type { EquipmentItem, SimpleEquipmentItem } from '../types';
import QuantityModal from '../components/QuantityModal';
import './ActivityDetailsPage.css';

type FilterType = 'all' | 'validate' | 'broken' | 'loaned';

function ActivityDetailsPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const scopeId = activityId || 'unknown_activity';

  const navigate = useNavigate();
  const { activities, equipment, isLoading } = useDatabase();
  const { isOffline } = useOffline();
  const { startSession, stopSession, isSessionActive, getSessionVerifiedItems, verifyItem } = useValidation();
  const { isSelectionModeActive, getSelectedItems, toggleSelectionMode: globalToggleSelectionMode, toggleItemSelection: globalToggleItemSelection, clearSelection } = useSelection();
  const { showAlert, showConfirm } = useDialog();

  const isValidationMode = isSessionActive(scopeId);
  const sessionVerifiedIds = getSessionVerifiedItems(scopeId);

  const isSelectionMode = isSelectionModeActive(scopeId);
  const selectedItemIds = getSelectedItems(scopeId);

  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  // State for Modals
  const [gapItemGroup, setGapItemGroup] = useState<EquipmentItem[] | null>(null);
  const [selectedItemGroup, setSelectedItemGroup] = useState<EquipmentItem[] | null>(null);
  const [validationModalItem, setValidationModalItem] = useState<EquipmentItem | null>(null);
  const [subItemsModalItemId, setSubItemsModalItemId] = useState<string | null>(null); // Added

  // Enhancement State
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isGroupedByCategory, setIsGroupedByCategory] = useState(false);

  // Bulk Action Modals State
  const [bulkAction, setBulkAction] = useState<'status' | 'category' | null>(null);
  const [tempSelection, setTempSelection] = useState<string>('');
  const [splitCandidateGroup, setSplitCandidateGroup] = useState<EquipmentItem[] | null>(null);

  const toggleSelectionMode = () => {
    globalToggleSelectionMode(scopeId);
    setBulkAction(null);
    setTempSelection('');
  };

  const toggleItemSelection = (itemId: string) => {
    globalToggleItemSelection(scopeId, itemId);
  };

  const handleBulkValidate = async () => {
    const ids = Array.from(selectedItemIds);
    if (isValidationMode) {
      await bulkValidateItems(ids);
      ids.forEach(id => verifyItem(scopeId, id));
    } else {
      const confirmed = await showConfirm(`האם לוודא תקינות ל-${selectedItemIds.size} פריטים?`, 'אימות קבוצתי');
      if (confirmed) {
        await bulkValidateItems(ids);
        await showAlert('הפריטים אומתו בהצלחה (תאריך בדיקה עודכן להיום).');
      }
    }

    clearSelection(scopeId);
    globalToggleSelectionMode(scopeId); // Exit mode
  };

  const handleSplitConfirm = async (quantity: number) => {
    if (!splitCandidateGroup) return;

    const totalQuantity = splitCandidateGroup.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);

    if (quantity < totalQuantity) {
      await updateGroupStatusByQuantity(splitCandidateGroup, quantity, tempSelection as any);
      await showAlert('הפיצול והעדכון בוצעו בהצלחה');
    } else {
      await performActionOnIds(splitCandidateGroup.map(i => i.id));
    }

    setSplitCandidateGroup(null);
    clearSelection(scopeId);
    globalToggleSelectionMode(scopeId);
    setBulkAction(null);
  };

  const performActionOnIds = async (ids: string[]) => {
    let success = false;
    try {
      if (bulkAction === 'category') {
        success = await bulkUpdateCategory(ids, tempSelection || null);
      } else if (bulkAction === 'status') {
        success = await bulkUpdateStatus(ids, tempSelection as any);
      }
    } catch (err) {
      console.error("Error in performActionOnIds:", err);
      success = false;
    }

    if (success) {
      await showAlert('הפעולה בוצעה בהצלחה');
      clearSelection(scopeId);
      globalToggleSelectionMode(scopeId); // Exit mode
      setBulkAction(null);
      setTempSelection('');
    } else {
      await showAlert('אירעה שגיאה בביצוע הפעולה', 'שגיאה');
    }
  };

  const executeBulkAction = async () => {
    if (selectedItemIds.size === 0) return;

    const ids = Array.from(selectedItemIds);
    const selectedItems = equipment.filter(e => selectedItemIds.has(e.id));
    const totalSelectedQty = selectedItems.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);

    if (totalSelectedQty > 1 && bulkAction === 'status') {
      setSplitCandidateGroup(selectedItems);
      return;
    }

    await performActionOnIds(ids);
  };

  const { activity, finalAssignedItems, finalMissingItems, availableCategories } = useMemo(() => {
    const activity = activities.find(act => act.id === activityId);
    if (!activity) {
      return { activity: null, finalAssignedItems: [], finalMissingItems: [], availableCategories: [] };
    }

    let assigned: EquipmentItem[] = [];
    let missing: EquipmentItem[] = [];
    const categoriesSet = new Set<string>();

    // א. בדוק פריטים שמשויכים כ"נדרשים"
    activity.equipmentRequiredIds.forEach(itemId => {
      const item = equipment.find(e => e.id === itemId);
      if (item) {
        if (item.category) categoriesSet.add(item.category);
        if (item.status === 'available' ||
          item.status === 'charging' ||
          (item.status === 'loaned' && item.loanedToUserId === activity.managerUserId)
        ) {
          assigned.push(item);
        } else {
          missing.push(item);
        }
      }
    });

    // ג. בדוק פריטים שכבר סומנו כ"חסרים"
    activity.equipmentMissingIds.forEach(itemId => {
      const item = equipment.find(e => e.id === itemId);
      if (item) {
        if (item.category) categoriesSet.add(item.category);
        if (item.status === 'available' ||
          item.status === 'charging' ||
          (item.status === 'loaned' && item.loanedToUserId === activity.managerUserId)
        ) {
          assigned.push(item);
        } else {
          missing.push(item);
        }
      }
    });

    // Filtering logic
    const applyFilters = (items: EquipmentItem[]) => {
      let filtered = items;

      // No longer filtering out verified items in validation mode here,
      // instead we will handle the display logic in the render functions.

      if (activeFilter !== 'all') {
        const today = new Date();
        const validationThreshold = new Date(new Date().setDate(today.getDate() - 7));
        switch (activeFilter) {
          case 'validate':
            filtered = filtered.filter(item => new Date(item.lastCheckDate) < validationThreshold && item.status === 'available');
            break;
          case 'broken':
            filtered = filtered.filter(item => item.status === 'broken' || item.status === 'repair');
            break;
          case 'loaned':
            filtered = filtered.filter(item => item.status === 'loaned');
            break;
        }
      }

      if (categoryFilter) {
        filtered = filtered.filter(item => item.category === categoryFilter);
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filtered = filtered.filter(item => {
          const matchesName = item.name.toLowerCase().includes(query);
          // Find manager name if possible (using item.loanedToUserId or activity manager)
          // Simplified: just match item name for now as per Warehouse logic
          return matchesName;
        });
      }

      return filtered;
    };

    return {
      activity,
      finalAssignedItems: applyFilters(assigned),
      finalMissingItems: applyFilters(missing),
      availableCategories: Array.from(categoriesSet).sort()
    };
  }, [activityId, activities, equipment, isValidationMode, sessionVerifiedIds, activeFilter, categoryFilter, searchQuery]);

  const isActivityCheckedOut = useMemo(() => {
    if (!activity) return false;
    return finalAssignedItems.some(item =>
      item.status === 'loaned' &&
      item.loanedToUserId === activity.managerUserId
    );
  }, [activity, finalAssignedItems]);

  if (isLoading) {
    return <LoadingScreen message="טוען פרטי פעילות..." />;
  }

  if (!activity) {
    return <div><HeaderNav title="שגיאה" /><p style={{ textAlign: 'center' }}>פעילות לא נמצאה.</p></div>;
  }

  const handleEditEquipment = () => {
    navigate(`/activities/${activityId}/edit`);
  };

  const handleCheckout = async () => {
    if (finalMissingItems.length > 0) {
      await showAlert("לא ניתן לבצע Check-out. קיימים פערים בציוד.", "שגיאה");
      return;
    }
    const itemsToCheckout = finalAssignedItems.filter(
      item => item.status === 'available' || item.status === 'charging'
    );
    if (itemsToCheckout.length === 0) {
      await showAlert("כל הציוד לפעילות זו כבר נמצא בחוץ.", "פעולה בוטלה");
      return;
    }
    await checkoutActivityEquipment(activity, itemsToCheckout);
  };
  const handleCheckin = async () => {
    const itemsToCheckin = finalAssignedItems.filter(
      item => item.status === 'loaned' && item.loanedToUserId === activity.managerUserId
    );
    if (itemsToCheckin.length === 0) {
      await showAlert("לא נמצא ציוד להחזרה.", "פעולה בוטלה");
      return;
    }
    await checkinActivityEquipment(activity, itemsToCheckin);
  };

  // --- 3. הוספת Handlers עבור המודאל החדש ---
  const handleManageGapItem = () => {
    if (gapItemGroup) {
      setGapItemGroup(null); // סגור מודאל פער
      setSelectedItemGroup(gapItemGroup); // פתח מודאל סטטוס
    }
  };

  const handleRemoveGapItem = async () => {
    if (gapItemGroup && activity) {
      // Remove all items in the group from activity? Typically it's just one document but for consistency:
      for (const item of gapItemGroup) {
        await removeItemFromActivity(activity.id, item.id);
      }
      setGapItemGroup(null); // סגור מודאל פער
    }
  };

  const handleItemClick = (group: EquipmentItem[]) => {
    if (isSelectionMode) {
      group.forEach(item => toggleItemSelection(item.id));
      return;
    }

    if (isValidationMode) {
      setValidationModalItem(group[0]);
    } else {
      setSelectedItemGroup(group);
    }
  };

  const handleGapItemClick = (group: EquipmentItem[]) => {
    if (isSelectionMode) {
      group.forEach(item => toggleItemSelection(item.id));
      return;
    }

    if (isValidationMode) {
      setValidationModalItem(group[0]);
    } else {
      setGapItemGroup(group);
    }
  };

  const handleToggleSimpleVerify = async (itemId: string) => {
    if (!activity || !activity.simpleEquipment) return;
    const newSimpleItems = activity.simpleEquipment.map(item =>
      item.id === itemId ? { ...item, isVerified: !item.isVerified } : item
    );
    await updateActivitySimpleEquipment(activity.id, newSimpleItems);
  };

  const handleResetSimpleVerify = async () => {
    if (!activity || !activity.simpleEquipment) return;
    const confirmed = await showConfirm('האם לאפס את כל הווידוא שעשית ברשימה זו?', 'איפוס ווידוא');
    if (confirmed) {
      const newSimpleItems = activity.simpleEquipment.map(item => ({ ...item, isVerified: false }));
      await updateActivitySimpleEquipment(activity.id, newSimpleItems);
    }
  };


  const totalItems = activity.equipmentRequiredIds.length + activity.equipmentMissingIds.length;
  const hasInventory = totalItems > 0;
  const hasSimple = !!(activity.simpleEquipment && activity.simpleEquipment.length > 0);

  // Helper to group by name and status for aggregated view
  const groupByName = (items: EquipmentItem[]) => {
    const groups: { [key: string]: EquipmentItem[] } = {};
    items.forEach(item => {
      const key = `${item.name}`; // Simplified grouping by name first
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  };

  const groupByCategory = (items: EquipmentItem[]) => {
    const groups: { [key: string]: EquipmentItem[] } = {};
    items.forEach(item => {
      const cat = item.category || 'ללא קטגוריה';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  };

  const renderBulkActionModal = () => {
    if (!bulkAction) return null;

    let title = '';
    let content = null;

    if (bulkAction === 'category') {
      title = 'עדכון קטגוריה';
      content = (
        <CustomSelect
          value={tempSelection}
          onChange={setTempSelection}
          options={[
            { value: "", label: "(ללא קטגוריה)" },
            ...availableCategories.map(c => ({ value: c, label: c }))
          ]}
          placeholder="בחר קטגוריה..."
          openUp
        />
      );
    } else if (bulkAction === 'status') {
      title = 'שינוי סטטוס';
      content = (
        <CustomSelect
          value={tempSelection}
          onChange={setTempSelection}
          options={[
            { value: "available", label: "זמין" },
            { value: "charging", label: "בטעינה" },
            { value: "broken", label: "תקול" },
            { value: "repair", label: "בתיקון" },
            { value: "loaned", label: "מושאל" },
          ]}
          placeholder="בחר סטטוס..."
          openUp
        />
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

  const renderItemOrGroup = (itemOrGroup: EquipmentItem[]) => {
    const displayGroups: { [key: string]: { items: EquipmentItem[], quantity: number } } = {};

    itemOrGroup.forEach(item => {
      const statusKey = item.status === 'loaned' ? `loaned-${item.loanedToUserId || 'null'}` : `other-${item.status}`;
      const key = `${statusKey}-${item.category || 'none'}`;

      if (!displayGroups[key]) {
        displayGroups[key] = { items: [], quantity: 0 };
      }
      displayGroups[key].items.push(item);
      displayGroups[key].quantity += (Number(item.quantity) || 1);
    });

    const isMissingGroup = finalMissingItems.some(i => i.id === itemOrGroup[0].id);

    return (
      <div key={`group-${itemOrGroup[0].name}`} style={{
        marginBottom: '1px'
      }}>
        {Object.entries(displayGroups).map(([key, group], idx) => {
          const first = group.items[0];
          const allIds = group.items.map(i => i.id);
          const isSelected = allIds.every(id => selectedItemIds.has(id));
          const isVerified = isValidationMode && allIds.every(id => sessionVerifiedIds.has(id));

          const isMissing = finalMissingItems.some(i => i.id === first.id);
          const onClick = isMissing ? () => handleGapItemClick(group.items) : () => handleItemClick(group.items);

          const virtualItem = {
            ...first,
            quantity: group.quantity
          };

          return (
            <div
              key={key}
              style={{
                borderRight: idx > 0 ? (isMissingGroup ? '3px solid #ff4444' : '3px solid rgba(var(--action-color-rgb), 0.3)') : 'none',
                marginRight: idx > 0 ? '4px' : '0',
                paddingRight: idx > 0 ? '4px' : '0',
                position: 'relative',
                transition: 'all 0.2s',
                opacity: isVerified ? 0.6 : 1,
                background: isVerified ? 'rgba(52, 199, 89, 0.05)' : 'transparent',
                borderRadius: '8px',
                overflow: 'hidden'
              }}
            >
              <EquipmentItemRow
                item={virtualItem}
                onClick={onClick}
                isSelectable={isSelectionMode}
                isSelected={isSelected}
                onToggle={() => {
                  const targetState = !isSelected;
                  allIds.forEach(id => {
                    if (selectedItemIds.has(id) !== targetState) {
                      globalToggleItemSelection(scopeId, id);
                    }
                  });
                }}
                onOpenSubItems={(itm: any) => setSubItemsModalItemId(itm.id)} // Added
                onLongPress={() => {
                  if (!isSelectionMode) {
                    toggleSelectionMode();
                    // Select items after mode is activated
                    allIds.forEach(id => {
                      if (!selectedItemIds.has(id)) {
                        globalToggleItemSelection(scopeId, id);
                      }
                    });
                  }
                }}
              />
              {isVerified && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '16px',
                  transform: 'translateY(-50%)',
                  color: 'var(--status-green)',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  pointerEvents: 'none',
                  zIndex: 2
                }}>
                  ✅
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: isSelectionMode ? '180px' : '60px' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--bg-color)', paddingBottom: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <HeaderNav
          title={activity.name}
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


        <div className="header-controls-container">
          <div className="search-row">
            <input
              type="text"
              placeholder="חפש פריט..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="actions-row" style={{ flexWrap: 'wrap', gap: '8px' }}>
            {hasInventory && availableCategories.length > 0 && (
              <CustomSelect
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={[
                  { value: "", label: "הכל" },
                  ...availableCategories.map(cat => ({ value: cat, label: cat }))
                ]}
                placeholder="קטגוריה"
              />
            )}

            {hasInventory && (
              <button
                onClick={() => setIsGroupedByCategory(!isGroupedByCategory)}
                className="control-btn"
                style={{
                  border: isGroupedByCategory ? '2px solid var(--action-color)' : undefined,
                  background: isGroupedByCategory ? 'rgba(var(--action-color-rgb), 0.1)' : undefined,
                  color: isGroupedByCategory ? 'var(--action-color)' : undefined,
                }}
              >
                {isGroupedByCategory ? 'בטל מיון' : 'מיין'}
              </button>
            )}

            {!isOffline && hasInventory && (
              <button
                onClick={toggleSelectionMode}
                className="control-btn"
                style={{
                  border: isSelectionMode ? '2px solid var(--action-color)' : undefined,
                  background: isSelectionMode ? 'rgba(var(--action-color-rgb), 0.1)' : undefined,
                  color: isSelectionMode ? 'var(--action-color)' : undefined,
                }}
              >
                {isSelectionMode ? 'בטל' : 'בחר'}
              </button>
            )}
          </div>

          {!isOffline && (
            <div className="verification-row" style={{ display: 'flex', gap: '8px', width: '100%' }}>
              {!isValidationMode && (
                <button
                  onClick={() => startSession(scopeId)}
                  className="premium-btn-primary"
                >
                  <span style={{ fontSize: '14px' }}>🕵️</span>
                  ווידוא
                </button>
              )}
              {hasSimple && (
                <button
                  onClick={handleResetSimpleVerify}
                  className="premium-btn-secondary"
                >
                  <span>🔄</span>
                  רענון ווידוא
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {!isValidationMode && hasInventory && <FilterChips onFilterChange={(filterId) => setActiveFilter(filterId as FilterType)} />}

      <div className="details-card" style={{ display: (hasInventory || !hasSimple) ? 'block' : 'none' }}>
        {/* Inventory Section Header */}
        <h3 className="card-title">
          <span>{`רשימת ציוד- ${totalItems} פריטים`}</span>
          {!isOffline && (
            <span className="card-title-action" onClick={handleEditEquipment}>
              הוסף ציוד
            </span>
          )}
        </h3>
        <div className="equipment-scroll-pane">
          {(finalMissingItems.length === 0 && finalAssignedItems.length === 0 && isValidationMode) && (
            <p style={{ color: 'var(--status-green)', textAlign: 'center', padding: '20px' }}>
              כל הפריטים בפעילות זו אומתו! 🎉
            </p>
          )}

          {/* Grouped Missing Items */}
          {finalMissingItems.length > 0 && (
            isGroupedByCategory ? (
              groupByCategory(finalMissingItems).map(([categoryName, items]) => (
                <div key={`missing-${categoryName}`}>
                  <h5 className="category-header" style={{ position: 'sticky', top: '120px', zIndex: 10, background: 'var(--bg-color)' }}>{categoryName}</h5>
                  {Object.values(groupByName(items))
                    .sort((a, b) => a[0].name.localeCompare(b[0].name))
                    .map(group => renderItemOrGroup(group))}
                </div>
              ))
            ) : (
              Object.values(groupByName(finalMissingItems))
                .sort((a, b) => a[0].name.localeCompare(b[0].name))
                .map(group => renderItemOrGroup(group))
            )
          )}

          {/* Grouped Assigned Items */}
          <h4 className="pane-subtitle">ציוד כשיר ומשוריין</h4>
          {finalAssignedItems.length === 0 && !isValidationMode ? (
            <p style={{ color: 'var(--text-secondary)', padding: '10px 0', textAlign: 'center' }}>
              לא שוריין ציוד לפעילות זו.
            </p>
          ) : (
            isGroupedByCategory ? (
              groupByCategory(finalAssignedItems).map(([categoryName, items]) => (
                <div key={`assigned-${categoryName}`}>
                  <h5 className="category-header" style={{ position: 'sticky', top: '120px', zIndex: 10, background: 'var(--bg-color)' }}>{categoryName}</h5>
                  {Object.values(groupByName(items))
                    .sort((a, b) => a[0].name.localeCompare(b[0].name))
                    .map(group => renderItemOrGroup(group))}
                </div>
              ))
            ) : (
              Object.values(groupByName(finalAssignedItems))
                .sort((a, b) => a[0].name.localeCompare(b[0].name))
                .map(group => renderItemOrGroup(group))
            )
          )}
        </div>
      </div>

      {hasSimple && (
        <div className="details-card">
          <h3 className="card-title">
            <span>{`רשימת ציוד- ${activity.simpleEquipment?.length || 0} פריטים`}</span>
            {!isOffline && (
              <span className="card-title-action" onClick={handleEditEquipment}>
                הוסף ציוד
              </span>
            )}
          </h3>
          <div className="equipment-scroll-pane" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {activity.simpleEquipment!
                .filter(item => {
                  if (!searchQuery.trim()) return true;
                  return item.name.toLowerCase().includes(searchQuery.toLowerCase());
                })
                .map((item: SimpleEquipmentItem) => (
                  <div
                    key={item.id}
                    onClick={isValidationMode ? () => handleToggleSimpleVerify(item.id) : undefined}
                    className={`simple-item-row ${item.isVerified ? 'verified' : ''} ${isValidationMode ? 'clickable' : ''}`}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {isValidationMode && (
                        <div style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '6px',
                          border: `2px solid ${item.isVerified ? 'var(--status-green)' : '#555'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: item.isVerified ? 'var(--status-green)' : 'transparent',
                          color: 'white',
                          fontSize: '14px',
                          transition: 'all 0.2s'
                        }}>
                          {item.isVerified && '✓'}
                        </div>
                      )}
                      <span style={{
                        fontSize: '16px',
                        fontWeight: item.isVerified ? '500' : 'bold',
                        color: item.isVerified ? 'var(--status-green)' : 'var(--text-primary)',
                        textDecoration: item.isVerified ? 'line-through' : 'none',
                      }}>
                        {item.name}
                      </span>
                    </div>
                    {!isValidationMode && item.isVerified && (
                      <span style={{
                        color: 'var(--status-green)',
                        fontSize: '11px',
                        background: 'rgba(52, 199, 89, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '8px',
                        fontWeight: 'bold'
                      }}>
                        אומת
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {isSelectionMode && (
        <style>{`
          .fab { bottom: calc(200px + env(safe-area-inset-bottom)) !important; }
        `}</style>
      )}

      {/* --- BULK ACTIONS TOOLBAR --- */}
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
            <button
              className="bulk-btn"
              onClick={handleBulkValidate}
              style={{ flexGrow: 0 }}
            >
              ✅ ווידוא
            </button>
            {!isValidationMode && (
              <>
                <button
                  className="bulk-btn"
                  onClick={() => { setTempSelection(''); setBulkAction('status'); }}
                >
                  🔄 סטטוס
                </button>
                <button
                  className="bulk-btn"
                  onClick={() => { setTempSelection(''); setBulkAction('category'); }}
                >
                  🏷️ קטגוריה
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {renderBulkActionModal()}

      {splitCandidateGroup && (
        <QuantityModal
          onCancel={() => setSplitCandidateGroup(null)}
          onConfirm={handleSplitConfirm}
          maxQuantity={splitCandidateGroup.reduce((sum, i) => sum + (Number(i.quantity) || 1), 0)}
          title={`피צול פריט: ${splitCandidateGroup[0].name}`}
        />
      )}

      {/* Checkout/Checkin buttons - hidden offline */}
      {!isValidationMode && !isOffline && (
        <div className="action-buttons">
          {isActivityCheckedOut ? (
            <button type="button" className="btn btn-secondary" onClick={handleCheckin}>
              בצע Check-in חזרה למחסן
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCheckout}
              disabled={finalAssignedItems.length === 0 || finalMissingItems.length > 0}
              style={{ marginTop: '12px', opacity: (finalAssignedItems.length === 0 || finalMissingItems.length > 0) ? 0.5 : 1 }}
            >
              בצע Check-out לציוד
            </button>
          )}
        </div>
      )}

      {/* --- 5. הוספת רינדור מותנה למודאלים --- */}
      {isOptionsModalOpen && (
        <ActivityOptionsModal
          activity={activity}
          onClose={() => setIsOptionsModalOpen(false)}
        />
      )}

      {/* ייתכן שנרצה לא לאפשר טיפול בפערים בזמן מצב ווידוא, אבל השארתי את זה פתוח ב-handleItemClick */}
      {gapItemGroup && activity && !isValidationMode && (
        <ResolveGapModal
          item={gapItemGroup[0]}
          onClose={() => setGapItemGroup(null)}
          onManageItem={handleManageGapItem}
          onRemoveItem={handleRemoveGapItem}
        />
      )}

      {/* מודאל לניהול סטטוס (יכול להיפתח ע"י המודאל פער) */}
      {selectedItemGroup && (
        <StatusModal
          groupItems={selectedItemGroup}
          onClose={() => setSelectedItemGroup(null)}
        />
      )}

      {/* Validation Mode Modal */}
      {validationModalItem && (
        <ValidationModal
          item={validationModalItem}
          scopeId={scopeId}
          onClose={() => setValidationModalItem(null)}
        />
      )}

      {subItemsModalItemId && (
        <ItemDetailsModal
          itemId={subItemsModalItemId}
          onClose={() => setSubItemsModalItemId(null)}
        />
      )}
      {/* --- סוף הוספת רינדור --- */}
    </div>
  );
}

export default ActivityDetailsPage;