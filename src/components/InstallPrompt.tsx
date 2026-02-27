import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
            setIsStandalone(true);
        }

        // Check if iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // Listen for prompt (Android/Chrome)
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowInstructions(true);
            return;
        }

        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setDeferredPrompt(null);
            }
        } else {
            // Fallback for Android if beforeinstallprompt hasn't fired yet
            setShowInstructions(true);
        }
    };

    // Don't show if already installed
    if (isStandalone) return null;

    return (
        <div style={containerStyle}>
            <button
                onClick={handleInstallClick}
                className="install-trigger-link"
                style={linkButtonStyle}
            >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16px" height="16px">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                התקן את האפליקציה במסך הבית
            </button>

            {showInstructions && (
                <div style={modalStyle} onClick={() => setShowInstructions(false)}>
                    <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0, fontSize: '18px', color: 'var(--text-primary)' }}>
                            {isIOS ? 'התקנה ב-iPhone' : 'התקנה באנדרואיד'}
                        </h3>
                        {isIOS ? (
                            <>
                                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    1. לחץ על כפתור <strong>השיתוף</strong> (Share) בתחתית המסך.
                                </p>
                                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    2. גלול מטה ובחר <strong>"הוסף למסך הבית"</strong> (Add to Home Screen).
                                </p>
                            </>
                        ) : (
                            <>
                                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    1. לחץ על ה<strong>תפריט (3 נקודות)</strong> בפינת הדפדפן.
                                </p>
                                <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    2. בחר <strong>"התקן אפליקציה"</strong> או <strong>"הוסף למסך הבית"</strong>.
                                </p>
                            </>
                        )}
                        <button
                            onClick={() => setShowInstructions(false)}
                            style={closeButtonStyle}
                        >
                            הבנתי
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .install-trigger-link {
                    opacity: 0.8;
                    font-weight: 600;
                    letter-spacing: 0.3px;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 12px;
                    transition: all 0.3s ease;
                }
                .install-trigger-link:hover {
                    opacity: 1;
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-1px);
                }
            `}</style>
        </div>
    );
};

const containerStyle: React.CSSProperties = {
    padding: '40px 0 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
};

const linkButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '14px',
    cursor: 'pointer',
    padding: '12px 20px',
    fontFamily: 'inherit',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
};

const modalStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    direction: 'rtl'
};

const modalContentStyle: React.CSSProperties = {
    backgroundColor: '#1c1c1e',
    padding: '24px',
    borderRadius: '20px',
    width: '85%',
    maxWidth: '350px',
    textAlign: 'right',
    border: '1px solid #333'
};

const closeButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px',
    marginTop: '16px',
    borderRadius: '12px',
    border: 'none',
    background: 'var(--primary-color)',
    color: 'white',
    fontWeight: 'bold',
    cursor: 'pointer'
};

export default InstallPrompt;
