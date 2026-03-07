import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import { useOffline } from '../contexts/OfflineContext';
import HeaderNav from '../components/HeaderNav';
import CustomSelect from '../components/CustomSelect';
import LoadingScreen from '../components/LoadingScreen';
import { markCompetencePerformed } from '../firebaseCompetences';
import './CompetencesPage.css';

type SortTab = 'members' | 'competences' | 'my_competences';

const CompetencesPage: React.FC = () => {
    const { currentUser, groups, competences, competenceRecords, isLoading, users } = useDatabase();
    const { isOffline } = useOffline();

    // 1. Group Selection Logic
    const userGroups = useMemo(() => {
        if (!currentUser) return [];
        return groups.filter(g => g.members.includes(currentUser.uid));
    }, [groups, currentUser]);

    const defaultGroupId = currentUser?.dominantGroupId || (userGroups.length > 0 ? userGroups[0].id : '');
    const [selectedGroupId, setSelectedGroupId] = useState(defaultGroupId);

    const location = useLocation();

    // Parse tab from URL or default to 'members'
    const initialTab = useMemo(() => {
        const params = new URLSearchParams(location.search);
        const tabParam = params.get('tab');
        if (tabParam === 'my') return 'my_competences';
        if (tabParam === 'competences') return 'competences';
        return 'members';
    }, [location.search]);

    const [activeTab, setActiveTab] = useState<SortTab>(initialTab);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>({});
    const [fullViewData, setFullViewData] = useState<{ type: 'member' | 'competence', id: string, name: string } | null>(null);
    const navigate = useNavigate();

    // Update activeTab if URL changes
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const toggleNote = (compId: string) => {
        setExpandedNotes(prev => ({ ...prev, [compId]: !prev[compId] }));
    };

    // 2. Data Filtering
    const groupCompetences = useMemo(() => {
        return competences.filter(c => c.groupId === selectedGroupId);
    }, [competences, selectedGroupId]);

    const groupUsers = useMemo(() => {
        const group = groups.find(g => g.id === selectedGroupId);
        if (!group) return [];
        return users.filter(u => group.members.includes(u.uid));
    }, [groups, selectedGroupId, users]);

    // Helper: Calculate severity based on expiration date (negative = expired)
    const calculateDaysRemaining = (expirationStr: string) => {
        const diffTime = new Date(expirationStr).getTime() - new Date().getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    // Helper: Determine Status Info
    const getStatusInfo = (daysRem: number) => {
        if (daysRem < 0) return { label: 'פג תוקף', color: 'var(--status-red)' };
        if (daysRem <= 3) return { label: 'פג בקרוב', color: 'var(--status-orange)' };
        return { label: 'בתוקף', color: 'var(--status-green)' };
    };

    // Helper: Calculate Score (100 if valid, -5 per day if expired, min 0)
    const calculateScore = (daysRem: number) => {
        if (daysRem >= 0) return 100;
        const score = 100 + (daysRem * 5); // daysRem is negative
        return Math.max(0, score);
    };

    // --- SORT: BY MEMBERS ---
    const membersData = useMemo(() => {
        let filteredUsers = groupUsers;
        if (searchTerm) {
            filteredUsers = groupUsers.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return filteredUsers.map(user => {
            const userComps = groupCompetences.filter(c => c.userIds.includes(user.uid) || c.forAllMembers);
            let totalScore = 0;
            let expectedCount = userComps.length;

            if (expectedCount === 0) return { user, averageScore: 100, comps: [] };

            const userRecords = userComps.map(comp => {
                const record = competenceRecords.find(r => r.competenceId === comp.id && r.userId === user.uid);
                const daysRem = record ? calculateDaysRemaining(record.expirationDate) : -999;
                const score = calculateScore(daysRem);
                totalScore += score;
                return { competence: comp, record, daysRem, score };
            });

            return {
                user,
                averageScore: totalScore / expectedCount,
                comps: userRecords.sort((a, b) => a.daysRem - b.daysRem)
            };
        }).sort((a, b) => a.averageScore - b.averageScore);
    }, [groupUsers, groupCompetences, competenceRecords, searchTerm]);

    // --- SORT: BY COMPETENCES ---
    const competencesData = useMemo(() => {
        let filteredComps = groupCompetences;
        if (searchTerm) {
            filteredComps = groupCompetences.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return filteredComps.map(comp => {
            const relevantUserIds = comp.forAllMembers ? groupUsers.map(u => u.uid) : comp.userIds;
            if (relevantUserIds.length === 0) return { competence: comp, averageScore: 100, userStatuses: [] };

            let totalScore = 0;
            const records = relevantUserIds.map(uid => {
                const record = competenceRecords.find(r => r.competenceId === comp.id && r.userId === uid);
                const daysRem = record ? calculateDaysRemaining(record.expirationDate) : -999;
                const score = calculateScore(daysRem);
                totalScore += score;
                const userObj = users.find(u => u.uid === uid);
                return { uid, user: userObj, daysRem, score };
            });

            return {
                competence: comp,
                averageScore: totalScore / relevantUserIds.length,
                userStatuses: records.sort((a, b) => a.daysRem - b.daysRem)
            };
        }).sort((a, b) => a.averageScore - b.averageScore);
    }, [groupCompetences, competenceRecords, users, searchTerm]);

    // --- SORT: MY COMPETENCES ---
    const myCompetencesData = useMemo(() => {
        if (!currentUser) return [];
        let myComps = competences.filter(c =>
            c.userIds.includes(currentUser.uid) ||
            (c.forAllMembers && userGroups.some(g => g.id === c.groupId))
        );

        if (searchTerm) {
            myComps = myComps.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        return myComps.map(comp => {
            const record = competenceRecords.find(r => r.competenceId === comp.id && r.userId === currentUser.uid);
            const daysRem = record ? calculateDaysRemaining(record.expirationDate) : -999;
            return { competence: comp, record, daysRem };
        }).sort((a, b) => a.daysRem - b.daysRem);
    }, [competences, competenceRecords, currentUser, searchTerm]);

    const handlePerformMyCompetence = async (compId: string, groupId: string, renewalDays: number) => {
        if (!currentUser) return;
        await markCompetencePerformed(compId, currentUser.uid, groupId, renewalDays);
    };

    if (isLoading && competences.length === 0) {
        return <LoadingScreen message="טוען נתוני כשירות..." />;
    }

    const renderCompetenceItem = (compName: string, compId: string, status: { label: string, color: string }, showStatusPill: boolean = true, daysRem?: number) => {
        const competence = competences.find(c => c.id === compId);
        return (
            <div className="comp-list-item-v2" key={compId}>
                <div className="comp-info-main">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="comp-name">{compName}</span>
                        {competence?.notes && (
                            <button
                                className={`info-icon-btn-micro ${expandedNotes[compId] ? 'active' : ''}`}
                                onClick={(e) => { e.stopPropagation(); toggleNote(compId); }}
                            >תיאור</button>
                        )}
                    </div>
                    <div className="comp-status-inline">
                        {daysRem !== undefined && daysRem > -999 ? (
                            <span className="days-rem-text" style={{ color: status.color }}>
                                {daysRem < 0 ? 'פג תוקף' : `${daysRem} ימים`}
                            </span>
                        ) : (
                            showStatusPill && (
                                <span className="days-rem-text" style={{ color: status.color }}>
                                    {status.label}
                                </span>
                            )
                        )}
                    </div>
                </div>
                {expandedNotes[compId] && competence?.notes && (
                    <div className="comp-item-notes-dropdown" onClick={(e) => e.stopPropagation()}>
                        {competence.notes}
                    </div>
                )}
            </div>
        );
    };

    const renderScoreBadge = (score: number) => {
        let color = 'var(--status-green)';
        if (score < 90) color = 'var(--status-orange)';
        if (score < 50) color = 'var(--status-red)';

        return (
            <span className="average-badge" style={{ backgroundColor: color }}>
                {Math.floor(score)}
            </span>
        );
    };

    return (
        <div className={`competences-page ${fullViewData ? 'modal-active' : ''}`}>
            <HeaderNav title="ניהול כשירויות" />

            <div className="container page-content">
                {/* Tabs */}
                <div className="tabs-container">
                    <button
                        className={`tab-btn ${activeTab === 'members' ? 'active' : ''}`}
                        onClick={() => setActiveTab('members')}
                    >לפי משתמשים</button>
                    <button
                        className={`tab-btn ${activeTab === 'competences' ? 'active' : ''}`}
                        onClick={() => setActiveTab('competences')}
                    >לפי כשירויות</button>
                    <button
                        className={`tab-btn ${activeTab === 'my_competences' ? 'active' : ''}`}
                        onClick={() => {
                            setActiveTab('my_competences');
                        }}
                    >הכשירויות שלי</button>
                </div>

                {/* Search Bar */}
                <div className="search-container">
                    <input
                        type="search"
                        placeholder={activeTab === 'members' ? "חפש משתמש..." : "חפש כשירות..."}
                        className="search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="search-icon">🔍</span>
                </div>

                {/* Group Selector */}
                {userGroups.length > 0 && activeTab !== 'my_competences' && (
                    <div className="group-selector-container">
                        <CustomSelect
                            className="group-selector"
                            value={selectedGroupId}
                            onChange={setSelectedGroupId}
                            options={userGroups.map(g => ({ value: g.id, label: g.name }))}
                            placeholder="-- בחר קבוצה --"
                        />
                    </div>
                )}

                {/* Content: Members */}
                {activeTab === 'members' && (
                    <div className="list-container">
                        {membersData.map(({ user, comps, averageScore }) => (
                            <div
                                key={user.uid}
                                className="comp-card"
                                onClick={() => {
                                    setFullViewData({ type: 'member', id: user.uid, name: user.displayName });
                                }}
                            >
                                <div className="card-header-flex">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div className="user-avatar-small">{user.displayName.charAt(0)}</div>
                                        <h3 style={{ margin: 0 }}>{user.displayName}</h3>
                                    </div>
                                    {renderScoreBadge(averageScore)}
                                </div>
                                <div className="card-body">
                                    {comps.length === 0 ? <p className="empty-text">אין כשירויות מוגדרות</p> : (
                                        <div className="comp-compact-list">
                                            {comps.slice(0, 2).map(c => {
                                                const status = getStatusInfo(c.daysRem);
                                                return renderCompetenceItem(c.competence.name, c.competence.id, status, true, c.daysRem);
                                            })}
                                            {comps.length > 2 && (
                                                <div className="more-items-hint">+{comps.length - 2} נוספים...</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Content: Competences */}
                {activeTab === 'competences' && (
                    <div className="list-container">
                        {competencesData.map(({ competence, averageScore, userStatuses }) => (
                            <div
                                key={competence.id}
                                className="comp-card"
                                onClick={() => {
                                    setFullViewData({ type: 'competence', id: competence.id, name: competence.name });
                                }}
                            >
                                <div className="card-header-flex">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
                                        <h3 style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{competence.name}</h3>
                                        {competence.notes && (
                                            <button
                                                className={`info-icon-btn-micro ${expandedNotes[competence.id] ? 'active' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); toggleNote(competence.id); }}
                                            >תיאור</button>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                        {renderScoreBadge(averageScore)}
                                        {/* 3-dot edit button - hidden when offline */}
                                        {!isOffline && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/competences/edit/${competence.id}`);
                                                }}
                                                title="ערוך כשירות"
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    padding: '4px 6px',
                                                    borderRadius: '6px',
                                                    fontSize: '1.2rem',
                                                    lineHeight: 1,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'background 0.15s'
                                                }}
                                                onMouseOver={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                                                onMouseOut={e => (e.currentTarget.style.background = 'none')}
                                            >
                                                ⋮
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {expandedNotes[competence.id] && competence.notes && (
                                    <div className="comp-item-notes-dropdown" style={{ margin: '0 15px 15px 15px', display: 'block' }} onClick={e => e.stopPropagation()}>
                                        {competence.notes}
                                    </div>
                                )}

                                <div className="card-body">
                                    <div className="comp-card-scroll-area">
                                        {userStatuses.slice(0, 2).map(u => {
                                            const status = getStatusInfo(u.daysRem);
                                            return (
                                                <div key={u.uid} className="comp-list-item">
                                                    <span>{u.user?.displayName || 'Unknown'}</span>
                                                    <span className="status-label-minimal" style={{ color: status.color, fontWeight: 'bold' }}>
                                                        {u.daysRem < 0 ? 'פג תוקף' : (u.daysRem > -999 ? `${u.daysRem} ימים` : status.label)}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                        {userStatuses.length > 2 && (
                                            <div className="more-items-hint" style={{ textAlign: 'center', marginTop: '4px' }}>+{userStatuses.length - 2} משתמשים נוספים...</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Content: My Competences */}
                {activeTab === 'my_competences' && (
                    <div className="list-container">
                        {myCompetencesData.length === 0 && <p className="empty-text">אין כשירויות שמשויכות אליך כרגע.</p>}
                        {myCompetencesData.map(({ competence, daysRem }) => {
                            const status = getStatusInfo(daysRem);
                            const groupName = groups.find(g => g.id === competence.groupId)?.name || 'קבוצה לא ידועה';
                            return (
                                <div key={competence.id} className="comp-card my-comp-card" style={{ borderColor: status.color }}>
                                    <div className="my-comp-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h3>{competence.name}</h3>
                                            <span className="comp-duration-badge">{competence.renewalDays} ימים</span>
                                            {competence.notes && (
                                                <button
                                                    className={`info-icon-btn ${expandedNotes[competence.id] ? 'active' : ''}`}
                                                    onClick={() => toggleNote(competence.id)}
                                                >
                                                    תיאור
                                                </button>
                                            )}
                                        </div>
                                        <span className="comp-group-label">{groupName}</span>
                                    </div>
                                    <div className="my-comp-status">
                                        סטטוס: <span style={{ color: status.color, fontWeight: 'bold' }}>{status.label} {daysRem > -999 ? `(${daysRem} ימים נותרו)` : ''}</span>
                                    </div>

                                    {expandedNotes[competence.id] && competence.notes && (
                                        <div className="comp-item-notes-dropdown" style={{ marginBottom: '16px', display: 'block' }}>
                                            {competence.notes}
                                        </div>
                                    )}

                                    {/* סמן ביצוע - נסתר באופליין */}
                                    {!isOffline && (
                                        <button
                                            className="btn-perform"
                                            onClick={() => handlePerformMyCompetence(competence.id, competence.groupId, competence.renewalDays)}
                                            style={{ backgroundColor: status.color, boxShadow: `0 4px 12px ${status.color}40` }}
                                        >
                                            סמן ביצוע כשירות
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <div style={{ paddingBottom: '80px' }}></div>
            </div>

            {/* Modal Layer */}
            {fullViewData && (
                <div
                    className="comp-fullview-overlay"
                    onClick={(e) => {
                        // Only close if clicking the actual backdrop
                        if (e.target === e.currentTarget) {
                            setFullViewData(null);
                        }
                    }}
                >
                    <div className="comp-fullview-content">
                        <button className="modal-close-btn" onClick={() => setFullViewData(null)}>×</button>
                        <div className="modal-header">
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                <h2 style={{ margin: 0 }}>{fullViewData.name} - רשימה מלאה</h2>
                                {fullViewData.type === 'competence' && competences.find(c => c.id === fullViewData.id)?.notes && (
                                    <button
                                        className={`info-icon-btn ${expandedNotes[fullViewData.id] ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); toggleNote(fullViewData.id); }}
                                    >תיאור</button>
                                )}
                            </div>
                        </div>
                        {fullViewData.type === 'competence' && expandedNotes[fullViewData.id] && competences.find(c => c.id === fullViewData.id)?.notes && (
                            <div className="comp-item-notes-dropdown" style={{ margin: '0 15px 15px 15px', display: 'block' }}>
                                {competences.find(c => c.id === fullViewData.id)?.notes}
                            </div>
                        )}
                        <div className="modal-body">
                            {fullViewData.type === 'member' && (
                                <div className="list-container">
                                    {membersData.find(m => m.user.uid === fullViewData.id)?.comps.map(c => {
                                        const status = getStatusInfo(c.daysRem);
                                        return renderCompetenceItem(c.competence.name, c.competence.id, status, true, c.daysRem);
                                    })}
                                </div>
                            )}
                            {fullViewData.type === 'competence' && (
                                <div className="list-container">
                                    {competencesData.find(c => c.competence.id === fullViewData.id)?.userStatuses.map(u => {
                                        const status = getStatusInfo(u.daysRem);
                                        return (
                                            <div key={u.uid} className="comp-list-item">
                                                <span>{u.user?.displayName || 'Unknown'}</span>
                                                <span className="status-pill" style={{ backgroundColor: `${status.color}20`, color: status.color, border: `1px solid ${status.color}` }}>
                                                    {status.label} {u.daysRem > -999 ? `(${u.daysRem} ימים)` : ''}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div style={{ marginTop: '20px' }}>
                            <button className="btn-perform" style={{ background: 'var(--primary-color)' }} onClick={() => setFullViewData(null)}>חזרה לרשימה</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CompetencesPage;
