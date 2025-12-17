// src/pages/ActivityDetailsPage.tsx
import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useValidation } from '../contexts/ValidationContext';
import HeaderNav from '../components/HeaderNav';
import EquipmentItemRow from '../components/EquipmentItemRow';
import ActivityOptionsModal from '../components/ActivityOptionsModal';
// 1. ייבוא המודאל החדש והפונקציה החדשה
import ResolveGapModal from '../components/ResolveGapModal';
import StatusModal from '../components/StatusModal'; // לוודא שגם זה מיובא
import ValidationModal from '../components/ValidationModal';
import {
  checkoutActivityEquipment,
  checkinActivityEquipment,
  removeItemFromActivity // ייבוא הפונקציה
} from '../firebaseUtils';
import type { EquipmentItem } from '../types';
import './ActivityDetailsPage.css';

function ActivityDetailsPage() {
  const { activityId } = useParams<{ activityId: string }>();
  const scopeId = activityId || 'unknown_activity';

  const navigate = useNavigate();
  const { activities, equipment, isLoading } = useDatabase();
  const { startSession, stopSession, isSessionActive, getSessionVerifiedItems } = useValidation();

  const isValidationMode = isSessionActive(scopeId);
  const sessionVerifiedIds = getSessionVerifiedItems(scopeId);

  const [isOptionsModalOpen, setIsOptionsModalOpen] = useState(false);

  // 2. הוספת State לניהול המודאלים
  const [gapItem, setGapItem] = useState<EquipmentItem | null>(null); // לפריט לטיפול בפער
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null); // לפריט לשינוי סטטוס
  const [validationModalItem, setValidationModalItem] = useState<EquipmentItem | null>(null);


  // ... (useMemo for activity, finalAssignedItems, finalMissingItems is unchanged) ...
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

  // ... (useMemo for isActivityCheckedOut is unchanged) ...
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

  // ... (handleCheckout and handleCheckin are unchanged) ...
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
    if (isValidationMode) {
      setValidationModalItem(item);
    } else {
      setSelectedItem(item);
    }
  };

  const handleGapItemClick = (item: EquipmentItem) => {
    if (isValidationMode) {
      setValidationModalItem(item);
    } else {
      setGapItem(item);
    }
  };

  const totalAssigned = finalAssignedItems.length;
  const totalItems = activity.equipmentRequiredIds.length + activity.equipmentMissingIds.length;

  return (
    <div>
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

          {finalMissingItems.length > 0 && (
            finalMissingItems.map(item => (
              <EquipmentItemRow
                key={item.id}
                item={item}
                onClick={() => handleGapItemClick(item)}
              // Optional: Indicate visual difference for missing items via style or prop if Row supports it
              // For now, relies on standard row. The user can see status in the row.
              />
            ))
          )}
          {/* ... (assigned items list) ... */}
          <h4 className="pane-subtitle">ציוד כשיר ומשוריין</h4>
          {finalAssignedItems.length === 0 && !isValidationMode ? (
            <p style={{ color: 'var(--text-secondary)', padding: '10px 0', textAlign: 'center' }}>
              לא שוריין ציוד לפעילות זו.
            </p>
          ) : (
            finalAssignedItems.map(item => (
              <EquipmentItemRow
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item)}
              />
            ))
          )}
        </div>
      </div>

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