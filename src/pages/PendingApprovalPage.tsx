import React from 'react';
import { motion } from 'framer-motion';
import { auth } from '../firebaseConfig';
import './LoginPage.css'; // Reuse diamond styles

const PendingApprovalPage: React.FC = () => {
    const user = auth.currentUser;

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            background: 'radial-gradient(circle at center, #1a1a2e 0%, #0f0f1a 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '24px',
            textAlign: 'center',
            overflow: 'hidden',
            position: 'fixed',
            top: 0,
            left: 0,
            zIndex: 9999
        }}>
            {/* Background ambient glow */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                style={{
                    position: 'absolute',
                    width: '500px',
                    height: '500px',
                    background: 'var(--action-color)',
                    filter: 'blur(100px)',
                    borderRadius: '50%',
                    zIndex: -1
                }}
            />

            {/* Hi-Tech Animated Diamond */}
            <div className="diamond-container" style={{ transform: 'scale(1.5)', marginBottom: '80px' }}>
                <motion.div
                    className="diamond"
                    animate={{
                        rotateY: [0, 360],
                        rotateX: [0, 10, 0, -10, 0],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                >
                    <div className="face f1"></div>
                    <div className="face f2"></div>
                    <div className="face f3"></div>
                    <div className="face f4"></div>
                    <div className="face f5"></div>
                    <div className="face f6"></div>
                    <div className="face f7"></div>
                    <div className="face f8"></div>
                    <div className="face f9"></div>
                    <div className="face f10"></div>
                    <div className="face f11"></div>
                    <div className="face f12"></div>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.8 }}
            >
                <h1 style={{
                    fontSize: '2.5rem',
                    marginBottom: '16px',
                    fontWeight: '800',
                    letterSpacing: '-0.5px',
                    background: 'linear-gradient(135deg, white 0%, var(--action-color) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>
                    שלום, {user?.displayName || 'משתמש'}
                </h1>

                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    padding: '24px',
                    borderRadius: '24px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(10px)',
                    maxWidth: '400px'
                }}>
                    <h2 style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--action-color)' }}>
                        החשבון ממתין לאישור
                    </h2>
                    <p style={{ color: '#aaa', lineHeight: '1.6', fontSize: '1rem' }}>
                        הצטרפת בהצלחה למערכת Ordo. כעת עליך להמתין לאישור גישה מהאדמין שלנו.
                    </p>
                    <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', fontSize: '0.9rem', color: '#888' }}>
                        {user?.email}
                    </div>
                </div>

                <motion.p
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{ marginTop: '40px', fontSize: '0.9rem', color: '#666', letterSpacing: '1px' }}
                >
                    PLEASE STAND BY · INITIALIZING ACCESS · ORDO ENGINE
                </motion.p>
            </motion.div>
        </div>
    );
};

export default PendingApprovalPage;
