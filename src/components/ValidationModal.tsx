import React from 'react';
import type { EquipmentItem } from '../types';
import { validateEquipmentItem } from '../firebaseUtils';
import { useValidation } from '../contexts/ValidationContext';
import { useDialog } from '../contexts/DialogContext';
import './Modal.css';

interface ValidationModalProps {
    item: EquipmentItem;
    scopeId: string;
    onClose: () => void;
}

const ValidationModal: React.FC<ValidationModalProps> = ({ item, scopeId, onClose }) => {
    const { verifyItem } = useValidation();
    const { showAlert } = useDialog();

    const handleConfirm = async () => {
        try {
            await validateEquipmentItem(item.id);
            verifyItem(scopeId, item.id);
            onClose();
        } catch (error) {
            console.error("Error validating item:", error);
            await showAlert("שגיאה באימות הפריט");
        }
    };

    return (
        <div className="modal-overlay active" onClick={onClose}>
            <div className="modal-container" onClick={e => e.stopPropagation()}>
                <h3 className="modal-title">אימות ציוד</h3>
                <p style={{ margin: '16px 0', fontSize: '16px' }}>
                    האם לאמת את תקינות הפריט <strong>{item.name}</strong>?
                </p>
                <div className="modal-actions">
                    <button className="btn-secondary" onClick={onClose}>ביטול</button>
                    <button className="btn-primary" onClick={handleConfirm}>אמת פריט</button>
                </div>
            </div>
        </div>
    );
};

export default ValidationModal;
