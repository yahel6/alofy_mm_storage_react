import React, { useState, useEffect } from 'react';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { createCompetence } from '../firebaseCompetences';
import '../pages/CompetencesPage.css'; // We can reuse some styles
import './CompetenceFormModal.css'; // New button styles

interface Props {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
}

const CompetenceFormModal: React.FC<Props> = ({ isOpen, onClose, groupId }) => {
    const { users, groups, currentUser } = useDatabase();
    const { isOffline } = useOffline();

    // אם אופליין והמודאל פתוח, הצג הודעה
    if (isOpen && isOffline) {
        return (
            <div className="modal-overlay">
                <div className="modal-content" style={{ textAlign: 'center', padding: '40px 20px' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📵</div>
                    <h3 style={{ marginBottom: '8px' }}>מצב אופליין</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
                        לא ניתן ליצור כשירות חדשה ללא חיבור לאינטרנט
                    </p>
                    <button className="btn-cancel" onClick={onClose}>סגור</button>
                </div>
            </div>
        );
    }

    const userGroups = groups.filter(g => g.members.includes(currentUser?.uid || ''));
    const [selectedGroupId, setSelectedGroupId] = useState(groupId || (userGroups.length > 0 ? userGroups[0].id : ''));

    const [name, setName] = useState('');
    const [renewalDays, setRenewalDays] = useState<number>(30);
    const [notes, setNotes] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const groupUsers = groups.find(g => g.id === selectedGroupId)?.members.map(uid => users.find(u => u.uid === uid)).filter(Boolean) || [];

    useEffect(() => {
        if (isOpen) {
            setSelectedGroupId(groupId || (userGroups.length > 0 ? userGroups[0].id : ''));
            setName('');
            setRenewalDays(30);
            setNotes('');
            setSelectedUserIds([]);
            setError('');
        }
    }, [isOpen, groupId]);

    // Handle group change: clear selected users
    useEffect(() => {
        if (isOpen) {
            setSelectedUserIds([]);
        }
    }, [selectedGroupId, isOpen]);

    if (!isOpen) return null;

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
            const newComp = {
                groupId: selectedGroupId,
                name: name.trim(),
                renewalDays,
                userIds: selectedUserIds,
                notes: notes.trim() || undefined,
                createdAt: new Date().toISOString()
            };

            const id = await createCompetence(newComp);
            if (id) {
                onClose();
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

    return (
        <div className="modal-overlay">
            <div className="modal-content" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>הוספת כשירות חדשה</h2>

                {error && <div className="error-message" style={{ marginBottom: '15px' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>קבוצה</label>
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '10px',
                                background: 'var(--input-bg-color)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white'
                            }}
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
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>הערות / הנחיות / פירוט (אופציונלי)</label>
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
                                padding: '10px',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ margin: 0 }}>חברים רלוונטיים ({selectedUserIds.length} נבחרו)</label>
                            <div>
                                <button type="button" className="action-btn-sm primary" onClick={selectAll} aria-label="בחר את כל חברי הקבוצה">בחר הכל</button>
                                <button type="button" className="action-btn-sm secondary" onClick={deselectAll} aria-label="בטל בחירה לכולם">נקה הכל</button>
                            </div>
                        </div>

                        <div style={{
                            maxHeight: '150px',
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
                                        padding: '8px',
                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                        cursor: 'pointer',
                                        background: selectedUserIds.includes(user!.uid) ? 'rgba(124, 77, 255, 0.1)' : 'transparent',
                                        borderRadius: '4px'
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedUserIds.includes(user!.uid)}
                                        onChange={() => { }} // handled by div click
                                        style={{ marginLeft: '10px', transform: 'scale(1.2)' }}
                                    />
                                    <span>{user!.displayName}</span>
                                </div>
                            ))}
                            {groupUsers.length === 0 && <div style={{ textAlign: 'center', color: '#888' }}>אין חברים בקבוצה זו</div>}
                        </div>
                    </div>

                    <div className="modal-actions" style={{ marginTop: '25px' }}>
                        <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>ביטול</button>
                        <button type="submit" className="btn-submit" disabled={isSubmitting}>
                            {isSubmitting ? 'שומר...' : 'צור כשירות'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompetenceFormModal;
