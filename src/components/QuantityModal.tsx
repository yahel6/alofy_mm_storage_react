import React, { useState } from 'react';
import './Modal.css';

interface QuantityModalProps {
    title: string;
    maxQuantity: number;
    onConfirm: (quantity: number) => void;
    onCancel: () => void;
}

const QuantityModal: React.FC<QuantityModalProps> = ({ title, maxQuantity, onConfirm, onCancel }) => {
    const [quantity, setQuantity] = useState(maxQuantity);

    const handleSubmit = () => {
        const val = Number(quantity);
        if (val > 0 && val <= maxQuantity) {
            onConfirm(val);
        }
    };

    return (
        <div className="modal-overlay active" onClick={onCancel}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <h4 className="modal-title">{title}</h4>

                <div style={{ margin: '20px 0', textAlign: 'center' }}>
                    <label style={{ display: 'block', marginBottom: '8px' }}>כמות (מקסימום {maxQuantity}):</label>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                        <button
                            className="btn-secondary"
                            style={{ padding: '5px 10px' }}
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        >-</button>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(Number(e.target.value))}
                            min={1}
                            max={maxQuantity}
                            style={{
                                width: '60px',
                                textAlign: 'center',
                                fontSize: '18px',
                                padding: '8px',
                                background: '#333',
                                color: 'white',
                                border: '1px solid #555',
                                borderRadius: '8px'
                            }}
                        />
                        <button
                            className="btn-secondary"
                            style={{ padding: '5px 10px' }}
                            onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                        >+</button>
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="modal-button btn-cancel" onClick={onCancel}>ביטול</button>
                    <button className="modal-button btn-edit-details" onClick={handleSubmit}>אישור</button>
                </div>
            </div>
        </div>
    );
};

export default QuantityModal;
