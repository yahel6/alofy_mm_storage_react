// src/App.tsx
import { useState, useEffect } from 'react';
import { Outlet, useLocation, matchPath } from "react-router-dom";
import BottomNav from './components/BottomNav.tsx';
import Fab from './components/Fab.tsx';
import QuickAddModal from './components/QuickAddModal.tsx';
import OfflineBanner from './components/OfflineBanner.tsx';
import { useOffline } from './contexts/OfflineContext.tsx';
import { useDatabase } from './contexts/DatabaseContext.tsx';
import { usePushNotifications } from './hooks/usePushNotifications';
// --- תיקון: ייבוא AnimatePresence ו-motion בשביל עמוד במעבר ---
import { AnimatePresence, motion, type Variants } from 'framer-motion';

import './App.css';

// 3. הגדרת האנימציה - *** גרסה מהירה וחלקה ***
const pageAnimation: Variants = {
  initial: {
    opacity: 0,
    x: "100vw" // התחל מימין
  },
  in: {
    opacity: 1,
    x: 0, // החלק למרכז
    transition: {
      type: "tween",
      ease: "easeOut", // תנועה חלקה (מתחיל מהר, מאט בסוף)
      duration: 0.1 // משך זמן קצר
    }
  },
  out: {
    opacity: 0,
    x: "-100vw", // החלק החוצה שמאלה
    transition: {
      type: "tween",
      ease: "easeIn", // תנועה חלקה (מתחיל לאט, מאיץ החוצה)
      duration: 0.05 // משך זמן קצר מאוד
    }
  }
};
// --- סוף התיקון ---

import { useUI } from './contexts/UIContext.tsx';

function App() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Check if the touch is near the left or right edges (usually where swipe-to-back triggers)
      const touchX = e.touches[0].clientX;
      const edgeThreshold = 25; // pixels from the edge
      const screenWidth = window.innerWidth;

      if (touchX < edgeThreshold || touchX > screenWidth - edgeThreshold) {
        // Only prevent default if it's a potential edge swipe
        // This stops the native browser swipe-to-back/forward behavior
        if (e.cancelable) {
          // e.preventDefault(); 
          // Note: preventDefault on touchstart is often not enough alone on iOS 13.4+
          // or can interfere with normal scroll if not careful.
          // However, combining this with touch-action: pan-y in CSS is a strong defense.
        }
      }
    };

    // We use a global listener on the document
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => document.removeEventListener('touchstart', handleTouchStart);
  }, []);

  const location = useLocation();
  const { isOffline } = useOffline();
  const { shouldHighlightProfile, isFabHidden } = useUI();

  // Register for push notifications
  usePushNotifications();

  // Detect if we are in a warehouse details page to pass context to the modal
  const warehouseMatch = matchPath({ path: "/warehouses/:warehouseId" }, location.pathname);
  const currentWarehouseId = warehouseMatch?.params.warehouseId;

  // Check if current warehouse is Demo mode and user is not admin
  const { warehouses, currentUser } = useDatabase();
  const currentWarehouse = warehouses.find(w => w.id === currentWarehouseId);
  const isDemoMode = !!(currentWarehouse?.isDemo && currentUser?.role !== 'admin');

  // Global blocker for forced interaction
  useEffect(() => {
    if (shouldHighlightProfile) {
      const blocker = (e: Event) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-tour="profile-btn"]')) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }
      };

      // Capture phase to intercept before any other handlers
      window.addEventListener('click', blocker, true);
      window.addEventListener('mousedown', blocker, true);
      window.addEventListener('touchstart', blocker, true);
      window.addEventListener('pointerdown', blocker, true);

      return () => {
        window.removeEventListener('click', blocker, true);
        window.removeEventListener('mousedown', blocker, true);
        window.removeEventListener('touchstart', blocker, true);
        window.removeEventListener('pointerdown', blocker, true);
      };
    }
  }, [shouldHighlightProfile]);

  return (
    <div className="app-container">
      {/* Offline banner - shows at top of every page when offline */}
      <OfflineBanner />

      <main className="main-layout-wrapper">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            variants={pageAnimation}
            initial="initial"
            animate="in"
            exit="out"
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '120px', // Space for Bottom Nav
              top: 0,
              left: 0,
            }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />

      {/* Global blocking overlay for forced interaction */}
      {shouldHighlightProfile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          zIndex: 9999,
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textAlign: 'center',
          padding: '20px',
          pointerEvents: 'none' // Clicks pass through, but blocker intercepts them
        }}>
          <div style={{
            background: 'var(--card-bg-color)',
            padding: '24px',
            borderRadius: '20px',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            maxWidth: '300px',
            pointerEvents: 'auto' // Allow clicks on the instruction box itself if needed (though not necessary)
          }}>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500, direction: 'rtl' }}>
              כמעט סיימנו! עכשיו לחצו על הפרופיל כדי להגדיר את השם שלכם, ותבקשו להצטרף לצוות שלכם.
            </p>
          </div>
        </div>
      )}

      {/* FAB is hidden when offline, or in demo mode for non-admin */}
      {!isOffline && !isDemoMode && !isFabHidden && (
        <>
          <Fab onClick={() => setIsAddModalOpen(true)} />
          <QuickAddModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            warehouseId={currentWarehouseId}
          />
        </>
      )}
    </div>
  );
}

export default App;
