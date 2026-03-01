import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { useDialog } from '../contexts/DialogContext';
import {
    approveJoinRequest,
    rejectJoinRequest,
    removeMemberFromGroup,
    associateEntityWithGroup,
    deleteGroup,
    addMembersToGroup,
    promoteToAdmin,
    demoteFromAdmin,
    updateUserSeenRequests
} from '../firebaseUtils';
import HeaderNav from '../components/HeaderNav';
import CustomSelect from '../components/CustomSelect';
import '../components/Form.css';

const GroupManagementPage: React.FC = () => {
    const navigate = useNavigate();
    const [selectedUsers, setSelectedUsers] = React.useState<{ [groupId: string]: string[] }>({});
    const [searchTerms, setSearchTerms] = React.useState<{ [groupId: string]: string }>({});
    const [confirmRemove, setConfirmRemove] = React.useState<{ groupId: string, memberId: string, memberName: string } | null>(null);
    const { groups, users, warehouses, allWarehouses, activities, allActivities, currentUser, isLoading } = useDatabase();
    const { isOffline } = useOffline();
    const { showConfirm } = useDialog();

    if (isLoading || !currentUser) return <div className="loading-screen">טוען...</div>;

    const myGroups = groups.filter(g => g.members.includes(currentUser.uid));

    // אפקט לסימון הבקשות כ"נראו" בעת כניסה לעמוד
    React.useEffect(() => {
        if (currentUser && myGroups.length > 0) {
            myGroups.forEach(group => {
                const isOwner = group.ownerId === currentUser.uid;
                const isAdmin = group.admins?.includes(currentUser.uid);

                // רק אם הוא מנהל/בעלים ויש בקשות ממתינות
                if ((isOwner || isAdmin) && group.pendingRequests?.length > 0) {
                    updateUserSeenRequests(currentUser.uid, group.id);
                }
            });
        }
    }, [currentUser?.uid, myGroups.length]);


    const handleDeleteGroup = async (groupId: string) => {
        const confirmed = await showConfirm(
            "האם אתה בטוח שברצונך למחוק את הקבוצה? פעולה זו תסיר את כל החברים ותנתק את הקבוצה מהמחסנים והפעילויות המשויכים אליה.",
            "מחיקת קבוצה"
        );
        if (!confirmed) return;

        const success = await deleteGroup(groupId);
        if (success) {
            // Success handled by Firestore listener
        }
    };

    return (
        <div className="page-container" style={{ direction: 'rtl' }}>
            <HeaderNav title="ניהול קבוצות" />

            <div className="container page-content" style={{ paddingBottom: '100px' }}>

                {/* כפתור ליצירת קבוצה חדשה - נסתר באופליין */}
                {!isOffline && (
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
                )}

                <h2 className="section-title" style={{ marginBottom: '20px' }}>הקבוצות שלי</h2>

                {myGroups.length === 0 ? (
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
                        {myGroups.map(group => {
                            const isOwner = group.ownerId === currentUser.uid;
                            const isAdmin = group.admins?.includes(currentUser.uid) || false;
                            const canManage = isOwner || isAdmin;

                            return (
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
                                        <div style={{ flex: 1, minWidth: '150px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <h3 style={{ margin: 0, fontSize: '1.4rem', overflowWrap: 'anywhere' }}>{group.name}</h3>
                                                {group.pendingRequests && group.pendingRequests.length > 0 && (
                                                    <div style={{
                                                        background: 'var(--status-red)',
                                                        color: 'white',
                                                        width: '16px',
                                                        height: '16px',
                                                        borderRadius: '50%',
                                                        fontSize: '11px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontWeight: 'bold'
                                                    }}>!</div>
                                                )}
                                            </div>
                                        </div>
                                        {isOwner && !isOffline && (
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
                                        )}
                                    </div>

                                    {canManage && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                                            {/* חברים */}
                                            <div className="sub-section">
                                                <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>חברי קבוצה ({group.members.length})</h4>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {group.members.map(mid => {
                                                        const member = users.find(u => u.uid === mid);
                                                        const isMemberOwner = mid === group.ownerId;
                                                        const isMemberAdmin = group.admins?.includes(mid);

                                                        let roleLabel = 'חבר';
                                                        if (isMemberOwner) roleLabel = 'בעלים';
                                                        else if (isMemberAdmin) roleLabel = 'מנהל';

                                                        return (
                                                            <div key={mid} style={{
                                                                background: isMemberOwner ? 'rgba(var(--action-color-rgb), 0.15)' : isMemberAdmin ? 'rgba(var(--status-green-rgb, 46, 204, 113), 0.1)' : '#222',
                                                                padding: '8px 14px',
                                                                borderRadius: '12px',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '12px',
                                                                fontSize: '0.9rem',
                                                                flexWrap: 'wrap',
                                                                border: isMemberOwner ? '1px solid var(--action-color)' : isMemberAdmin ? '1px solid #2ecc71' : '1px solid #333'
                                                            }}>
                                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                                    <span>{member?.displayName || 'טוען...'}</span>
                                                                    <span style={{ fontSize: '0.7rem', color: isMemberOwner ? 'var(--action-color)' : isMemberAdmin ? '#2ecc71' : '#888' }}>
                                                                        {roleLabel}
                                                                    </span>
                                                                </div>

                                                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: '4px' }}>
                                                                    {/* כפתורי קידום/הורדה (רק לבעלים, רק אונליין) */}
                                                                    {isOwner && !isMemberOwner && !isOffline && (
                                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                                            {!isMemberAdmin ? (
                                                                                <button
                                                                                    onClick={() => promoteToAdmin(group.id, mid)}
                                                                                    style={{ background: 'rgba(46, 204, 113, 0.1)', border: '1px solid #2ecc71', color: '#2ecc71', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}
                                                                                    title="קדם למנהל"
                                                                                >
                                                                                    קדם למנהל
                                                                                </button>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => demoteFromAdmin(group.id, mid)}
                                                                                    style={{ background: 'rgba(230, 126, 34, 0.1)', border: '1px solid #e67e22', color: '#e67e22', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem' }}
                                                                                    title="הורד מנהל"
                                                                                >
                                                                                    הורד מנהל
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* כפתור הסרה (רק אונליין) */}
                                                                    {!isOffline && ((isOwner && !isMemberOwner) || (isAdmin && !isMemberOwner && !isMemberAdmin)) && (
                                                                        <button
                                                                            onClick={() => setConfirmRemove({ groupId: group.id, memberId: mid, memberName: member?.displayName || 'משתמש' })}
                                                                            style={{
                                                                                background: 'rgba(255, 59, 48, 0.1)',
                                                                                border: '1px solid rgba(255, 59, 48, 0.3)',
                                                                                color: '#ff3b30',
                                                                                cursor: 'pointer',
                                                                                padding: '6px',
                                                                                borderRadius: '6px',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                marginLeft: '8px'
                                                                            }}
                                                                            title="הסר מהקבוצה"
                                                                        >
                                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* הוספת חברים חדשים - נסתר באופליין */}
                                                {!isOffline && (
                                                    <div style={{ marginTop: '16px' }}>
                                                        <h5 style={{ fontSize: '0.85rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>הוספת חברים חדשים</h5>

                                                        {/* שדה חיפוש */}
                                                        <div style={{ marginBottom: '10px' }}>
                                                            <input
                                                                type="text"
                                                                placeholder="חפש לפי שם או אימייל..."
                                                                value={searchTerms[group.id] || ''}
                                                                onChange={(e) => setSearchTerms(prev => ({ ...prev, [group.id]: e.target.value }))}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '8px 12px',
                                                                    background: '#111',
                                                                    border: '1px solid #444',
                                                                    borderRadius: '8px',
                                                                    color: 'white',
                                                                    fontSize: '0.85rem'
                                                                }}
                                                            />
                                                        </div>

                                                        <div style={{
                                                            display: 'grid',
                                                            gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                                                            gap: '8px',
                                                            maxHeight: '150px',
                                                            overflowY: 'auto',
                                                            padding: '10px',
                                                            background: '#1a1a1a',
                                                            borderRadius: '12px',
                                                            border: '1px solid #333',
                                                            marginBottom: '12px'
                                                        }}>
                                                            {users
                                                                .filter(u => {
                                                                    if (group.members.includes(u.uid)) return false;
                                                                    const term = (searchTerms[group.id] || '').toLowerCase();
                                                                    if (!term) return true;
                                                                    return (u.displayName || '').toLowerCase().includes(term) ||
                                                                        (u.email || '').toLowerCase().includes(term);
                                                                })
                                                                .map(u => {
                                                                    const isSelected = (selectedUsers[group.id] || []).includes(u.uid);
                                                                    return (
                                                                        <div
                                                                            key={u.uid}
                                                                            onClick={() => {
                                                                                setSelectedUsers(prev => {
                                                                                    const current = prev[group.id] || [];
                                                                                    const next = isSelected ? current.filter(id => id !== u.uid) : [...current, u.uid];
                                                                                    return { ...prev, [group.id]: next };
                                                                                });
                                                                            }}
                                                                            style={{
                                                                                padding: '6px 8px',
                                                                                background: isSelected ? 'var(--action-color)' : '#2a2a2a',
                                                                                color: isSelected ? 'white' : 'var(--text-primary)',
                                                                                borderRadius: '8px',
                                                                                fontSize: '0.8rem',
                                                                                cursor: 'pointer',
                                                                                textAlign: 'center',
                                                                                transition: 'all 0.2s',
                                                                                border: isSelected ? '1px solid var(--action-color)' : '1px solid #444'
                                                                            }}
                                                                        >
                                                                            {u.displayName || u.email}
                                                                        </div>
                                                                    );
                                                                })
                                                            }
                                                        </div>

                                                        {(selectedUsers[group.id] || []).length > 0 && (
                                                            <button
                                                                onClick={async () => {
                                                                    const success = await addMembersToGroup(group.id, selectedUsers[group.id]);
                                                                    if (success) {
                                                                        setSelectedUsers(prev => ({ ...prev, [group.id]: [] }));
                                                                    }
                                                                }}
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '10px',
                                                                    background: 'var(--action-color)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '8px',
                                                                    fontSize: '0.9rem',
                                                                    fontWeight: 'bold',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                צרף {(selectedUsers[group.id] || []).length} חברים נבחרים
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* בקשות ממתינות - נסתרות באופליין */}
                                            {!isOffline && group.pendingRequests && group.pendingRequests.length > 0 && (
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
                                                                <div key={rid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                                                    <span style={{ fontSize: '0.9rem', overflowWrap: 'anywhere' }}>{requester?.displayName || rid}</span>
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
                                    )}

                                    {/* שיוך מחסנים ופעילויות */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>

                                        {/* ניהול מחסנים - select נסתר באופליין */}
                                        <div className="link-section">
                                            <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>מחסנים מקושרים</h4>
                                            {!isOffline && (
                                                <CustomSelect
                                                    value=""
                                                    onChange={(val: string) => {
                                                        if (val) associateEntityWithGroup('warehouses', val, group.id);
                                                    }}
                                                    options={allWarehouses.filter(w => w.groupId !== group.id).map(w => ({ value: w.id, label: `${w.name} ${w.groupId ? '(משויך לאחר)' : ''}` }))}
                                                    placeholder="הוסף מחסן לקבוצה..."
                                                />
                                            )}
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
                                                        {!isOffline && (
                                                            <button
                                                                onClick={() => associateEntityWithGroup('warehouses', w.id, null)}
                                                                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0', fontSize: '1.1rem' }}
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* ניהול פעילויות - select נסתר באופליין */}
                                        <div className="link-section">
                                            <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>פעילויות מקושרות</h4>
                                            {!isOffline && (
                                                <CustomSelect
                                                    value=""
                                                    onChange={(val: string) => {
                                                        if (val) associateEntityWithGroup('activities', val, group.id);
                                                    }}
                                                    options={allActivities.filter(a => a.groupId !== group.id).map(a => ({ value: a.id, label: `${a.name} ${a.groupId ? '(משויך לאחר)' : ''}` }))}
                                                    placeholder="הוסף פעילות לקבוצה..."
                                                />
                                            )}
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
                                                        {!isOffline && (
                                                            <button
                                                                onClick={() => associateEntityWithGroup('activities', a.id, null)}
                                                                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0', fontSize: '1.1rem' }}
                                                            >
                                                                ×
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* מודאל אישור הסרה מהקבוצה */}
            {confirmRemove && (
                <div className="modal-overlay active" onClick={() => setConfirmRemove(null)} style={{ zIndex: 3000 }}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '350px' }}>
                        <h4 className="modal-title" style={{ color: '#ff3b30' }}>אישור הסרה מהקבוצה</h4>
                        <p style={{ textAlign: 'center', padding: '0 20px', color: 'var(--text-secondary)' }}>
                            האם אתה בטוח שברצונך להסיר את **{confirmRemove.memberName}** מהקבוצה?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                            <button
                                className="modal-button btn-cancel"
                                style={{ flex: 1, margin: 0 }}
                                onClick={() => setConfirmRemove(null)}
                            >
                                ביטול
                            </button>
                            <button
                                className="modal-button"
                                style={{ flex: 1, margin: 0, backgroundColor: '#ff3b30', color: 'white' }}
                                onClick={async () => {
                                    await removeMemberFromGroup(confirmRemove.groupId, confirmRemove.memberId);
                                    setConfirmRemove(null);
                                }}
                            >
                                הסר חבר
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupManagementPage;
