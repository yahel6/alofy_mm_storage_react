import React, { createContext, useContext, useState, type ReactNode } from 'react';

// Map of scopeId -> Set of verified item IDs
type ValidationSessions = Record<string, Set<string>>;

interface ValidationContextType {
    // Key is scopeId (warehouseId / activityId)
    sessions: ValidationSessions;

    // Active session tracking (optional, mainly for UI state if needed, but we check by existence)
    activeScopes: Set<string>;

    startSession: (scopeId: string) => void;
    stopSession: (scopeId: string) => void;
    verifyItem: (scopeId: string, itemId: string) => void;
    isSessionActive: (scopeId: string) => boolean;
    getSessionVerifiedItems: (scopeId: string) => Set<string>;
}

const ValidationContext = createContext<ValidationContextType | undefined>(undefined);

export const ValidationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [sessions, setSessions] = useState<ValidationSessions>({});
    const [activeScopes, setActiveScopes] = useState<Set<string>>(new Set());

    const startSession = (scopeId: string) => {
        setActiveScopes(prev => {
            const newSet = new Set(prev);
            newSet.add(scopeId);
            return newSet;
        });

        // Initialize session if not exists, or just ensure it's there. 
        // User asked: "All items should appear... unless verified IN CURRENT session".
        // This implies reseting the session when starting? 
        // User quote: "Every time I enter validation mode all items... should appear... unless verified in current validation mode".
        // User also said: "If I switch windows... I remain in mode... same items remain".
        // So:
        // 1. If session is effectively "new" (was not active), we should probably start fresh.
        // 2. If we just navigated away and came back, it is still active, so keep state.

        if (!sessions[scopeId]) {
            setSessions(prev => ({ ...prev, [scopeId]: new Set() }));
        }
    };

    const stopSession = (scopeId: string) => {
        // Remove from active scopes
        setActiveScopes(prev => {
            const newSet = new Set(prev);
            newSet.delete(scopeId);
            return newSet;
        });
        // Clear the data for this scope so next time it starts fresh
        setSessions(prev => {
            const newState = { ...prev };
            delete newState[scopeId];
            return newState;
        });
    };

    const verifyItem = (scopeId: string, itemId: string) => {
        setSessions(prev => {
            const currentSet = prev[scopeId] || new Set();
            const newSet = new Set(currentSet);
            newSet.add(itemId);
            return { ...prev, [scopeId]: newSet };
        });
    };

    const isSessionActive = (scopeId: string) => activeScopes.has(scopeId);

    const getSessionVerifiedItems = (scopeId: string) => {
        return sessions[scopeId] || new Set();
    };

    return (
        <ValidationContext.Provider value={{
            sessions,
            activeScopes,
            startSession,
            stopSession,
            verifyItem,
            isSessionActive,
            getSessionVerifiedItems
        }}>
            {children}
        </ValidationContext.Provider>
    );
};

export const useValidation = () => {
    const context = useContext(ValidationContext);
    if (context === undefined) {
        throw new Error('useValidation must be used within a ValidationProvider');
    }
    return context;
};
