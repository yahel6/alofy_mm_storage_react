import React, { useState, useEffect, useRef } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { useDialog } from '../contexts/DialogContext';
import type { EquipmentStatus } from '../types';
import {
    updateSubItemStatus,
    addInternalEquipment,
    removeInternalEquipment,
    addEquipmentComment,
    deleteEquipmentComment
} from '../firebaseUtils';
import './ItemDetailsModal.css';

interface ItemDetailsModalProps {
    itemId: string;
    onClose: () => void;
    isDemoWarehouse?: boolean;
    onCopy?: () => void;
}

const statusOptions: { id: EquipmentStatus; text: string; dotClass: string }[] = [
    { id: 'available', text: 'כשיר', dotClass: 'available' },
    { id: 'charging', text: 'בטעינה', dotClass: 'charging' },
    { id: 'repair', text: 'בתיקון', dotClass: 'repair' },
    { id: 'broken', text: 'לא כשיר', dotClass: 'broken' },
    { id: 'missing', text: 'חסר', dotClass: 'missing' },
    { id: 'loaned', text: 'בפעילות', dotClass: 'loaned' },
    { id: 'borrowed', text: 'ציוד מושאל', dotClass: 'borrowed' },
];

const getStatusColor = (statusId: EquipmentStatus) => {
    switch (statusId) {
        case 'available': return 'var(--status-green)';
        case 'charging': return 'var(--status-orange)';
        case 'repair': return 'var(--status-orange)';
        case 'broken': return 'var(--status-red)';
        case 'missing': return 'var(--status-red)';
        case 'loaned': return 'var(--status-grey)';
        case 'borrowed': return 'var(--status-orange)';
        default: return 'transparent';
    }
};

const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({ itemId, onClose, isDemoWarehouse, onCopy }) => {
    const { equipment, currentUser } = useDatabase();
    const { isOffline } = useOffline();
    const { showAlert, showConfirm } = useDialog();

    const isDemoReadOnly = isDemoWarehouse && currentUser?.role !== 'admin';

    // Auto-update when equipment changes in context
    const item = equipment.find(e => e.id === itemId);
    const subItems = item?.subItems || [];
    const comments = item?.comments || [];

    const [openSubItemId, setOpenSubItemId] = useState<string | null>(null);
    const [newSubItemName, setNewSubItemName] = useState('');
    const [newCommentText, setNewCommentText] = useState('');

    const [isAddingSubItem, setIsAddingSubItem] = useState(false);
    const [isSendingComment, setIsSendingComment] = useState(false);

    const commentsListRef = useRef<HTMLDivElement>(null);

    // Initial scroll to bottom of comments
    useEffect(() => {
        scrollToBottom();
    }, [comments.length]); // Scroll when a new comment is added

    const scrollToBottom = () => {
        if (commentsListRef.current) {
            commentsListRef.current.scrollTop = commentsListRef.current.scrollHeight;
        }
    };

    if (!item || !currentUser) return null;

    // --- Sub-Items Logic ---
    const handleAddSubItem = async () => {
        if (!newSubItemName.trim() || isAddingSubItem) return;
        setIsAddingSubItem(true);
        const success = await addInternalEquipment(itemId, newSubItemName);
        if (success) {
            setNewSubItemName('');
        } else {
            await showAlert('שגיאה בהוספת פריט פנימי', 'שגיאה');
        }
        setIsAddingSubItem(false);
    };

    const handleDeleteSubItem = async (subItemId: string, subItemName: string) => {
        const confirmed = await showConfirm(`האם אתה בטוח שברצונך למחוק את הפריט הפנימי "${subItemName}"?`, 'מחיקת פריט פנימי');
        if (!confirmed) return;
        await removeInternalEquipment(itemId, subItemId);
    };

    // --- Comments Logic ---
    const handleSendComment = async () => {
        if (!newCommentText.trim() || isSendingComment) return;
        setIsSendingComment(true);
        const success = await addEquipmentComment(itemId, newCommentText.trim(), currentUser.uid, currentUser.displayName);
        if (success) {
            setNewCommentText('');
        } else {
            await showAlert('שגיאה בשליחת הערה', 'שגיאה');
        }
        setIsSendingComment(false);
    };

    const handleKeyDownComment = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendComment();
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        const confirmed = await showConfirm('האם אתה בטוח שברצונך למחוק הערה זו?', 'מחיקת הערה');
        if (!confirmed) return;
        await deleteEquipmentComment(itemId, commentId);
    };

    const formatTime = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="item-details-modal-overlay" onClick={onClose}>
            <div className="item-details-modal-content" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header-section">
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ margin: 0 }}>{item.name}</h3>
                        {isDemoWarehouse && (
                            <span style={{ fontSize: '11px', color: '#f5c518', marginTop: '2px' }}>📚 מחסן לדוגמא</span>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {isDemoWarehouse && (
                            <button
                                onClick={onCopy}
                                style={{
                                    background: 'rgba(var(--action-color-rgb), 0.15)',
                                    color: 'var(--action-color)',
                                    border: '1px solid var(--action-color)',
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                📋 העתק למחסן שלי
                            </button>
                        )}
                        <button className="modal-close-icon" onClick={onClose}>&times;</button>
                    </div>
                </div>

                <div className="modal-scrollable-body">

                    {/* --- 1. Equipment List Section --- */}
                    <div className="internal-equipment-section">
                        <h4 className="section-title">רשימת ציוד פנימית ({subItems.length})</h4>

                        <div className="internal-equipment-list">
                            {subItems.length === 0 ? (
                                <p style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', margin: '8px 0' }}>
                                    אין פריטים ברשימה הפנימית.
                                </p>
                            ) : (
                                subItems.map(sub => {
                                    return (
                                        <div key={sub.id} className="internal-equipment-row">
                                            <span className="subitem-name">{sub.name}</span>

                                            <div className="subitem-actions">
                                                {isOffline || isDemoWarehouse ? (
                                                    // קריאה בלבד כשאופליין או מחסן לדוגמא
                                                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)', padding: '6px 10px', border: '1px solid #555', borderRadius: '12px' }}>
                                                        {!isDemoWarehouse && (
                                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getStatusColor(sub.status), display: 'inline-block', marginLeft: '6px' }}></span>
                                                        )}
                                                        {isDemoWarehouse ? 'פריט רשמ"צ' : statusOptions.find(o => o.id === sub.status)?.text}
                                                    </span>
                                                ) : (
                                                    <div className="sub-item-status-wrapper">
                                                        <div
                                                            className={`sub-item-pill`}
                                                            style={{ padding: '6px 12px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid #444', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                            onClick={() => setOpenSubItemId(sub.id === openSubItemId ? null : sub.id)}
                                                        >
                                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getStatusColor(sub.status), boxShadow: `0 0 4px ${getStatusColor(sub.status)}` }}></span>
                                                            <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{statusOptions.find(o => o.id === sub.status)?.text}</span>
                                                            <span style={{ fontSize: '10px', opacity: 0.7, color: '#fff' }}>▾</span>
                                                        </div>

                                                        {openSubItemId === sub.id && (
                                                            <>
                                                                <div className="dropdown-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} onClick={() => setOpenSubItemId(null)} />
                                                                <div className="custom-status-dropdown" style={{ position: 'absolute', top: '100%', left: 0, background: '#2c2c2e', border: '1px solid #444', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 1000, marginTop: '4px', minWidth: '140px', overflow: 'hidden' }}>
                                                                    {statusOptions.map(opt => (
                                                                        <div
                                                                            key={opt.id}
                                                                            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', fontSize: '14px', cursor: 'pointer', color: '#fff', textAlign: 'right', direction: 'rtl', background: opt.id === sub.status ? '#48484a' : 'transparent', fontWeight: opt.id === sub.status ? 'bold' : 'normal' }}
                                                                            onClick={() => {
                                                                                updateSubItemStatus(item.id, sub.id, opt.id);
                                                                                setOpenSubItemId(null);
                                                                            }}
                                                                        >
                                                                            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: getStatusColor(opt.id) }}></span>
                                                                            {opt.text}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}

                                                {!isOffline && !isDemoReadOnly && (
                                                    <button
                                                        className="delete-subitem-btn"
                                                        onClick={() => handleDeleteSubItem(sub.id, sub.name)}
                                                        title="מחק פרטי רשמצ"
                                                    >
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M3 6h18"></path>
                                                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Add Quick Sub-item - hidden offline or in demo */}
                        {!isOffline && !isDemoReadOnly && (
                            <div className="add-subitem-controls">
                                <input
                                    type="text"
                                    className="internal-item-input"
                                    placeholder="שם פריט פנימי חדש..."
                                    value={newSubItemName}
                                    onChange={(e) => setNewSubItemName(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubItem()}
                                />
                                <button
                                    className="btn-add-internal"
                                    onClick={handleAddSubItem}
                                    disabled={isAddingSubItem || !newSubItemName.trim()}
                                >
                                    הוסף
                                </button>
                            </div>
                        )}
                    </div>

                    {/* --- 2. Comments Section (Hidden entirely in Demo Mode) --- */}
                    {!isDemoWarehouse && (
                        <div className="comments-section">
                            <h4 className="section-title">הערות ({comments.length})</h4>

                            <div className="comments-list" ref={commentsListRef}>
                                {comments.length === 0 ? (
                                    <p className="empty-comments">אין הערות לפריט זה. היה הראשון להגיב!</p>
                                ) : (
                                    comments.map(comment => {
                                        const isMine = comment.userId === currentUser.uid;
                                        return (
                                            <div key={comment.id} className={`comment-bubble-wrapper ${isMine ? 'my-comment' : 'other-comment'}`}>
                                                <div className="comment-bubble">
                                                    <div className="comment-header">
                                                        <span className="comment-author">{isMine ? 'אני' : comment.userName}</span>
                                                        {(isMine || currentUser.role === 'admin') && (
                                                            <button
                                                                className="btn-delete-comment"
                                                                onClick={e => {
                                                                    e.stopPropagation();
                                                                    handleDeleteComment(comment.id);
                                                                }}
                                                                title="מחק הערה"
                                                            >
                                                                מחק
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="comment-text">
                                                        {comment.text}
                                                    </div>
                                                    <div className="comment-footer">
                                                        <div style={{ flex: 1 }}></div>
                                                        <span className="comment-time">{formatTime(comment.createdAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Send Comment Area - hidden offline */}
                            {isOffline ? (
                                <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', borderTop: '1px solid #333', marginTop: '8px' }}>
                                    📵 לא ניתן לשלוח הערות במצב אופליין
                                </div>
                            ) : (
                                <div className="add-comment-controls">
                                    <textarea
                                        className="comment-input"
                                        placeholder="הקלד הערה..."
                                        value={newCommentText}
                                        onChange={e => setNewCommentText(e.target.value)}
                                        onKeyDown={handleKeyDownComment}
                                        rows={1}
                                    />
                                    <button
                                        className="btn-send-comment"
                                        onClick={handleSendComment}
                                        disabled={isSendingComment || !newCommentText.trim()}
                                    >
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-45deg)', marginLeft: '4px' }}>
                                            <line x1="22" y1="2" x2="11" y2="13"></line>
                                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                        </svg>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default ItemDetailsModal;
