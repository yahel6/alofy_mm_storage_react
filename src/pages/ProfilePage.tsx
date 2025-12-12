import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { updateUserProfile } from '../firebaseUtils';
import HeaderNav from '../components/HeaderNav';
import '../components/Form.css';

const ProfilePage: React.FC = () => {
    const { currentUser, users } = useDatabase();
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

                    <div className="save-bar">
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'שומר...' : 'שמור שינויים'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfilePage;
