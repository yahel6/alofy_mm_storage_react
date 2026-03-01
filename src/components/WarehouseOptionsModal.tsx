// src/components/WarehouseOptionsModal.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { deleteWarehouseAndContents } from '../firebaseUtils';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { useDialog } from '../contexts/DialogContext';
import type { Warehouse } from '../types';
import './Modal.css';

interface WarehouseOptionsModalProps {
  warehouse: Warehouse;
  onClose: () => void;
}

// SVG Icons (מהקוד הישן)
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
);
const DeleteIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px" style={{ fill: 'var(--status-red)' }}><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12l1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.12-2.12zM15.5 4l-.71-.71C14.12 3.12 13.88 3 13.5 3h-3c-.38 0-.71.12-.99.34L8.5 4H6v2h12V4z" /></svg>
);

const WarehouseOptionsModal: React.FC<WarehouseOptionsModalProps> = ({ warehouse, onClose }) => {
  const navigate = useNavigate();
  const { equipment } = useDatabase();
  const { isOffline } = useOffline();
  const { showAlert, showConfirm } = useDialog();

  const handleEdit = () => {
    onClose();
    navigate(`/warehouses/edit/${warehouse.id}`); // ניווט לעמוד העריכה
  };

  const handleDelete = async () => {
    const confirmed = await showConfirm(
      `האם אתה בטוח שברצונך למחוק את המחסן "${warehouse.name}"?\n\nאזהרה: פעולה זו תמחק גם את כל הפריטים המשויכים למחסן זה.\nאין דרך לשחזר פעולה זו.`,
      'מחיקת מחסן'
    );
    if (!confirmed) return;

    const success = await deleteWarehouseAndContents(warehouse, equipment);
    onClose();
    if (success) {
      await showAlert(`המחסן "${warehouse.name}" וכל תכולתו נמחקו.`);
      navigate('/warehouses'); // חזרה לרשימת המחסנים
    }
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <h4 className="modal-title">אפשרויות עבור: {warehouse.name}</h4>

        <div className="modal-options">
          {isOffline ? (
            <div style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', padding: '12px 0' }}>
              ⚠️ במצב אופליין לא ניתן לבצע שינויים
            </div>
          ) : (
            <>
              <div onClick={handleEdit}>
                <EditIcon />
                ערוך מחסן
              </div>
              <div onClick={handleDelete} style={{ color: 'var(--status-red)' }}>
                <DeleteIcon />
                מחק מחסן
              </div>
            </>
          )}
        </div>

        <button className="modal-button btn-cancel" onClick={onClose}>
          ביטול
        </button>
      </div>
    </div>
  );
};

export default WarehouseOptionsModal;