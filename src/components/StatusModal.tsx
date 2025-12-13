// src/components/StatusModal.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { EquipmentItem } from '../types';
// 1. ייבוא הפונקציה החדשה
import { updateEquipmentStatus, deleteEquipmentItem, validateEquipmentItem } from '../firebaseUtils';
import './Modal.css';

const statusOptions = [
  { id: 'available', label: 'כשיר', dotClass: 'available' },
  { id: 'charging', label: 'בטעינה', dotClass: 'charging' },
  { id: 'loaned', label: 'בפעילות', dotClass: 'loaned' },
  { id: 'repair', label: 'בתיקון', dotClass: 'repair' },
  { id: 'broken', label: 'לא כשיר', dotClass: 'broken' },
] as const;

interface StatusModalProps {
  item: EquipmentItem;
  onClose: () => void;
}

const StatusModal: React.FC<StatusModalProps> = ({ item, onClose }) => {
  const navigate = useNavigate();

  const handleStatusChange = (statusId: EquipmentItem['status']) => {
    updateEquipmentStatus(item.id, statusId);
    onClose();
  };

  const handleDelete = () => {
    deleteEquipmentItem(item.id);
    onClose();
  };

  const handleEdit = () => {
    onClose();
    navigate(`/item/edit/${item.id}`);
  };

  // 2. הוספת פונקציית ווידוא
  const handleValidate = async () => {
    await validateEquipmentItem(item.id);
    onClose();
    // אין צורך ברענון ידני, onSnapshot ב-DatabaseContext יטפל בזה
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h4 className="modal-title">שנה סטטוס עבור: {item.name}</h4>

        <div className="modal-options">
          {statusOptions.map(opt => (
            <div key={opt.id} onClick={() => handleStatusChange(opt.id)}>
              <span className={`status-dot ${opt.dotClass}`}></span> {opt.label}
            </div>
          ))}
        </div>

        {/* 3. הוספת הכפתור החדש */}
        {/* הוא יופיע בין "מחק" ל-"ערוך" */}
        <button
          className="modal-button btn-validate"
          onClick={handleValidate}
        >
          בצע ווידוא
        </button>

        <button
          className="modal-button btn-danger"
          onClick={handleDelete}
        >
          מחק פריט
        </button>

        <button
          className="modal-button btn-edit-details"
          onClick={handleEdit}
        >
          ערוך פרטים
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

export default StatusModal;