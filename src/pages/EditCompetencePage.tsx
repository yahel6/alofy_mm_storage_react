// src/pages/EditCompetencePage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import { updateCompetence, deleteCompetence } from '../firebaseCompetences';
import { useDialog } from '../contexts/DialogContext';
import HeaderNav from '../components/HeaderNav';
import CustomSelect from '../components/CustomSelect';
import './CompetencesPage.css';

const EditCompetencePage: React.FC = () => {
    const navigate = useNavigate();
    const { competenceId } = useParams<{ competenceId: string }>();
    const { users, groups, competences, currentUser, isLoading } = useDatabase();
    const { isOffline } = useOffline();
    const { showConfirm } = useDialog();

    // Redirect offline users
    useEffect(() => { if (isOffline) navigate('/competences'); }, [isOffline, navigate]);

    const competence = competences.find(c => c.id === competenceId);

    const userGroups = groups.filter(g => g.members.includes(currentUser?.uid || ''));

    const [selectedGroupId, setSelectedGroupId] = useState('');
    const [name, setName] = useState('');
    const [renewalDays, setRenewalDays] = useState<number>(30);
    const [notes, setNotes] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState('');

    // Pre-fill fields when competence data is available
    useEffect(() => {
        if (competence) {
            setSelectedGroupId(competence.groupId);
            setName(competence.name);
            setRenewalDays(competence.renewalDays);
            setNotes(competence.notes || '');
            setSelectedUserIds(competence.userIds);
        }
    }, [competence]);

    const groupUsers = groups.find(g => g.id === selectedGroupId)?.members
        .map(uid => users.find(u => u.uid === uid))
        .filter(Boolean) || [];

    // Reset selected users when group changes (user explicitly changes group)
    const handleGroupChange = (newGroupId: string) => {
        setSelectedGroupId(newGroupId);
        setSelectedUserIds([]);
    };

    const toggleUser = (uid: string) => {
        setSelectedUserIds(prev =>
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const selectAll = () => setSelectedUserIds(groupUsers.map(u => u!.uid));
    const deselectAll = () => setSelectedUserIds([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!selectedGroupId) { setError('יש לבחור קבוצה'); return; }
        if (!name.trim()) { setError('יש להזין שם כשירות'); return; }
        if (renewalDays <= 0) { setError('מספר ימים לחידוש חייב להיות גדול מ-0'); return; }
        if (selectedUserIds.length === 0) { setError('יש לבחור לפחות חבר קבוצה אחד'); return; }

        setIsSubmitting(true);
        try {
            const updates: Record<string, unknown> = {
                groupId: selectedGroupId,
                name: name.trim(),
                renewalDays,
                userIds: selectedUserIds,
            };
            if (notes.trim()) {
                updates.notes = notes.trim();
            } else {
                updates.notes = '';
            }

            const success = await updateCompetence(competenceId!, updates);
            if (success) {
                navigate('/competences?tab=competences');
            } else {
                setError('שגיאה בעדכון הכשירות. אנא נסה שוב.');
            }
        } catch (err) {
            console.error(err);
            setError('שגיאה לא צפויה.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!competenceId) return;
        const confirmed = await showConfirm('האם אתה בטוח שברצונך למחוק כשירות זו?', 'מחיקת כשירות');
        if (!confirmed) return;
        setIsDeleting(true);
        const success = await deleteCompetence(competenceId);
        setIsDeleting(false);
        if (success) {
            navigate('/competences?tab=competences');
        }
    };

    if (isLoading) return null;

    if (!competence) {
        return (
            <div className="add-competence-page">
                <HeaderNav title="עריכת כשירות" />
                <div className="container page-content" style={{ marginTop: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    כשירות לא נמצאה.
                </div>
            </div>
        );
    }

    return (
        <div className="add-competence-page">
            <HeaderNav title={`עריכת כשירות: ${competence.name}`} />

            <div className="container page-content" style={{ marginTop: '20px' }}>
                {error && <div className="error-message" style={{ marginBottom: '15px' }}>{error}</div>}

                <form onSubmit={handleSubmit} className="comp-card" style={{ padding: '20px' }}>

                    {/* Group Selector */}
                    <div className="form-group">
                        <label>קבוצה שייכת</label>
                        <CustomSelect
                            value={selectedGroupId}
                            onChange={(val) => handleGroupChange(val)}
                            className="group-selector"
                            options={userGroups.map(g => ({ value: g.id, label: g.name }))}
                            placeholder="-- בחר קבוצה --"
                        />
                    </div>

                    {/* Name */}
                    <div className="form-group">
                        <label>שם הכשירות</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="לדוגמה: נהיגה מבצעית, חובשים..."
                            style={{
                                width: '100%', padding: '12px',
                                background: 'var(--input-bg-color)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', color: 'white', fontSize: '1em'
                            }}
                            required
                        />
                    </div>

                    {/* Renewal Days */}
                    <div className="form-group">
                        <label>תדירות חידוש (בימים)</label>
                        <input
                            type="number"
                            min="1"
                            value={renewalDays}
                            onChange={e => setRenewalDays(parseInt(e.target.value) || 0)}
                            style={{
                                width: '100%', padding: '12px',
                                background: 'var(--input-bg-color)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', color: 'white', fontSize: '1em'
                            }}
                            required
                        />
                    </div>

                    {/* Notes */}
                    <div className="form-group">
                        <label>הערות / הנחיות (אופציונלי)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="פרטים נוספים על מה נדרש בכשירות זו..."
                            style={{
                                width: '100%', minHeight: '80px',
                                background: 'var(--input-bg-color)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', color: 'white', padding: '12px',
                                resize: 'vertical', fontSize: '0.95em'
                            }}
                        />
                    </div>

                    {/* Members */}
                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ margin: 0 }}>חברים רלוונטיים ({selectedUserIds.length} נבחרו)</label>
                            <div>
                                <button type="button" onClick={selectAll} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', fontSize: '0.8em', cursor: 'pointer', marginLeft: '10px' }}>בחר הכל</button>
                                <button type="button" onClick={deselectAll} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8em', cursor: 'pointer' }}>נקה הכל</button>
                            </div>
                        </div>

                        <div style={{
                            maxHeight: '200px', overflowY: 'auto',
                            background: 'rgba(0,0,0,0.2)', borderRadius: '8px',
                            padding: '10px', border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            {groupUsers.map(user => (
                                <div
                                    key={user!.uid}
                                    onClick={() => toggleUser(user!.uid)}
                                    style={{
                                        display: 'flex', alignItems: 'center', padding: '10px',
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

                    {/* Action Buttons */}
                    <div style={{ marginTop: '30px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/competences?tab=competences')}
                            style={{
                                background: 'rgba(255,255,255,0.05)', flex: 1,
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-secondary)', padding: '12px',
                                borderRadius: '10px', cursor: 'pointer', fontSize: '0.95em'
                            }}
                            disabled={isSubmitting || isDeleting}
                        >
                            ביטול
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || isDeleting}
                            style={{
                                flex: 2, padding: '12px',
                                background: 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
                                color: 'white', fontWeight: 'bold',
                                boxShadow: '0 4px 15px rgba(124, 77, 255, 0.3)',
                                border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '0.95em'
                            }}
                        >
                            {isSubmitting ? 'שומר...' : 'שמור שינויים'}
                        </button>
                    </div>

                    {/* Delete Button */}
                    <div style={{ marginTop: '16px' }}>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={isSubmitting || isDeleting}
                            style={{
                                width: '100%', padding: '12px',
                                background: 'rgba(255, 59, 48, 0.08)',
                                color: 'var(--status-red)',
                                border: '1px solid rgba(255, 59, 48, 0.25)',
                                borderRadius: '10px', cursor: 'pointer', fontSize: '0.9em'
                            }}
                        >
                            {isDeleting ? 'מוחק...' : 'מחק כשירות'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCompetencePage;
