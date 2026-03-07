import { useMemo, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDatabase } from '../contexts/DatabaseContext';
import { useTour } from '@reactour/tour';
import { useUI } from '../contexts/UIContext';
import HeaderNav from '../components/HeaderNav';
import LoadingScreen from '../components/LoadingScreen';
import InstallPrompt from '../components/InstallPrompt';
import { approveLoan, approveLoanReturn } from '../firebaseUtils';
import type { EquipmentItem } from '../types';
import './HomePage.css';

const CompetencesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px">
    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
  </svg>
);

const formatActivityDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return `היום, ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (date.toDateString() === tomorrow.toDateString()) {
    return `מחר, ${date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`;
  }
  return date.toLocaleDateString('he-IL', { day: '2-digit', month: 'short', year: 'numeric' });
};

function HomePage() {
  const { currentUser, equipment, activities, competences, competenceRecords, isLoading, warehouses, groups } = useDatabase();
  const navigate = useNavigate();
  const { setIsOpen } = useTour();
  const [showLoansModal, setShowLoansModal] = useState(false);

  const { hasCompletedOnboarding } = useUI();

  useEffect(() => {
    if (currentUser && !hasCompletedOnboarding && !isLoading) {
      const storageKey = `ordo_onboarding_shown_${currentUser.uid}`;
      const hasShown = localStorage.getItem(storageKey);

      if (!hasShown) {
        console.log("HomePage: Triggering tour start for new user...");
        // Small delay to ensure DOM is fully ready and stable
        const timer = setTimeout(() => {
          console.log("HomePage: Calling setIsOpen(true)");
          setIsOpen(true);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser, setIsOpen, hasCompletedOnboarding, isLoading]);

  const attentionItems = useMemo(() => {
    const today = new Date();
    const userGroups = currentUser?.groupIds || [];
    let broken = 0;
    let repair = 0;
    let needsValidation = 0;
    let loanAlerts = 0;

    equipment.forEach(item => {
      // Filter by group: user must be in the group of the warehouse this item belongs to
      const warehouse = warehouses.find(w => w.id === item.warehouseId);
      if (!warehouse || (!warehouse.isDemo && !userGroups.includes(warehouse.groupId || ''))) {
        return;
      }

      if (item.loanInfo) {
        const isIncoming = item.loanInfo.status === 'pending_borrow' && userGroups.includes(item.loanInfo.targetGroupId);
        const isReturning = item.loanInfo.status === 'pending_return' && userGroups.includes(item.loanInfo.originGroupId);
        if (isIncoming || isReturning) loanAlerts++;
      }
      if (item.status === 'broken') broken++;
      if (item.status === 'repair') repair++;

      const validateThreshold = new Date(today);
      validateThreshold.setDate(validateThreshold.getDate() - (item.validationDays ?? 7));

      if (new Date(item.lastCheckDate) < validateThreshold &&
        item.status === 'available' &&
        item.managerUserId === currentUser?.uid) {
        needsValidation++;
      }
    });

    let competencesAlerts = 0;
    if (currentUser) {
      const userCompetences = competences.filter(c =>
        (c.userIds.includes(currentUser.uid) || c.forAllMembers) &&
        userGroups.includes(c.groupId)
      );

      userCompetences.forEach(comp => {
        const record = competenceRecords.find(r => r.competenceId === comp.id && r.userId === currentUser.uid);
        if (!record) {
          competencesAlerts++;
        } else {
          const expDate = new Date(record.expirationDate);
          const daysLeft = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
          if (daysLeft <= 3) competencesAlerts++;
        }
      });
    }

    return [
      { id: 'competences', text: 'כשירויות', icon: <CompetencesIcon />, iconClass: 'icon-green', count: competencesAlerts, path: '/competences?tab=my', showBadge: competencesAlerts > 0 },
      { id: 'validate', text: 'פריטים דורשי ווידוא', icon: '🗓️', iconClass: 'icon-orange', count: needsValidation, path: '/items/filter/validate' },
      { id: 'broken', text: 'פריטים לא כשירים', icon: '!', iconClass: 'icon-red', count: broken, path: '/items/filter/broken' },
      { id: 'repair', text: 'פריטים בתיקון', icon: '🔧', iconClass: 'icon-orange', count: repair, path: '/items/filter/repair' },
      { id: 'loans_active', text: 'מרכז השאלות', icon: '📦', iconClass: 'icon-blue', count: loanAlerts, path: '#loans', showBadge: loanAlerts > 0 }
    ];
  }, [equipment, competences, competenceRecords, currentUser, warehouses]);

  const { pendingIncoming, pendingReturns, lentOut, borrowedIn } = useMemo(() => {
    const userGroups = currentUser?.groupIds || [];
    return {
      pendingIncoming: equipment.filter(e => e.loanInfo?.status === 'pending_borrow' && userGroups.includes(e.loanInfo.targetGroupId)),
      pendingReturns: equipment.filter(e => e.loanInfo?.status === 'pending_return' && userGroups.includes(e.loanInfo.originGroupId)),
      lentOut: equipment.filter(e => e.loanInfo?.status === 'active' && userGroups.includes(e.loanInfo.originGroupId)),
      borrowedIn: equipment.filter(e => e.loanInfo?.status === 'active' && userGroups.includes(e.loanInfo.targetGroupId))
    };
  }, [equipment, currentUser]);

  const handleApproveLoan = async (item: EquipmentItem) => {
    if (!item.loanInfo) return;
    await approveLoan([item.id], item.loanInfo.targetWarehouseId);
  };

  const handleConfirmReturn = async (item: EquipmentItem) => {
    await approveLoanReturn([item]);
  };

  const upcomingActivities = useMemo(() => {
    const today = new Date();
    const userGroups = currentUser?.groupIds || [];
    today.setHours(0, 0, 0, 0);
    return activities
      .filter(act => new Date(act.date) >= today && userGroups.includes(act.groupId || ''))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [activities, currentUser]);

  const handleAttentionClick = (path: string) => {
    if (path === '#loans') {
      setShowLoansModal(true);
      return;
    }
    navigate(path);
  };

  if (isLoading && equipment.length === 0) {
    return <LoadingScreen message="טוען מערכת Ordo..." />;
  }

  return (
    <div>
      <HeaderNav title="Ordo" showBranding={true} />
      <div className="container">
        <div className="welcome-section">
          <h1 className="welcome-text">שלום, {currentUser?.displayName || '...'} 👋</h1>
          <p className="welcome-subtitle">הנה מה שקורה היום במחסן</p>
        </div>

        <div className="dashboard-card" id="attention-card">
          <div className="card-header">
            <h2 className="card-title">דורש טיפול</h2>
          </div>
          <div className="card-content">
            {attentionItems.map(item => (
              <div
                key={item.id}
                className="attention-item"
                onClick={() => handleAttentionClick(item.path)}
                data-tour={item.id === 'validate' ? 'validate-alert' : item.id === 'competences' ? 'competences-alert' : undefined}
              >
                <div className="attention-details">
                  <span className={`attention-icon ${item.iconClass}`}>
                    {item.icon}
                  </span>
                  <span className="attention-text">{item.text}</span>
                </div>
                <div className="attention-count" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.showBadge && <span className="alert-badge">!</span>}
                  {item.count}
                  <span className="chevron">&#9664;</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card" id="upcoming-card">
          <div className="card-header">
            <h2 className="card-title">פעילויות קרובות</h2>
          </div>
          <div className="card-content">
            {upcomingActivities.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0' }}>
                אין פעילויות קרובות.
              </p>
            ) : (
              upcomingActivities.map(activity => {
                const total = activity.equipmentRequiredIds.length + activity.equipmentMissingIds.length;
                const available = activity.equipmentRequiredIds.length;
                const hasGaps = available < total;

                return (
                  <Link
                    to={`/activities/${activity.id}`}
                    key={activity.id}
                    className="activity-list-item"
                  >
                    <div className="activity-details">
                      <span className="activity-title">{activity.name}</span>
                      <span className="activity-time">{formatActivityDate(activity.date)}</span>
                    </div>
                    <div className={`activity-status ${hasGaps ? 'status-gaps' : 'status-ready'}`}>
                      {hasGaps ? (
                        <div>
                          <span><span>&times;</span> פערים קיימים</span>
                          <span className="status-subtitle">חסרים {total - available} פריטים</span>
                        </div>
                      ) : (
                        <span><span>&#10003;</span> מוכן ליציאה</span>
                      )}
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        <AnimatePresence>
          {showLoansModal && (
            <motion.div
              className="modal-overlay active"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLoansModal(false)}
            >
              <motion.div
                className="modal-container-tech"
                initial={{ scale: 0.9, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 30 }}
                onClick={e => e.stopPropagation()}
              >
                <div className="modal-header-tech">
                  <div className="header-icon-hex">
                    <span className="icon-pulse">📦</span>
                  </div>
                  <div className="header-text-group">
                    <h3 className="modal-title-tech">מרכז השאלות</h3>
                    <p className="modal-subtitle-tech">ניהול וניטור ציוד בין קבוצות</p>
                  </div>
                </div>

                <div className="loan-dashboard-content-scroll">
                  {pendingIncoming.length > 0 && (
                    <div className="loan-grid-section">
                      <h4 className="section-label incoming">
                        <span className="dot"></span>
                        חבילות שהגיעו (לאישור קבלה)
                      </h4>
                      <div className="loan-cards-stack">
                        {pendingIncoming.map(item => (
                          <div key={item.id} className="loan-tech-card">
                            <div className="card-top">
                              <span className="item-name-tech">{item.name}</span>
                              <span className="source-label">נשלח מ: {warehouses.find(w => w.id === item.loanInfo?.originWarehouseId)?.name || '...'}</span>
                            </div>
                            <div className="card-bottom">
                              <span className="group-info">קבוצה: {groups.find(g => g.id === item.loanInfo?.originGroupId)?.name || '...'}</span>
                              <button className="btn-tech approve" onClick={() => handleApproveLoan(item)}>אשר קבלה</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pendingReturns.length > 0 && (
                    <div className="loan-grid-section">
                      <h4 className="section-label return">
                        <span className="dot"></span>
                        ציוד חזרה (לאישור פיזי)
                      </h4>
                      <div className="loan-cards-stack">
                        {pendingReturns.map(item => (
                          <div key={item.id} className="loan-tech-card">
                            <div className="card-top">
                              <span className="item-name-tech">{item.name}</span>
                              <span className="source-label">הוחזר מ: {warehouses.find(w => w.id === item.loanInfo?.targetWarehouseId)?.name || '...'}</span>
                            </div>
                            <div className="card-bottom">
                              <span className="group-info">קבוצה: {groups.find(g => g.id === item.loanInfo?.targetGroupId)?.name || '...'}</span>
                              <button className="btn-tech confirm" onClick={() => handleConfirmReturn(item)}>אשר קבלת ציוד</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="loan-summary-row">
                    <div className="summary-section">
                      <h5 className="summary-header">📤 פריטים שהשאלנו</h5>
                      <div className="summary-list">
                        {lentOut.length === 0 ? <p className="empty-state-text">אין פריטים מושאלים</p> : (lentOut as EquipmentItem[]).map(item => (
                          <div key={item.id} className="summary-item">
                            <span className="indicator lent"></span>
                            <span className="name">{item.name}</span>
                            <span className="arrow">←</span>
                            <span className="target">{groups.find(g => g.id === item.loanInfo?.targetGroupId)?.name || '...'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="summary-section">
                      <h5 className="summary-header">📥 פריטים בשימושנו</h5>
                      <div className="summary-list">
                        {borrowedIn.length === 0 ? <p className="empty-state-text">אין פריטים שאולים</p> : (borrowedIn as EquipmentItem[]).map(item => (
                          <div key={item.id} className="summary-item">
                            <span className="indicator borrowed"></span>
                            <span className="name">{item.name}</span>
                            <span className="arrow">←</span>
                            <span className="target">{groups.find(g => g.id === item.loanInfo?.originGroupId)?.name || '...'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer-tech">
                  <button className="btn-tech-close" onClick={() => setShowLoansModal(false)}>סגור מרכז בקרה</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <InstallPrompt />
      </div>
    </div>
  );
}

export default HomePage;