import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { createCompetence } from '../firebaseCompetences';
import HeaderNav from '../components/HeaderNav';
import './CompetencesPage.css';

const AddCompetencePage: React.FC = () => {
    const navigate = useNavigate();
    const { users, groups, currentUser, isLoading } = useDatabase();
    const { isOffline } = useOffline();
    useEffect(() => { if (isOffline) navigate('/competences'); }, [isOffline, navigate]);

    const userGroups = groups.filter(g => g.members.includes(currentUser?.uid || ''));

    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [name, setName] = useState('');
    const [renewalDays, setRenewalDays] = useState<number>(30);
    const [notes, setNotes] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!selectedGroupId && userGroups.length > 0) {
            setSelectedGroupId(currentUser?.dominantGroupId || userGroups[0].id);
        }
    }, [userGroups, currentUser, selectedGroupId]);

    const groupUsers = groups.find(g => g.id === selectedGroupId)?.members.map(uid => users.find(u => u.uid === uid)).filter(Boolean) || [];

    // Handle group change: clear selected users
    useEffect(() => {
        setSelectedUserIds([]);
    }, [selectedGroupId]);

    const toggleUser = (uid: string) => {
        setSelectedUserIds(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const selectAll = () => {
        setSelectedUserIds(groupUsers.map(u => u!.uid));
    };

    const deselectAll = () => {
        setSelectedUserIds([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedGroupId) {
            setError('יש לבחור קבוצה');
            return;
        }
        if (!name.trim()) {
            setError('יש להזין שם כשירות');
            return;
        }
        if (renewalDays <= 0) {
            setError('מספר ימים לחידוש חייב להיות גדול מ-0');
            return;
        }
        if (selectedUserIds.length === 0) {
            setError('יש לבחור לפחות חבר קבוצה אחד');
            return;
        }

        setIsSubmitting(true);
        try {
            const newComp: any = {
                groupId: selectedGroupId,
                name: name.trim(),
                renewalDays,
                userIds: selectedUserIds,
                createdAt: new Date().toISOString()
            };

            if (notes.trim()) {
                newComp.notes = notes.trim();
            }

            const id = await createCompetence(newComp);
            if (id) {
                navigate('/competences');
            } else {
                setError('שגיאה ביצירת הכשירות. אנא נסה שוב.');
            }
        } catch (err) {
            console.error(err);
            setError('שגיאה לא צפויה.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return null;

    return (
        <div className="add-competence-page">
            <HeaderNav title="הוספת כשירות חדשה" />

            <div className="container page-content" style={{ marginTop: '20px' }}>
                {error && <div className="error-message" style={{ marginBottom: '15px' }}>{error}</div>}

                <form onSubmit={handleSubmit} className="comp-card" style={{ padding: '20px' }}>
                    <div className="form-group">
                        <label>קבוצה שייכת</label>
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            className="group-selector"
                            required
                        >
                            <option value="" disabled>-- בחר קבוצה --</option>
                            {userGroups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>שם הכשירות</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="לדוגמה: נהיגה מבצעית, חובשים..."
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'var(--input-bg-color)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '1em'
                            }}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>תדירות חידוש (בימים)</label>
                        <input
                            type="number"
                            min="1"
                            value={renewalDays}
                            onChange={e => setRenewalDays(parseInt(e.target.value) || 0)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: 'var(--input-bg-color)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                fontSize: '1em'
                            }}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>הערות / הנחיות (אופציונלי)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="פרטים נוספים על מה נדרש בכשירות זו..."
                            style={{
                                width: '100%',
                                minHeight: '80px',
                                background: 'var(--input-bg-color)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                padding: '12px',
                                resize: 'vertical',
                                fontSize: '0.95em'
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ margin: 0 }}>חברים רלוונטיים ({selectedUserIds.length} נבחרו)</label>
                            <div>
                                <button type="button" onClick={selectAll} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.8em', cursor: 'pointer', marginLeft: '10px' }}>בחר הכל</button>
                                <button type="button" onClick={deselectAll} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8em', cursor: 'pointer' }}>נקה הכל</button>
                            </div>
                        </div>

                        <div style={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '8px',
                            padding: '10px',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {groupUsers.map(user => (
                                <div
                                    key={user!.uid}
                                    onClick={() => toggleUser(user!.uid)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '10px',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        background: selectedUserIds.includes(user!.uid) ? 'rgba(124, 77, 255, 0.1)' : 'transparent',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedUserIds.includes(user!.uid)}
                                        onChange={() => { }}
                                        style={{ marginLeft: '12px', transform: 'scale(1.2)' }}
                                    />
                                    <span>{user!.displayName}</span>
                                </div>
                            ))}
                            {groupUsers.length === 0 && <div style={{ textAlign: 'center', color: '#888', padding: '10px' }}>אין חברים בקבוצה זו</div>}
                        </div>
                    </div>

                    <div style={{ marginTop: '30px', display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            className="btn-perform"
                            onClick={() => navigate('/competences')}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                flex: 1,
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-secondary)'
                            }}
                            disabled={isSubmitting}
                        >
                            ביטול
                        </button>
                        <button
                            type="submit"
                            className="btn-perform"
                            disabled={isSubmitting}
                            style={{
                                flex: 2,
                                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                                color: 'white',
                                fontWeight: 'bold',
                                boxShadow: '0 4px 15px rgba(124, 77, 255, 0.3)',
                                border: 'none'
                            }}
                        >
                            {isSubmitting ? 'שומר...' : 'צור כשירות חדשה'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddCompetencePage;
