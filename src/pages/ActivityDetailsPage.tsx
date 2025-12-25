// src/pages/ActivityDetailsPage.tsx
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useValidation } from '../contexts/ValidationContext';
import { useSelection } from '../contexts/SelectionContext';
import HeaderNav from '../components/HeaderNav';
import EquipmentItemRow from '../components/EquipmentItemRow';
import ActivityOptionsModal from '../components/ActivityOptionsModal';
import ResolveGapModal from '../components/ResolveGapModal';
import StatusModal from '../components/StatusModal';
import ValidationModal from '../components/ValidationModal';
import {
  checkoutActivityEquipment,
  checkinActivityEquipment,
  removeItemFromActivity,
  bulkValidateItems
} from '../firebaseUtils';
import type { EquipmentItem } from '../types';
import './ActivityDetailsPage.css';

function ActivityDetailsPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const scopeId = activityId || 'unknown_activity';

  const navigate = useNavigate();
  const { activities, equipment, isLoading } = useDatabase();
  const { startSession, stopSession, isSessionActive, getSessionVerifiedItems, verifyItem } = useValidation();
  const { isSelectionModeActive, getSelectedItems, toggleSelectionMode: globalToggleSelectionMode, toggleItemSelection: globalToggleItemSelection, clearSelection } = useSelection();

  const isValidationMode = isSessionActive(scopeId);
  const sessionVerifiedIds = getSessionVerifiedItems(scopeId);

  const isSelectionMode = isSelectionModeActive(scopeId);
  const selectedItemIds = getSelectedItems(scopeId);

  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  // State for Modals
  const [gapItem, setGapItem] = useState<EquipmentItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  const [validationModalItem, setValidationModalItem] = useState<EquipmentItem | null>(null);

  const toggleSelectionMode = () => {
    globalToggleSelectionMode(scopeId);
  };

  const toggleItemSelection = (itemId: string) => {
    globalToggleItemSelection(scopeId, itemId);
  };

  const handleBulkValidate = async () => {
    const ids = Array.from(selectedItemIds);
    await bulkValidateItems(ids);

    if (isValidationMode) {
      ids.forEach(id => verifyItem(scopeId, id));
    } else {
      alert('הפריטים אומתו בהצלחה (תאריך בדיקה עודכן להיום).');
    }

    clearSelection(scopeId);
    globalToggleSelectionMode(scopeId); // Exit mode
  };

  const { activity, finalAssignedItems, finalMissingItems } = useMemo(() => {
    const activity = activities.find(act => act.id === activityId);
    if (!activity) {
      return { activity: null, finalAssignedItems: [], finalMissingItems: [] };
    }

    const finalAssignedItems: EquipmentItem[] = [];
    const finalMissingItems: EquipmentItem[] = [];

    // א. בדוק פריטים שמשויכים כ"נדרשים"
    activity.equipmentRequiredIds.forEach(itemId => {
      const item = equipment.find(e => e.id === itemId);
      if (item) {
        // Validation Mode Check: Skip if verified
        if (isValidationMode && sessionVerifiedIds.has(item.id)) return;

        // ב. התיקון: פריט נחשב "משויך" אם הוא פנוי, בטעינה,
        //    או אם הוא מושאל ספציפית לאחראי הפעילות הזו.
        if (item.status === 'available' ||
          item.status === 'charging' ||
          (item.status === 'loaned' && item.loanedToUserId === activity.managerUserId)
        ) {
          finalAssignedItems.push(item);
        } else {
          // הפריט מקולקל, בתיקון, או מושאל למישהו אחר - זהו פער אמיתי.
          finalMissingItems.push(item);
        }
      }
    });

    // ג. בדוק פריטים שכבר סומנו כ"חסרים"
    activity.equipmentMissingIds.forEach(itemId => {
      const item = equipment.find(e => e.id === itemId);
      if (item) {
        // Validation Mode Check: Skip if verified
        if (isValidationMode && sessionVerifiedIds.has(item.id)) return;

        // הרץ את אותה לוגיקה שוב, למקרה שהסטטוס של הפריט השתנה (למשל, חזר מתיקון)
        if (item.status === 'available' ||
          item.status === 'charging' ||
          (item.status === 'loaned' && item.loanedToUserId === activity.managerUserId)
        ) {
          // הפריט כבר לא חסר! הצג אותו כמשויך.
          finalAssignedItems.push(item);
        } else {
          // הפריט עדיין חסר
          finalMissingItems.push(item);
        }
      }
    });

    return { activity, finalAssignedItems, finalMissingItems };
  }, [activityId, activities, equipment, isValidationMode, sessionVerifiedIds]);

  const isActivityCheckedOut = useMemo(() => {
    if (!activity) return false;
    return finalAssignedItems.some(item =>
      item.status === 'loaned' &&
      item.loanedToUserId === activity.managerUserId
    );
  }, [activity, finalAssignedItems]);

  if (isLoading) {
    return <div>טוען פרטי פעילות...</div>;
  }

  if (!activity) {
    return <div><HeaderNav title="שגיאה" /><p style={{ textAlign: 'center' }}>פעילות לא נמצאה.</p></div>;
  }

  const handleEditEquipment = () => {
    navigate(`/activities/${activityId}/edit`);
  };

  const handleCheckout = async () => {
    if (finalMissingItems.length > 0) {
      alert("לא ניתן לבצע Check-out. קיימים פערים בציוד.");
      return;
    }
    const itemsToCheckout = finalAssignedItems.filter(
      item => item.status === 'available' || item.status === 'charging'
    );
    if (itemsToCheckout.length === 0) {
      alert("כל הציוד לפעילות זו כבר נמצא בחוץ.");
      return;
    }
    await checkoutActivityEquipment(activity, itemsToCheckout);
  };
  const handleCheckin = async () => {
    const itemsToCheckin = finalAssignedItems.filter(
      item => item.status === 'loaned' && item.loanedToUserId === activity.managerUserId
    );
    if (itemsToCheckin.length === 0) {
      alert("לא נמצא ציוד להחזרה.");
      return;
    }
    await checkinActivityEquipment(activity, itemsToCheckin);
  };

  // --- 3. הוספת Handlers עבור המודאל החדש ---
  const handleManageGapItem = () => {
    if (gapItem) {
      setGapItem(null); // סגור מודאל פער
      setSelectedItem(gapItem); // פתח מודאל סטטוס
    }
  };

  const handleRemoveGapItem = async () => {
    if (gapItem && activity) {
      await removeItemFromActivity(activity.id, gapItem.id);
      setGapItem(null); // סגור מודאל פער
      // אין צורך לרענן, onSnapshot יעשה זאת
    }
  };

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

  const handleGapItemClick = (item: EquipmentItem) => {
    if (isSelectionMode) {
      toggleItemSelection(item.id);
      return;
    }

    if (isValidationMode) {
      setValidationModalItem(item);
    } else {
      setGapItem(item);
    }
  };

  const totalAssigned = finalAssignedItems.length;
  const totalItems = activity.equipmentRequiredIds.length + activity.equipmentMissingIds.length;

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
    const displayGroups: { [key: string]: { items: EquipmentItem[], quantity: number } } = {};

    itemOrGroup.forEach(item => {
      const statusKey = item.status === 'loaned' ? `loaned-${item.loanedToUserId || 'null'}` : `other-${item.status}`;
      const key = `${statusKey}-${item.category || 'none'}`;

      if (!displayGroups[key]) {
        displayGroups[key] = { items: [], quantity: 0 };
      }
      displayGroups[key].items.push(item);
      displayGroups[key].quantity += (item.quantity || 1);
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

          const isMissing = finalMissingItems.some(i => i.id === first.id);
          const onClick = isMissing ? () => handleGapItemClick(first) : () => handleItemClick(first);

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
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: isSelectionMode ? '140px' : undefined }}>
      <HeaderNav
        title={activity.name}
        onOptionsMenuClick={() => setIsOptionsModalOpen(true)}
      />

      {/* Validation Mode Banner */}
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

      <div className="details-card">
        {/* ... (card title) ... */}
        <h3 className="card-title">
          <span>{`סטטוס פעילות (${totalAssigned}/${totalItems})`}</span>
          <div style={{ display: 'flex', gap: '8px' }}>

            {/* Select Button */}
            <button
              onClick={toggleSelectionMode}
              style={{
                background: isSelectionMode ? 'rgba(var(--action-color-rgb), 0.1)' : 'transparent',
                border: isSelectionMode ? '2px solid var(--action-color)' : '1px solid #444',
                color: isSelectionMode ? 'var(--action-color)' : 'var(--text-primary)',
                padding: '2px 8px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {isSelectionMode ? 'בטל בחירה' : 'בחר'}
            </button>

            {!isValidationMode && (
              <button
                onClick={() => startSession(scopeId)}
                style={{
                  background: 'transparent',
                  border: '1px solid #444',
                  color: 'var(--text-primary)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                מצב ווידוא
              </button>
            )}
            <span className="card-title-action" onClick={handleEditEquipment}>
              ערוך
            </span>
          </div>
        </h3>
        <div className="equipment-scroll-pane">
          {(finalMissingItems.length === 0 && finalAssignedItems.length === 0 && isValidationMode) && (
            <p style={{ color: 'var(--status-green)', textAlign: 'center', padding: '20px' }}>
              כל הפריטים בפעילות זו אומתו! 🎉
            </p>
          )}

          {/* Grouped Missing Items */}
          {finalMissingItems.length > 0 && (
            Object.values(groupByName(finalMissingItems))
              .sort((a, b) => a[0].name.localeCompare(b[0].name))
              .map(group => renderItemOrGroup(group))
          )}

          {/* Grouped Assigned Items */}
          <h4 className="pane-subtitle">ציוד כשיר ומשוריין</h4>
          {finalAssignedItems.length === 0 && !isValidationMode ? (
            <p style={{ color: 'var(--text-secondary)', padding: '10px 0', textAlign: 'center' }}>
              לא שוריין ציוד לפעילות זו.
            </p>
          ) : (
            Object.values(groupByName(finalAssignedItems))
              .sort((a, b) => a[0].name.localeCompare(b[0].name))
              .map(group => renderItemOrGroup(group))
          )}
        </div>
      </div>

      {/* --- BULK ACTIONS TOOLBAR (Activity: Only Validate) --- */}
      {isSelectionMode && (
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
            <button
              className="bulk-btn"
              onClick={handleBulkValidate}
              style={{
                background: '#444', color: 'white', border: 'none', padding: '8px 12px',
                borderRadius: '8px', fontSize: '13px', whiteSpace: 'nowrap', cursor: 'pointer',
                flexGrow: 1
              }}
            >
              ✅ ווידוא
            </button>
          </div>
        </div>
      )}

      {/* ... (action buttons) ... */}
      {!isValidationMode && (
        <div className="action-buttons">
          {isActivityCheckedOut ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCheckin}
            >
              בצע Check-in חזרה למחסן
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCheckout}
              disabled={finalAssignedItems.length === 0 || finalMissingItems.length > 0}
              style={{
                marginTop: '12px',
                opacity: (finalAssignedItems.length === 0 || finalMissingItems.length > 0) ? 0.5 : 1
              }}
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
      {gapItem && activity && !isValidationMode && (
        <ResolveGapModal
          item={gapItem}
          onClose={() => setGapItem(null)}
          onManageItem={handleManageGapItem}
          onRemoveItem={handleRemoveGapItem}
        />
      )}

      {/* מודאל לניהול סטטוס (יכול להיפתח ע"י המודאל פער) */}
      {selectedItem && (
        <StatusModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
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
      {/* --- סוף הוספת רינדור --- */}
    </div>
  );
}


export default ActivityDetailsPage;