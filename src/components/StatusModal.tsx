// src/components/StatusModal.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOffline } from '../contexts/OfflineContext';
import { useDialog } from '../contexts/DialogContext';
import type { EquipmentItem } from '../types';
import { updateEquipmentStatus, deleteEquipmentItem, updateGroupStatusByQuantity, bulkValidateItems } from '../firebaseUtils';
import QuantityModal from './QuantityModal';
import './Modal.css';

const statusOptions = [
  { id: 'available', label: 'כשיר', dotClass: 'available' },
  { id: 'charging', label: 'בטעינה', dotClass: 'charging' },
  { id: 'repair', label: 'בתיקון', dotClass: 'repair' },
  { id: 'broken', label: 'לא כשיר', dotClass: 'broken' },
  { id: 'missing', label: 'חסר', dotClass: 'missing' },
  { id: 'loaned', label: 'בפעילות', dotClass: 'loaned' },
] as const;

interface StatusModalProps {
  groupItems: EquipmentItem[];
  onClose: () => void;
}

const StatusModal: React.FC<StatusModalProps> = ({ groupItems, onClose }) => {
  const navigate = useNavigate();
  const { isOffline } = useOffline();
  const { showAlert, showConfirm } = useDialog();
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<EquipmentItem['status'] | null>(null);

  // Use the first item as a representative for name/ID for simple actions
  const primaryItem = groupItems[0];
  const totalQuantity = groupItems.reduce((sum, itm) => sum + (Number(itm.quantity) || 1), 0);

  const handleStatusChange = async (statusId: EquipmentItem['status']) => {
    // If total quantity is > 1, ask if user wants to move all or split
    if (totalQuantity > 1) {
      setPendingStatus(statusId);
      setShowQuantityModal(true);
    } else {
      updateEquipmentStatus(primaryItem.id, statusId);
      onClose();
    }
  };

  const handleQuantityConfirm = async (quantity: number) => {
    if (!pendingStatus) return;

    // Use the new group-aware update function
    await updateGroupStatusByQuantity(groupItems, quantity, pendingStatus);
    onClose();
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm(`האם אתה בטוח שברצונך למחוק את הפריט? אין דרך לשחזר פעולה זו.`, 'מחיקת פריט');
    if (confirmed) {
      try {
        await deleteEquipmentItem(primaryItem.id);
      } catch (error: any) {
        await showAlert(error.message || 'שגיאה במחיקת הפריט', 'שגיאה');
      }
      onClose();
    }
  };

  const handleEdit = () => {
    onClose();
    navigate(`/item/edit/${primaryItem.id}`);
  };

  const handleValidate = async () => {
    // Validate the whole group
    const ids = groupItems.map(i => i.id);
    await bulkValidateItems(ids);
    onClose();
  };

  return (
    <>
      <div className="modal-overlay active" onClick={onClose}>
        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
          <h4 className="modal-title">שנה סטטוס עבור: {primaryItem.name}</h4>
          {totalQuantity > 1 && (
            <div className="modal-quantity-info">
              כמות ביחידות: <span className="highlight-quantity">{totalQuantity}</span>
            </div>
          )}

          {isOffline ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '16px 0', lineHeight: 1.6 }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📵</div>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>מצב אופליין</div>
              <div>לא ניתן לבצע שינויים ללא חיבור לאינטרנט</div>
            </div>
          ) : (
            <>
              <div className="modal-options">
                {statusOptions.map(opt => (
                  <div key={opt.id} onClick={() => handleStatusChange(opt.id)}>
                    <span className={`status-dot ${opt.dotClass}`}></span> {opt.label}
                  </div>
                ))}
              </div>

              <button className="modal-button btn-validate" onClick={handleValidate}>
                בצע ווידוא
              </button>

              <button className="modal-button btn-danger" onClick={handleDelete}>
                מחק פריט מסוים
              </button>

              <button className="modal-button btn-edit-details" onClick={handleEdit}>
                ערוך פרטים
              </button>
            </>
          )}

          <button className="modal-button btn-cancel" onClick={onClose}>
            ביטול
          </button>
        </div>
      </div>

      {showQuantityModal && (
        <QuantityModal
          title={`בחר כמות לשינוי סטטוס (${pendingStatus})`}
          maxQuantity={totalQuantity}
          onConfirm={handleQuantityConfirm}
          onCancel={() => setShowQuantityModal(false)}
        />
      )}
    </>
  );
};

export default StatusModal;