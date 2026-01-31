import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import {
    approveJoinRequest,
    rejectJoinRequest,
    removeMemberFromGroup,
    associateEntityWithGroup,
    deleteGroup
} from '../firebaseUtils';
import HeaderNav from '../components/HeaderNav';
import '../components/Form.css';

const GroupManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const { groups, users, warehouses, activities, currentUser, isLoading } = useDatabase();

    if (isLoading || !currentUser) return <div className="loading-screen">טוען...</div>;

    const myOwnedGroups = groups.filter(g => g.ownerId === currentUser.uid);


    const handleDeleteGroup = async (groupId: string) => {
        const success = await deleteGroup(groupId);
        if (success) {
            // Success handled by Firestore listener
        }
    };

    return (
        <div className="page-container" style={{ direction: 'rtl' }}>
            <HeaderNav title="ניהול קבוצות" />

            <div className="container page-content" style={{ paddingBottom: '100px' }}>

                {/* כפתור ליצירת קבוצה חדשה */}
                <div style={{ marginBottom: '32px' }}>
                    <button
                        onClick={() => navigate('/groups/new')}
                        className="btn-submit"
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: '1.1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px'
                        }}
                    >
                        <span>➕</span>
                        צור קבוצה חדשה
                    </button>
                </div>

                <h2 className="section-title" style={{ marginBottom: '20px' }}>הקבוצות שפתחתי</h2>

                {myOwnedGroups.length === 0 ? (
                    <div className="empty-state" style={{
                        textAlign: 'center',
                        padding: '40px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '16px',
                        color: 'var(--text-secondary)'
                    }}>
                        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>👥</div>
                        <p>עדיין לא פתחת אף קבוצה. צור אחת למעלה כדי להתחיל.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '24px' }}>
                        {myOwnedGroups.map(group => (
                            <div key={group.id} className="group-detail-card" style={{
                                background: 'var(--card-bg-color)',
                                borderRadius: '20px',
                                padding: '24px',
                                border: '1px solid #333',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* כותרת וכפתור מחיקה */}
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    marginBottom: '24px',
                                    borderBottom: '1px solid #333',
                                    paddingBottom: '16px'
                                }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{group.name}</h3>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteGroup(group.id)}
                                        style={{
                                            background: 'rgba(255, 59, 48, 0.1)',
                                            color: 'var(--status-red)',
                                            border: '1px solid rgba(255, 59, 48, 0.2)',
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            fontSize: '0.85rem',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.2)'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.1)'}
                                    >
                                        מחק קבוצה
                                    </button>
                                </div>

                                {/* חברים ובקשות */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>

                                    {/* חברים */}
                                    <div className="sub-section">
                                        <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>חברי קבוצה ({group.members.length})</h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {group.members.map(mid => {
                                                const member = users.find(u => u.uid === mid);
                                                const isOwner = mid === group.ownerId;
                                                return (
                                                    <div key={mid} style={{
                                                        background: isOwner ? 'rgba(var(--action-color-rgb), 0.15)' : '#222',
                                                        padding: '6px 12px',
                                                        borderRadius: '10px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        fontSize: '0.9rem',
                                                        border: isOwner ? '1px solid var(--action-color)' : '1px solid #333'
                                                    }}>
                                                        <span>{member?.displayName || 'טוען...'}</span>
                                                        {isOwner ? (
                                                            <span style={{ fontSize: '0.7rem', color: 'var(--action-color)' }}>מנהל</span>
                                                        ) : (
                                                            <button
                                                                onClick={() => removeMemberFromGroup(group.id, mid)}
                                                                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0 4px', fontSize: '1.2rem' }}
                                                                title="הסר מהקבוצה"
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* בקשות ממתינות */}
                                    {group.pendingRequests && group.pendingRequests.length > 0 && (
                                        <div className="sub-section" style={{
                                            background: 'rgba(var(--action-color-rgb), 0.05)',
                                            padding: '16px',
                                            borderRadius: '16px',
                                            border: '1px dashed var(--action-color)'
                                        }}>
                                            <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--action-color)', marginTop: 0 }}>בקשות המתנה ({group.pendingRequests.length})</h4>
                                            <div style={{ display: 'grid', gap: '10px' }}>
                                                {group.pendingRequests.map(rid => {
                                                    const requester = users.find(u => u.uid === rid);
                                                    return (
                                                        <div key={rid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.9rem' }}>{requester?.displayName || rid}</span>
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button
                                                                    onClick={() => approveJoinRequest(group.id, rid)}
                                                                    style={{ background: 'var(--status-green)', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.85rem', cursor: 'pointer' }}
                                                                >
                                                                    אשר
                                                                </button>
                                                                <button
                                                                    onClick={() => rejectJoinRequest(group.id, rid)}
                                                                    style={{ background: '#444', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '0.85rem', cursor: 'pointer' }}
                                                                >
                                                                    דחה
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* שיוך מחסנים ופעילויות */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>

                                    {/* ניהול מחסנים */}
                                    <div className="link-section">
                                        <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>מחסנים מקושרים</h4>
                                        <select
                                            className="form-input"
                                            style={{ marginBottom: '12px', background: '#222', borderColor: '#444', color: 'var(--text-secondary)' }}
                                            onChange={(e) => {
                                                if (e.target.value) associateEntityWithGroup('warehouses', e.target.value, group.id);
                                            }}
                                            value=""
                                        >
                                            <option value="">הוסף מחסן לקבוצה...</option>
                                            {warehouses.filter(w => w.groupId !== group.id).map(w => (
                                                <option key={w.id} value={w.id}>{w.name} {w.groupId ? '(משויך לאחר)' : ''}</option>
                                            ))}
                                        </select>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {warehouses.filter(w => w.groupId === group.id).map(w => (
                                                <div key={w.id} style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid #444',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.85rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}>
                                                    <span>{w.name}</span>
                                                    <button
                                                        onClick={() => associateEntityWithGroup('warehouses', w.id, null)}
                                                        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0', fontSize: '1.1rem' }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* ניהול פעילויות */}
                                    <div className="link-section">
                                        <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>פעילויות מקושרות</h4>
                                        <select
                                            className="form-input"
                                            style={{ marginBottom: '12px', background: '#222', borderColor: '#444', color: 'var(--text-secondary)' }}
                                            onChange={(e) => {
                                                if (e.target.value) associateEntityWithGroup('activities', e.target.value, group.id);
                                            }}
                                            value=""
                                        >
                                            <option value="">הוסף פעילות לקבוצה...</option>
                                            {activities.filter(a => a.groupId !== group.id).map(a => (
                                                <option key={a.id} value={a.id}>{a.name} {a.groupId ? '(משויך לאחר)' : ''}</option>
                                            ))}
                                        </select>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {activities.filter(a => a.groupId === group.id).map(a => (
                                                <div key={a.id} style={{
                                                    background: 'rgba(255,255,255,0.05)',
                                                    border: '1px solid #444',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    fontSize: '0.85rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px'
                                                }}>
                                                    <span>{a.name}</span>
                                                    <button
                                                        onClick={() => associateEntityWithGroup('activities', a.id, null)}
                                                        style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0', fontSize: '1.1rem' }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default GroupManagementPage;
