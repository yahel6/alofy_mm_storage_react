import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { createGroupDetailed } from '../firebaseUtils';
import HeaderNav from '../components/HeaderNav';
import '../components/Form.css';

const GroupFormPage: React.FC = () => {
    const navigate = useNavigate();
    const { users, warehouses, activities, currentUser, isLoading } = useDatabase();

    const [name, setName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
    const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (isLoading || !currentUser) return <div className="loading-screen">טוען...</div>;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('נא להזין שם לקבוצה');
            return;
        }

        setIsSubmitting(true);
        const groupId = await createGroupDetailed(
            name,
            currentUser.uid,
            selectedMembers,
            selectedWarehouses,
            selectedActivities
        );

        if (groupId) {
            navigate('/groups');
        } else {
            alert('שגיאה ביצירת הקבוצה. נא לנסות שוב.');
        }
        setIsSubmitting(false);
    };

    const toggleSelection = (id: string, list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>) => {
        if (list.includes(id)) {
            setList(list.filter(item => item !== id));
        } else {
            setList([...list, id]);
        }
    };

    // Filter out users who are already in the list or the current user
    const availableUsers = users.filter(u => u.uid !== currentUser.uid);
    // Only show warehouses/activities that aren't already grouped (or let user take them?)
    // For now, allow taking any (batch update will overwrite)

    return (
        <div className="page-container" style={{ direction: 'rtl' }}>
            <HeaderNav title="יצירת קבוצה חדשה" />

            <div className="container page-content" style={{ paddingBottom: '120px' }}>
                <form onSubmit={handleSubmit} className="form-card">
                    <div className="form-group">
                        <label>שם הקבוצה</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="הזן שם לקבוצה..."
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>חברי קבוצה ({selectedMembers.length} נבחרו)</label>
                        <div className="selection-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            padding: '8px',
                            background: '#222',
                            borderRadius: '8px',
                            border: '1px solid #444'
                        }}>
                            {availableUsers.map(user => (
                                <div
                                    key={user.uid}
                                    onClick={() => toggleSelection(user.uid, selectedMembers, setSelectedMembers)}
                                    style={{
                                        padding: '8px',
                                        background: selectedMembers.includes(user.uid) ? 'var(--action-color)' : '#333',
                                        color: selectedMembers.includes(user.uid) ? 'white' : 'var(--text-primary)',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {user.displayName || user.email}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>מחסנים ({selectedWarehouses.length} נבחרו)</label>
                        <div className="selection-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            maxHeight: '150px',
                            overflowY: 'auto',
                            padding: '8px',
                            background: '#222',
                            borderRadius: '8px',
                            border: '1px solid #444'
                        }}>
                            {warehouses.map(w => (
                                <div
                                    key={w.id}
                                    onClick={() => toggleSelection(w.id, selectedWarehouses, setSelectedWarehouses)}
                                    style={{
                                        padding: '8px',
                                        background: selectedWarehouses.includes(w.id) ? 'var(--action-color)' : '#333',
                                        color: selectedWarehouses.includes(w.id) ? 'white' : 'var(--text-primary)',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {w.name} {w.groupId ? '(משויך)' : ''}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>פעילויות ({selectedActivities.length} נבחרו)</label>
                        <div className="selection-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '8px',
                            maxHeight: '150px',
                            overflowY: 'auto',
                            padding: '8px',
                            background: '#222',
                            borderRadius: '8px',
                            border: '1px solid #444'
                        }}>
                            {activities.map(a => (
                                <div
                                    key={a.id}
                                    onClick={() => toggleSelection(a.id, selectedActivities, setSelectedActivities)}
                                    style={{
                                        padding: '8px',
                                        background: selectedActivities.includes(a.id) ? 'var(--action-color)' : '#333',
                                        color: selectedActivities.includes(a.id) ? 'white' : 'var(--text-primary)',
                                        borderRadius: '6px',
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        textAlign: 'center',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {a.name} {a.groupId ? '(משויך)' : ''}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: '32px', display: 'flex', gap: '12px' }}>
                        <button
                            type="button"
                            className="btn-secondary"
                            style={{ margin: 0, flex: 1 }}
                            onClick={() => navigate('/groups')}
                        >
                            ביטול
                        </button>
                        <button
                            type="submit"
                            className="btn-submit"
                            style={{ margin: 0, flex: 1 }}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'יוצר...' : 'צור קבוצה'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GroupFormPage;
