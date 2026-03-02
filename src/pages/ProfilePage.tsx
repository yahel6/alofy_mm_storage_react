import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { updateUserProfile, requestToJoinGroup, sendSupportMessage, markSupportRead, signOutUser } from '../firebaseUtils';
import HeaderNav from '../components/HeaderNav';
import { useDialog } from '../contexts/DialogContext';
import CustomSelect from '../components/CustomSelect';
import InstallPrompt from '../components/InstallPrompt';
import '../components/Form.css';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, users, groups } = useDatabase();
    const { isOffline } = useOffline();
    const { showConfirm } = useDialog();
    // We get the full user object from the database context to ensure we have the latest display name
    const [displayName, setDisplayName] = useState('');
    const [dominantGroupId, setDominantGroupId] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const { supportChats } = useDatabase();
    const [supportMsg, setSupportMsg] = useState('');
    const [selectedChatUserId, setSelectedChatUserId] = useState<string | null>(null);

    const userChat = supportChats.find(c => c.id === currentUser?.uid);
    const selectedChat = supportChats.find(c => c.id === selectedChatUserId);


    useEffect(() => {
        if (currentUser) {
            // Priority: displayName from users list (firestore) -> currentUser.displayName (auth)
            const dbUser = users.find(u => u.uid === currentUser.uid);
            setDisplayName(dbUser?.displayName || currentUser.displayName || '');
            setDominantGroupId(dbUser?.dominantGroupId || '');
        }
    }, [currentUser, users]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setLoading(true);
        setMessage(null);

        const success = await updateUserProfile(currentUser.uid, {
            displayName,
            dominantGroupId
        });

        if (success) {
            setMessage({ type: 'success', text: 'פרופיל עודכן בהצלחה' });
        } else {
            setMessage({ type: 'error', text: 'שגיאה בעדכון הפרופיל' });
        }
        setLoading(false);
    };

    const handleSendSupport = async (e: React.FormEvent, targetUserId?: string) => {
        e.preventDefault();
        if (!currentUser || !supportMsg.trim()) return;

        const userId = targetUserId || currentUser.uid;
        const role = currentUser.role === 'admin' ? 'admin' : 'user';

        const success = await sendSupportMessage(userId, displayName || currentUser.displayName || 'משתמש', supportMsg, role);
        if (success) {
            setSupportMsg('');
        } else {
            console.error("Failed to send support message");
            // Optionally notify user
        }
    };

    const openChat = (userId: string) => {
        setSelectedChatUserId(userId);
        markSupportRead(userId, 'admin');
    };

    useEffect(() => {
        if (userChat?.hasUnreadUser && currentUser) {
            markSupportRead(currentUser.uid, 'user');
        }
    }, [userChat?.hasUnreadUser, currentUser]);

    const handleLogout = async () => {
        const confirmed = await showConfirm('האם אתה בטוח שברצונך להחליף משתמש?', 'החלפת משתמש');
        if (confirmed) {
            await signOutUser();
            navigate('/login');
        }
    };


    return (
        <div>
            <HeaderNav title="פרופיל אישי" />
            <div className="container page-content">
                <form onSubmit={handleSave} style={{ maxWidth: '500px', margin: '0 auto' }}>

                    <div className="form-group" style={{ textAlign: 'center', marginBottom: '30px' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            background: '#555',
                            margin: '0 auto 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '32px',
                            color: '#ccc'
                        }}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#aaa' }}>
                            <span style={{ overflowWrap: 'anywhere' }}>{currentUser?.email}</span>
                            <button
                                type="button"
                                onClick={handleLogout}
                                style={{
                                    background: 'none',
                                    border: '1px solid #666',
                                    color: '#ccc',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.75em',
                                    cursor: 'pointer'
                                }}
                            >
                                החלף משתמש
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <InstallPrompt />
                    </div>

                    <div className="form-group">
                        <label htmlFor="displayName">שם תצוגה</label>
                        <input
                            type="text"
                            id="displayName"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="הכנס שם מלא"
                            required
                            style={{ textAlign: 'right' }}
                        />
                        <small style={{ color: '#aaa', marginTop: '4px', display: 'block' }}>
                            שם זה יופיע בפעילויות ובציוד עליו אתה אחראי.
                        </small>
                    </div>

                    {/* בחירת קבוצה דומיננטית */}
                    {groups && groups.filter(g => g.members.includes(currentUser?.uid || '')).length > 0 && (
                        <div className="form-group" style={{ marginTop: '20px' }}>
                            <label htmlFor="dominantGroup">קבוצה מועדפת (דף כשירויות)</label>
                            <CustomSelect
                                value={dominantGroupId}
                                onChange={setDominantGroupId}
                                options={[
                                    { value: "", label: "ללא קבוצה מועדפת" },
                                    ...groups
                                        .filter(g => g.members.includes(currentUser?.uid || ''))
                                        .map(g => ({ value: g.id, label: g.name }))
                                ]}
                                placeholder="-- בחר קבוצה מועדפת --"
                            />
                            <small style={{ color: '#aaa', marginTop: '4px', display: 'block' }}>
                                קבוצה זו תוצג כברירת מחדל במסך הכשירויות.
                            </small>
                        </div>
                    )}

                    {message && (
                        <div style={{
                            padding: '10px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            backgroundColor: message.type === 'success' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                            color: message.type === 'success' ? '#34c759' : '#ff3b30',
                            textAlign: 'center'
                        }}>
                            {message.text}
                        </div>
                    )}

                    <div className="save-bar" style={{ marginBottom: '32px' }}>
                        {isOffline ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                                ⚠️ לא ניתן לשמור שינויים במצב אופליין
                            </div>
                        ) : (
                            <button type="submit" className="btn-submit" disabled={loading}>
                                {loading ? 'שומר...' : 'שמור שינויים'}
                            </button>
                        )}
                    </div>
                </form>

                {/* מדור קבוצות */}
                <div style={{ maxWidth: '500px', margin: '0 auto', borderTop: '1px solid #333', paddingTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0 }}>הקבוצות שלי</h3>
                        {!isOffline && (
                            <button
                                onClick={() => navigate('/groups/new')}
                                style={{
                                    background: 'none',
                                    border: '1px solid var(--action-color)',
                                    color: 'var(--action-color)',
                                    padding: '4px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.9em',
                                    cursor: 'pointer'
                                }}
                            >
                                צור קבוצה חדשה
                            </button>
                        )}
                    </div>

                    {/* קבוצות שהמשתמש חבר בהן */}
                    <div style={{ marginBottom: '24px' }}>
                        {groups && groups.filter(g => g.members.includes(currentUser?.uid || '')).length > 0 ? (
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {groups.filter(g => g.members.includes(currentUser?.uid || '')).map(group => (
                                    <div key={group.id} style={{
                                        padding: '12px',
                                        background: 'var(--card-bg-color)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{group.name}</span>
                                            {group.ownerId === currentUser?.uid && (
                                                <span style={{ fontSize: '0.8em', color: 'var(--action-color)', background: 'rgba(var(--action-color-rgb), 0.1)', padding: '2px 6px', borderRadius: '4px' }}>מנהל</span>
                                            )}
                                            {((group.ownerId === currentUser?.uid) || (group.admins?.includes(currentUser?.uid || ''))) && group.pendingRequests && group.pendingRequests.length > 0 && (
                                                <div style={{
                                                    background: 'var(--status-red)',
                                                    color: 'white',
                                                    width: '14px',
                                                    height: '14px',
                                                    borderRadius: '50%',
                                                    fontSize: '10px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 'bold'
                                                }}>!</div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => navigate('/groups')}
                                            style={{
                                                background: 'var(--action-color)',
                                                color: 'white',
                                                border: 'none',
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                fontSize: '0.85em',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            פרטי קבוצה
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: '#aaa', fontSize: '0.9em' }}>אתה לא חבר באף קבוצה כרגע.</p>
                        )}
                    </div>

                    <h3 style={{ marginBottom: '16px' }}>הצטרפות לקבוצה</h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        {groups && groups
                            .filter(g => !g.members.includes(currentUser?.uid || ''))
                            .map(group => {
                                const isPending = group.pendingRequests?.includes(currentUser?.uid || '');
                                return (
                                    <div key={group.id} style={{
                                        padding: '12px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <span>{group.name}</span>
                                        <button
                                            onClick={() => currentUser && !isOffline && requestToJoinGroup(group.id, currentUser.uid)}
                                            disabled={isPending || isOffline}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: (isPending || isOffline) ? '#444' : 'var(--action-color)',
                                                color: (isPending || isOffline) ? '#888' : 'white',
                                                cursor: (isPending || isOffline) ? 'default' : 'pointer',
                                                fontSize: '0.9em'
                                            }}
                                        >
                                            {isPending ? 'נשלחה בקשה' : isOffline ? 'אופליין' : 'בקש להצטרף'}
                                        </button>
                                    </div>
                                );
                            })
                        }
                        {groups && groups.filter(g => !g.members.includes(currentUser?.uid || '')).length === 0 && (
                            <p style={{ color: '#aaa', fontSize: '0.9em' }}>אין קבוצות זמינות להצטרפות.</p>
                        )}
                    </div>
                </div>

                <div style={{ maxWidth: '500px', margin: '40px auto 0', borderTop: '2px solid var(--action-color)', paddingTop: '24px', paddingBottom: '40px' }}>
                    <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>💬 תן משוב על האפליקציה</span>
                    </h3>

                    {currentUser?.role === 'admin' ? (
                        <div style={{ background: 'var(--card-bg-color)', borderRadius: '12px', padding: '16px', border: '1px solid #444' }}>
                            <h4 style={{ marginTop: 0, marginBottom: '12px', fontSize: '1rem' }}>שיחות פתוחות</h4>
                            <div style={{ display: 'grid', gap: '8px' }}>
                                {supportChats.length > 0 ? (
                                    supportChats
                                        .sort((a, b) => (b.lastMessageTimestamp || '').localeCompare(a.lastMessageTimestamp || ''))
                                        .map(chat => (
                                            <div
                                                key={chat.id}
                                                onClick={() => openChat(chat.id)}
                                                style={{
                                                    padding: '12px',
                                                    background: selectedChatUserId === chat.id ? 'rgba(var(--action-color-rgb), 0.1)' : 'var(--bg-secondary)',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    border: chat.hasUnreadAdmin ? '1px solid var(--status-red)' : '1px solid transparent'
                                                }}
                                            >
                                                <div style={{ fontWeight: chat.hasUnreadAdmin ? 'bold' : 'normal' }}>
                                                    {chat.userName}
                                                    {chat.hasUnreadAdmin && <span style={{ color: 'var(--status-red)', marginRight: '8px' }}>●</span>}
                                                </div>
                                                <small style={{ color: '#888' }}>
                                                    {chat.lastMessageTimestamp ? new Date(chat.lastMessageTimestamp).toLocaleDateString() : ''}
                                                </small>
                                            </div>
                                        ))
                                ) : (
                                    <p style={{ color: '#888', textAlign: 'center' }}>אין שיחות פעילות.</p>
                                )}
                            </div>

                            {selectedChat && (
                                <div style={{ marginTop: '20px', borderTop: '1px solid #444', paddingTop: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <h4 style={{ margin: 0 }}>שיחה עם {selectedChat.userName}</h4>
                                        <button onClick={() => setSelectedChatUserId(null)} style={{ background: 'none', border: 'none', color: '#ff3b30', cursor: 'pointer' }}>סגור</button>
                                    </div>
                                    <div style={{ height: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {selectedChat.messages.map((m, idx) => (
                                            <div key={idx} style={{
                                                alignSelf: m.senderId === 'admin' ? 'flex-start' : 'flex-end',
                                                background: m.senderId === 'admin' ? '#444' : 'var(--action-color)',
                                                color: 'white',
                                                padding: '8px 12px',
                                                borderRadius: '12px',
                                                maxWidth: '80%',
                                                fontSize: '0.9rem'
                                            }}>
                                                {m.text}
                                            </div>
                                        ))}
                                    </div>
                                    <form onSubmit={(e) => handleSendSupport(e, selectedChat.userId)} style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            value={supportMsg}
                                            onChange={(e) => setSupportMsg(e.target.value)}
                                            placeholder="שלח תשובה..."
                                            style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#333', border: '1px solid #555', color: 'white' }}
                                        />
                                        <button type="submit" className="btn-primary" style={{ width: 'auto', margin: 0, padding: '0 16px' }}>שלח</button>
                                    </form>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ background: 'var(--card-bg-color)', borderRadius: '12px', padding: '16px', border: '1px solid #444' }}>
                            <div style={{ height: '250px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {userChat && userChat.messages.length > 0 ? (
                                    userChat.messages.map((m, idx) => (
                                        <div key={idx} style={{
                                            alignSelf: m.senderId === currentUser?.uid ? 'flex-end' : 'flex-start',
                                            background: m.senderId === currentUser?.uid ? 'var(--action-color)' : '#444',
                                            color: 'white',
                                            padding: '8px 12px',
                                            borderRadius: '12px',
                                            maxWidth: '80%',
                                            position: 'relative'
                                        }}>
                                            {m.text}
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ color: '#888', textAlign: 'center', marginTop: '40px' }}>שלח הודעה לאדמינים ונחזור אליך בהקדם.</p>
                                )}
                            </div>
                            <form onSubmit={handleSendSupport} style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    type="text"
                                    value={supportMsg}
                                    onChange={(e) => setSupportMsg(e.target.value)}
                                    placeholder="כתוב משוב או שאלה על המערכת..."
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#333', border: '1px solid #555', color: 'white' }}
                                />
                                <button type="submit" className="btn-primary" style={{ width: 'auto', margin: 0, padding: '0 16px' }}>שלח</button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>

    );
};

export default ProfilePage;
