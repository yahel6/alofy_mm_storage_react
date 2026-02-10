// src/App.tsx
import { useState } from 'react';
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from './components/BottomNav.tsx';
import Fab from './components/Fab.tsx';
import QuickAddModal from './components/QuickAddModal.tsx';
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

function App() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="app-container">
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
              WebkitOverflowScrolling: 'touch',
              paddingBottom: '120px', // Space for Bottom Nav
              top: 0,
              left: 0,
              overscrollBehavior: 'none'
            }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />

      <Fab onClick={() => setIsAddModalOpen(true)} />
      <QuickAddModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}

export default App;
