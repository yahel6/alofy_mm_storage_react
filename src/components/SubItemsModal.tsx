import React from 'react';
import type { EquipmentItem } from '../types';

interface SubItemsModalProps {
    item: EquipmentItem;
    onClose: () => void;
}

const statusMap: Record<string, { text: string, color: string }> = {
    'available': { text: 'כשיר', color: '#34c759' }, // Green
    'broken': { text: 'תקול', color: '#ff3b30' },    // Red
    'missing': { text: 'חסר', color: '#ff9500' },    // Orange
    'loaned': { text: 'מושאל', color: '#8e8e93' },   // Grey
};

const SubItemsModal: React.FC<SubItemsModalProps> = ({ item, onClose }) => {
    const subItems = item.subItems || [];

    return (
        <div style={itemsModalOverlayStyle} onClick={onClose}>
            <div style={itemsModalContentStyle} onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0, marginBottom: '16px' }}>
                    רשימת ציוד פנימית: {item.name}
                </h3>

                {subItems.length === 0 ? (
                    <p style={{ color: '#aaa', textAlign: 'center' }}>אין פריטים ברשימה.</p>
                ) : (
                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #444', textAlign: 'right' }}>
                                    <th style={{ padding: '8px' }}>שם הפריט</th>
                                    <th style={{ padding: '8px' }}>סטטוס</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subItems.map(sub => {
                                    const statusInfo = statusMap[sub.status] || { text: sub.status, color: '#999' };
                                    return (
                                        <tr key={sub.id} style={{ borderBottom: '1px solid #333' }}>
                                            <td style={{ padding: '12px 8px' }}>{sub.name}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    backgroundColor: `${statusInfo.color}20`,
                                                    color: statusInfo.color,
                                                    fontSize: '0.9em',
                                                    fontWeight: 'bold'
                                                }}>
                                                    {statusInfo.text}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: 'none',
                            background: '#444',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        סגור
                    </button>
                </div>
            </div>
        </div>
    );
};

// Styles
const itemsModalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    backdropFilter: 'blur(3px)'
};

const itemsModalContentStyle: React.CSSProperties = {
    backgroundColor: '#1c1c1e', // Dark mode card bg
    padding: '24px',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '500px',
    color: '#fff',
    boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    border: '1px solid #333'
};

export default SubItemsModal;
