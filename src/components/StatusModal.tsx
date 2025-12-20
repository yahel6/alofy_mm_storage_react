// src/components/StatusModal.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { EquipmentItem } from '../types';
import { updateEquipmentStatus, deleteEquipmentItem, validateEquipmentItem, splitItem } from '../firebaseUtils';
import QuantityModal from './QuantityModal';
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
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<EquipmentItem['status'] | null>(null);

  const handleStatusChange = (statusId: EquipmentItem['status']) => {
    // If quantity is > 1, ask if user wants to move all or split
    if (item.quantity && item.quantity > 1) {
      setPendingStatus(statusId);
      setShowQuantityModal(true);
    } else {
      updateEquipmentStatus(item.id, statusId);
      onClose();
    }
  };

  const handleQuantityConfirm = async (quantity: number) => {
    if (!pendingStatus) return;

    if (item.quantity && quantity < item.quantity) {
      // Split
      await splitItem(item.id, quantity, { status: pendingStatus, loanedToUserId: null });
      // Note: loanedToUserId=null because mostly we move from X to Y. 
      // If moving TO loaned, we need user selection? handled by updateEquipmentStatus usually.
      // But updateEquipmentStatus sets loanedToUserId=null if not 'loaned'.
      // For now, simple status change implies resetting loan unless we add logic.
    } else {
      // Full update
      updateEquipmentStatus(item.id, pendingStatus);
    }
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

  const handleValidate = async () => {
    await validateEquipmentItem(item.id);
    onClose();
  };

  return (
    <>
      <div className="modal-overlay active" onClick={onClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <h4 className="modal-title">שנה סטטוס עבור: {item.name}</h4>
          {(item.quantity && item.quantity > 1) && (
            <div style={{ textAlign: 'center', marginBottom: '10px', color: '#aaa', fontSize: '14px' }}>
              (כמות: {item.quantity})
            </div>
          )}

          <div className="modal-options">
            {statusOptions.map(opt => (
              <div key={opt.id} onClick={() => handleStatusChange(opt.id)}>
                <span className={`status-dot ${opt.dotClass}`}></span> {opt.label}
              </div>
            ))}
          </div>

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

      {showQuantityModal && item.quantity && (
        <QuantityModal
          title={`בחר כמות לשינוי סטטוס (${pendingStatus})`}
          maxQuantity={item.quantity}
          onConfirm={handleQuantityConfirm}
          onCancel={() => setShowQuantityModal(false)}
        />
      )}
    </>
  );
};

export default StatusModal;