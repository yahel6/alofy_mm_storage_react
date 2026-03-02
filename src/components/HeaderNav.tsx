// src/components/HeaderNav.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from '../contexts/DatabaseContext';
import './HeaderNav.css';

const OptionsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
  </svg>
);

interface HeaderNavProps {
  title: string;
  onOptionsMenuClick?: () => void;
  onBack?: () => void;
  showBranding?: boolean;
}

const HeaderNav: React.FC<HeaderNavProps> = ({ title, onOptionsMenuClick, onBack, showBranding }) => {
  const navigate = useNavigate();
  const { currentUser, supportChats } = useDatabase();

  const hasUnreadSupport = React.useMemo(() => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') {
      return supportChats.some(chat => chat.hasUnreadAdmin);
    } else {
      const myChat = supportChats.find(c => c.id === currentUser.uid);
      return !!myChat?.hasUnreadUser;
    }
  }, [currentUser, supportChats]);


  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="header-nav">
      {!showBranding && (
        <span className="back-button" onClick={handleBack}>
          &larr; חזור
        </span>
      )}

      <div className={`header-title-container ${showBranding ? 'branding-mode' : ''}`}>
        {showBranding ? (
          <>
            <img src="/ordo-logo.png" alt="Ordo" className="header-logo" />
            <h1 className="header-branding-title">Ordo</h1>
          </>
        ) : (
          <h2 className="header-title">{title}</h2>
        )}
      </div>

      <div className="header-left-actions" style={{ position: 'absolute', left: '16px', display: 'flex', gap: '8px', alignItems: 'center', zIndex: 10 }}>
        {onOptionsMenuClick && (
          <div className="header-icon-btn" onClick={onOptionsMenuClick}>
            <OptionsIcon />
          </div>
        )}

        <div className="header-icon-btn" onClick={() => navigate('/profile')} title="פרופיל אישי" style={{ flexDirection: 'column', gap: '2px', position: 'relative' }} data-tour="profile-btn">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24px" height="24px">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
          <span style={{ fontSize: '10px', fontWeight: 500 }}>פרופיל</span>
          {hasUnreadSupport && (
            <div style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              background: 'var(--status-red)',
              color: 'white',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              border: '2px solid var(--card-bg-color)'
            }}>!</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderNav;