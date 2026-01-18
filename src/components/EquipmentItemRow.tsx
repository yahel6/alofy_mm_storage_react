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
}

const statusMap = {
  'available': { text: 'כשיר', class: 'status-available' },
  'charging': { text: 'בטעינה', class: 'status-charging' },
  'broken': { text: 'לא כשיר', class: 'status-broken' },
  'repair': { text: 'בתיקון', class: 'status-repair' },
  'loaned': { text: 'בפעילות', class: 'status-loaned' }
};

const EquipmentItemRow: React.FC<EquipmentItemRowProps> = ({ item, onClick, isSelectable, isSelected, onToggle, onOpenSubItems, onLongPress }) => {
  const { users } = useDatabase();
  const timerRef = useRef<number | null>(null);
  const [isLongPressTriggered, setIsLongPressTriggered] = useState(false);

  const manager = users.find(u => u.uid === item.managerUserId);

  const checkDate = new Date(item.lastCheckDate).toLocaleDateString('he-IL', {
    day: '2-digit', month: '2-digit', year: '2-digit'
  });

  const secondaryInfo = `אחראי: ${manager?.displayName || '...'} • ווידוא: ${checkDate}`;

  const statusInfo = statusMap[item.status] || { text: 'לא ידוע', class: 'status-grey' };

  const startPress = () => {
    setIsLongPressTriggered(false);
    timerRef.current = window.setTimeout(() => {
      if (onLongPress) {
        onLongPress();
        setIsLongPressTriggered(true);
      }
    }, 600); // 600ms long press delay
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
      onClick();
    }
  };

  return (
    <div
      className="equipment-item-content"
      style={{ display: 'flex', alignItems: 'center' }}
      onMouseDown={startPress}
      onMouseUp={endPress}
      onMouseLeave={endPress}
      onTouchStart={startPress}
      onTouchEnd={endPress}
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
      <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="equipment-details">
          <div className="equipment-name" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{item.name}</span>
            {item.quantity && item.quantity > 1 && (
              <span style={{ fontSize: '0.8em', color: '#aaa' }}>
                (x{item.quantity})
              </span>
            )}
            {/* New Button for Sub-Items */}
            {item.subItems && item.subItems.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenSubItems) onOpenSubItems(item);
                }}
                style={{
                  padding: '2px 8px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid #666',
                  background: 'transparent',
                  color: '#aaa',
                  marginRight: '8px',
                  cursor: 'pointer'
                }}
              >
                רשימת ציוד ({item.subItems.length})
              </button>
            )}
          </div>
          {item.status !== 'loaned' && (
            <div className="equipment-secondary-info">
              {secondaryInfo}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {item.status === 'available' && new Date(item.lastCheckDate) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
            <div className="validation-warning" title="נדרש ווידוא (לא נבדק ב-7 ימים האחרונים)">
              ⚠️
              <span className="warning-text">דורש וידוא</span>
            </div>
          )}

          <div className={`equipment-status ${statusInfo.class}`}>
            <span className="status-dot"></span>
            <span>{statusInfo.text}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentItemRow;