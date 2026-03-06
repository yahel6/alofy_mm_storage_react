import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const UpdatePrompt: React.FC = () => {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r: ServiceWorkerRegistration | undefined) {
            console.log('SW Registered:', r);
            if (r) {
                // Check for updates every minute while the app is open
                setInterval(() => {
                    r.update();
                }, 1 * 60 * 1000);
            }
        },
        onRegisterError(error: any) {
            console.error('SW registration error', error);
        },
    });

    const close = () => {
        setNeedRefresh(false);
    };

    if (!needRefresh) return null;

    return (
        <div style={overlayStyle}>
            <div style={modalStyle}>
                <div style={iconContainerStyle}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="var(--accent-blue)" width="48px" height="48px">
                        <path d="M21 10.12h-6.78l2.74-2.82c-2.73-2.7-7.15-2.8-9.88-.1-2.73 2.71-2.73 7.08 0 9.79 2.73 2.71 7.15 2.71 9.88 0C18.32 15.65 19 14.08 19 12.1h2c0 1.98-.88 4.55-2.64 6.29-3.51 3.48-9.21 3.48-12.72 0-3.5-3.47-3.5-9.11 0-12.58s9.21-3.48 12.72 0L21 3v7.12zM12.5 8v4.25l3.5 2.08-.72 1.21L11 13V8h1.5z" />
                    </svg>
                </div>
                <h3 style={titleStyle}>גרסה חדשה זמינה!</h3>
                <p style={descriptionStyle}>
                    עדכנו את האפליקציה כדי ליהנות מהשיפורים והתיקונים האחרונים.
                </p>
                <div style={actionsStyle}>
                    <button style={updateButtonStyle} onClick={() => updateServiceWorker(true)}>
                        עדכן עכשיו
                    </button>
                    <button style={skipButtonStyle} onClick={close}>
                        אולי מאוחר יותר
                    </button>
                </div>
            </div>
        </div>
    );
};

const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20000, // Above everything
    direction: 'rtl',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
};

const modalStyle: React.CSSProperties = {
    backgroundColor: 'var(--card-bg-color)',
    padding: '32px 24px',
    borderRadius: '28px',
    width: '90%',
    maxWidth: '400px',
    textAlign: 'center',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    animation: 'appear 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
};

const iconContainerStyle: React.CSSProperties = {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'center',
};

const titleStyle: React.CSSProperties = {
    margin: '0 0 12px 0',
    fontSize: '1.6rem',
    fontWeight: 'bold',
    color: 'white',
};

const descriptionStyle: React.CSSProperties = {
    margin: '0 0 32px 0',
    fontSize: '1.1rem',
    color: 'var(--text-secondary)',
    lineHeight: '1.5',
};

const actionsStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
};

const updateButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    borderRadius: '16px',
    border: 'none',
    background: 'var(--accent-blue)',
    color: 'white',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 123, 255, 0.3)',
};

const skipButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '0.95rem',
    fontWeight: '500',
    cursor: 'pointer',
};

export default UpdatePrompt;
