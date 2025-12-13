// src/components/ResolveGapModal.tsx
import React from 'react';
import type { EquipmentItem } from '../types';
import './Modal.css'; // שימוש חוזר בעיצוב המודאל הקיים

interface ResolveGapModalProps {
  item: EquipmentItem;
  onClose: () => void;
  onManageItem: () => void; // פונקציה שתפתח את מודאל הסטטוס
  onRemoveItem: () => void; // פונקציה שתסיר את הפריט מהפעילות
}

const ResolveGapModal: React.FC<ResolveGapModalProps> = ({
  item,
  onClose,
  onManageItem,
  onRemoveItem
}) => {

  const statusMap: { [key: string]: string } = {
    'broken': 'לא כשיר',
    'repair': 'בתיקון',
    'loaned': 'בפעילות (אחרת)'
  };

  const statusText = statusMap[item.status] || item.status;

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h4 className="modal-title">טיפול בפער: {item.name}</h4>

        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          הפריט במצב נוכחי: **{statusText}**
        </div>

        <button
          className="modal-button btn-edit-details"
          onClick={onManageItem}
        >
          נהל פריט (שנה סטטוס)
        </button>

        <button
          className="modal-button btn-secondary-action"
          onClick={onRemoveItem}
        >
          הסר מהפעילות
        </button>

        <button
          className="modal-button btn-cancel"
          onClick={onClose}
        >
          ביטול
        </button>
      </div>
    </div>
  );
};

export default ResolveGapModal;