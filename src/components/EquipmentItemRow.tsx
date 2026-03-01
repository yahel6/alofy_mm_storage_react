import React, { useState, useRef } from 'react';
import type { EquipmentItem } from '../types';
import { useDatabase } from '../contexts/DatabaseContext';
import './EquipmentItemRow.css';

interface EquipmentItemRowProps {
  item: EquipmentItem;
  onClick: () => void;
  isSelectable?: boolean;
  isSelected?: boolean;
  onToggle?: () => void;
  onOpenSubItems?: (item: EquipmentItem) => void;
  onLongPress?: () => void;
  isDemoWarehouse?: boolean;
  isDemoReadOnly?: boolean;
}

const statusMap = {
  'available': { text: 'כשיר', class: 'status-available' },
  'charging': { text: 'בטעינה', class: 'status-charging' },
  'broken': { text: 'לא כשיר', class: 'status-broken' },
  'repair': { text: 'בתיקון', class: 'status-repair' },
  'loaned': { text: 'בפעילות', class: 'status-loaned' },
  'missing': { text: 'חסר', class: 'status-missing' }
};

const EquipmentItemRow: React.FC<EquipmentItemRowProps> = ({ item, onClick, isSelectable, isSelected, onToggle, onOpenSubItems, onLongPress, isDemoWarehouse, isDemoReadOnly }) => {
  const { users } = useDatabase();
  const timerRef = useRef<number | null>(null);
  const [isLongPressTriggered, setIsLongPressTriggered] = useState(false);

  const manager = users.find(u => u.uid === item.managerUserId);

  const checkDate = new Date(item.lastCheckDate).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit'
  });

  const managerText = manager?.displayName ? `אחראי: ${manager.displayName}` : 'ללא אחראי';
  const secondaryInfo = `${managerText} • ווידוא: ${checkDate}`;


  const startPress = () => {
    setIsLongPressTriggered(false);
    timerRef.current = window.setTimeout(() => {
      if (onLongPress) {
        onLongPress();
        setIsLongPressTriggered(true);
      }
    }, 600); // reduced slightly for better UX on mobile
  };

  const endPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (isLongPressTriggered) {
      e.stopPropagation();
      e.preventDefault();
      setIsLongPressTriggered(false);
      return;
    }
    if (isSelectable) {
      if (onToggle) onToggle();
    } else {
      // In demo mode for non-admins, clicking the item row (outside the checkbox) does nothing
      if (!isDemoReadOnly && onClick) onClick();
    }
  };

  return (
    <div
      className="equipment-item-content"
      style={{ display: 'flex', alignItems: 'center', userSelect: 'none', WebkitTouchCallout: 'none' }}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
      onTouchMove={endPress}
      onClick={handleClick}
    >
      {isSelectable && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            if (onToggle) onToggle();
          }}
          style={{ paddingLeft: '12px', cursor: 'pointer', display: 'flex' }}
        >
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => { }}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0 }}>
        <div className="equipment-details" style={{ minWidth: 0 }}>
          <div className="equipment-name" style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
            {item.quantity && Number(item.quantity) > 1 && (
              <span className="quantity-badge">
                {Number(item.quantity)}
              </span>
            )}
            {/* Combined Button for Comments & Sub-Items */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenSubItems) onOpenSubItems(item);
              }}
              style={{
                padding: '2px 8px',
                fontSize: '11px',
                borderRadius: '12px',
                border: '1px solid #444',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#aaa',
                marginRight: '8px',
                cursor: 'pointer',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {isDemoWarehouse ? (
                <>רשמ"צ פנימי ({item.subItems?.length || 0})</>
              ) : (
                <>
                  {item.subItems && item.subItems.length > 0 ? `רשמ"צ (${item.subItems.length}) | ` : ''}
                  הערות ({item.comments?.length || 0})
                </>
              )}
            </button>
          </div>
          {!isDemoWarehouse && item.status !== 'loaned' && (
            <div className="equipment-secondary-info" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {secondaryInfo}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          {!isDemoWarehouse && item.status === 'available' && new Date(item.lastCheckDate) < new Date(Date.now() - (item.validationDays ?? 7) * 24 * 60 * 60 * 1000) && (
            <div className="validation-warning" title={`נדרש ווידוא (לא נבדק ב-${item.validationDays ?? 7} ימים האחרונים)`}>
              ⚠️
              <span className="warning-text">וידוא</span>
            </div>
          )}

          {!isDemoWarehouse && (
            <div className={`equipment-status ${statusMap[item.status]?.class || 'status-grey'}`} style={{ padding: item.status === 'available' ? '4px' : undefined }}>
              <span className="status-dot" style={{ marginRight: item.status === 'available' ? '0' : undefined }}></span>
              {item.status !== 'available' && <span>{statusMap[item.status]?.text || 'לא ידוע'}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EquipmentItemRow;