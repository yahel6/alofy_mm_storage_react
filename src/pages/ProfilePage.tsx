import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { updateUserProfile, requestToJoinGroup } from '../firebaseUtils';
import HeaderNav from '../components/HeaderNav';
import '../components/Form.css';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, users, groups } = useDatabase();
    // We get the full user object from the database context to ensure we have the latest display name
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (currentUser) {
            // Priority: displayName from users list (firestore) -> currentUser.displayName (auth)
            const dbUser = users.find(u => u.uid === currentUser.uid);
            setDisplayName(dbUser?.displayName || currentUser.displayName || '');
        }
    }, [currentUser, users]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;

        setLoading(true);
        setMessage(null);

        const success = await updateUserProfile(currentUser.uid, displayName);

        if (success) {
            setMessage({ type: 'success', text: 'פרופיל עודכן בהצלחה' });
        } else {
            setMessage({ type: 'error', text: 'שגיאה בעדכון הפרופיל' });
        }
        setLoading(false);
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
                        <div style={{ color: '#aaa' }}>{currentUser?.email}</div>
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
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'שומר...' : 'שמור שינויים'}
                        </button>
                    </div>
                </form>

                {/* מדור קבוצות */}
                <div style={{ maxWidth: '500px', margin: '0 auto', borderTop: '1px solid #333', paddingTop: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0 }}>הקבוצות שלי</h3>
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
                                        alignItems: 'center'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>{group.name}</span>
                                            {group.ownerId === currentUser?.uid && (
                                                <span style={{ fontSize: '0.8em', color: 'var(--action-color)', background: 'rgba(var(--action-color-rgb), 0.1)', padding: '2px 6px', borderRadius: '4px' }}>מנהל</span>
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
                                            onClick={() => currentUser && requestToJoinGroup(group.id, currentUser.uid)}
                                            disabled={isPending}
                                            style={{
                                                padding: '6px 12px',
                                                borderRadius: '6px',
                                                border: 'none',
                                                background: isPending ? '#444' : 'var(--action-color)',
                                                color: isPending ? '#888' : 'white',
                                                cursor: isPending ? 'default' : 'pointer',
                                                fontSize: '0.9em'
                                            }}
                                        >
                                            {isPending ? 'נשלחה בקשה' : 'בקש להצטרף'}
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
            </div>
        </div>
    );
};

export default ProfilePage;
