// src/contexts/OfflineContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const LAST_SYNC_KEY = 'ordo_last_synced_at';

interface OfflineContextState {
    isOffline: boolean;
    lastSyncedAt: Date | null;
    updateLastSynced: () => void;
}

const OfflineContext = createContext<OfflineContextState | undefined>(undefined);

export function OfflineProvider({ children }: { children: ReactNode }) {
    const [isOffline, setIsOffline] = useState(!navigator.onLine);

    // Load the last synced timestamp from localStorage
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(() => {
        const stored = localStorage.getItem(LAST_SYNC_KEY);
        return stored ? new Date(stored) : null;
    });

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Called by DatabaseContext whenever a snapshot arrives (= we are online and data is fresh)
    const updateLastSynced = () => {
        const now = new Date();
        setLastSyncedAt(now);
        localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
    };

    return (
        <OfflineContext.Provider value={{ isOffline, lastSyncedAt, updateLastSynced }}>
            {children}
        </OfflineContext.Provider>
    );
}

export function useOffline() {
    const context = useContext(OfflineContext);
    if (context === undefined) {
        throw new Error('useOffline must be used within an OfflineProvider');
    }
    return context;
}
