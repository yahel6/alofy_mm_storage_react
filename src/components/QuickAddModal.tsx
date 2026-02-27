// src/components/QuickAddModal.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Modal.css'; // שימוש חוזר בעיצוב המודאל הקיים

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouseId?: string;
}

// SVG Icons (מהקוד הישן שלך)
const ActivityIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
);
const EquipmentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M21 16.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM3 16.5c.83 0 1.5.67 1.5 1.5S3.83 19.5 3 19.5s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5zM20 6l-1.97-2H5.97L4 6H1v11h2.06c.05-.8.36-1.52.84-2.11-.8-.3-1.4-1.01-1.4-1.89 0-1.1.9-2 2-2s2 .9 2 2c0 .88-.6 1.59-1.4 1.89.48.59.79 1.31.84 2.11H17.5c.05-.8.36-1.52.84-2.11-.8-.3-1.4-1.01-1.4-1.89 0-1.1.9-2 2-2s2 .9 2 2c0 .88-.6 1.59-1.4 1.89.48.59.79 1.31.84 2.11H23V6h-3zM6 13c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm12 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zM5.14 8h13.72l.96-1H4.18l.96 1z" /></svg>
);


const QuickAddModal: React.FC<QuickAddModalProps> = ({ isOpen, onClose, warehouseId }) => {
  const navigate = useNavigate();

  if (!isOpen) {
    return null;
  }

  const handleNavigation = (path: string) => {
    onClose(); // סגור את המודאל
    navigate(path); // נווט לעמוד הטופס
  };

  return (
    <div className="modal-overlay active" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-options">
          <div onClick={() => handleNavigation('/activity/new')}>
            <ActivityIcon />
            הוסף פעילות חדשה
          </div>
          <div onClick={() => handleNavigation(`/item/new${warehouseId ? `?warehouseId=${warehouseId}` : ''}`)}>
            <EquipmentIcon />
            הוסף פריט ציוד חדש
          </div>
          <div onClick={() => handleNavigation('/warehouses/new')}>
            <EquipmentIcon />
            הוסף מחסן חדש
          </div>
        </div>
        <button className="modal-button btn-cancel" onClick={onClose}>
          ביטול
        </button>
      </div>
    </div>
  );
};

export default QuickAddModal;