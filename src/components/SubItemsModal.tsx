import React from 'react';
import type { EquipmentStatus } from '../types';
import { updateSubItemStatus } from '../firebaseUtils';
import { useDatabase } from '../contexts/DatabaseContext';

interface SubItemsModalProps {
    itemId: string;
    onClose: () => void;
}

const statusOptions: { id: EquipmentStatus; text: string; dotClass: string }[] = [
    { id: 'available', text: 'כשיר', dotClass: 'available' },
    { id: 'charging', text: 'בטעינה', dotClass: 'charging' },
    { id: 'repair', text: 'בתיקון', dotClass: 'repair' },
    { id: 'broken', text: 'לא כשיר', dotClass: 'broken' },
    { id: 'missing', text: 'חסר', dotClass: 'missing' },
    { id: 'loaned', text: 'בפעילות', dotClass: 'loaned' },
];

const SubItemsModal: React.FC<SubItemsModalProps> = ({ itemId, onClose }) => {
    const { equipment } = useDatabase();
    const item = equipment.find(e => e.id === itemId);
    const subItems = item?.subItems || [];
    const [openSubItemId, setOpenSubItemId] = React.useState<string | null>(null);

    if (!item) return null;

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
                                    <th style={{ padding: '8px', minWidth: '130px' }}>סטטוס</th>
                                </tr>
                            </thead>
                            <tbody>
                                {subItems.map(sub => {
                                    const currentOpt = statusOptions.find(o => o.id === sub.status);
                                    return (
                                        <tr key={sub.id} style={{ borderBottom: '1px solid #333' }}>
                                            <td style={{ padding: '12px 8px' }}>{sub.name}</td>
                                            <td style={{ padding: '12px 8px' }}>
                                                <div className="sub-item-status-wrapper">
                                                    <div
                                                        className={`equipment-status status-${sub.status} sub-item-pill`}
                                                        onClick={() => setOpenSubItemId(sub.id === openSubItemId ? null : sub.id)}
                                                    >
                                                        <span className="status-dot"></span>
                                                        <span className="status-text">{currentOpt?.text}</span>
                                                        <span className="chevron-icon">▾</span>
                                                    </div>

                                                    {openSubItemId === sub.id && (
                                                        <>
                                                            <div className="dropdown-backdrop" onClick={() => setOpenSubItemId(null)} />
                                                            <div className="custom-status-dropdown">
                                                                {statusOptions.map(opt => (
                                                                    <div
                                                                        key={opt.id}
                                                                        className={`dropdown-item ${opt.id === sub.status ? 'active' : ''}`}
                                                                        onClick={() => {
                                                                            updateSubItemStatus(item.id, sub.id, opt.id);
                                                                            setOpenSubItemId(null);
                                                                        }}
                                                                    >
                                                                        <span className={`status-dot ${opt.dotClass}`}></span>
                                                                        {opt.text}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
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
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#333',
                            color: 'white',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '14px'
                        }}
                    >
                        סגור
                    </button>
                </div>
            </div>
            <style>{`
                .sub-item-status-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    position: relative;
                }
                .sub-item-pill {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 12px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                    user-select: none;
                }
                .sub-item-pill:hover {
                    opacity: 0.9;
                    transform: scale(1.02);
                }
                .status-text {
                    font-size: 12px;
                    font-weight: 500;
                }
                .chevron-icon {
                    font-size: 10px;
                    opacity: 0.7;
                    margin-left: -2px;
                }
                .custom-status-dropdown {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    background: #2c2c2e;
                    border: 1px solid #444;
                    border-radius: 12px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
                    z-index: 1000;
                    margin-top: 4px;
                    min-width: 140px;
                    overflow: hidden;
                }
                .dropdown-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 14px;
                    font-size: 13px;
                    cursor: pointer;
                    transition: background 0.2s;
                    color: #fff;
                    white-space: nowrap;
                    text-align: right;
                    direction: rtl;
                }
                .dropdown-item:hover {
                    background: #3a3a3c;
                }
                .dropdown-item.active {
                    background: #48484a;
                    font-weight: bold;
                }
                .dropdown-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 999;
                }
                /* Reuse dots from global CSS */
            `}</style>
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
